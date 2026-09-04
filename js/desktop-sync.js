// ============================================
// LOTO GAMES - SINCRONIZACIÓN OFFLINE-FIRST
// Local es la fuente de trabajo. La nube exige una sesión Supabase Auth
// cuyo correo corresponda a un administrador activo de Loto Games.
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  if (!desktop?.isDesktop) return;

  const TABLES = {
    productos: 'productos',
    ventas: 'ventas',
    clientes: 'clientes',
    usuarios: 'usuarios',
    servicios: 'servicios_tecnicos',
    traspasos: 'traspasos',
    cuentas_plaza_movimientos: 'cuentas_plaza_movimientos',
    movimientos_inventario: 'movimientos_inventario'
  };

  const ALLOWED = {
    productos: ['id','nombre','sku','codigo_barras','categoria','tipo','precio','stock','created_at','local','precio_cliente','precio_mayorista','precio_plaza','precio_base_cliente','precio_base_mayorista','precio_base_plaza','precio_markup_5_aplicado'],
    ventas: ['id','items','subtotal','iva','total','metodo_pago','comentario','fecha','usuario','descuento_aplicado','cliente_id','cliente_nombre','tipo_precio','es_credito_plaza','descuento_porcentaje','descuento_monto'],
    clientes: ['id','nombre','email','telefono','direccion','created_at','tipo_cliente','credito_habilitado','notas'],
    // Nunca descargar ni subir password/pin heredados en texto plano.
    usuarios: ['id','nombre','email','rol','estado','privilegios','created_at','password_hash','password_salt','pin_hash','pin_salt'],
    servicios: ['id','cliente_id','equipo','problema','diagnostico','precio','estado','garantia_dias','created_at','cliente_nombre','tecnico_asignado','entregado_por'],
    traspasos: ['id','producto_id','producto_nombre','tipo','cantidad','motivo','usuario','fecha','created_at','local_origen','local_destino','locatario_nombre','locatario_telefono','monto','estado_pago','fecha_pago','producto_sku','origen','destino','estado'],
    cuentas_plaza_movimientos: ['id','cliente_id','cliente_nombre','tipo','monto','items','venta_id','nota','usuario','fecha','created_at'],
    movimientos_inventario: ['id','producto_id','producto_nombre','tipo','cantidad','stock_anterior','stock_nuevo','motivo','usuario','fecha']
  };

  const aliases = {
    codigoBarras: 'codigo_barras',
    createdAt: 'created_at',
    metodoPago: 'metodo_pago',
    descuentoAplicado: 'descuento_aplicado',
    descuentoPorcentaje: 'descuento_porcentaje',
    descuentoMonto: 'descuento_monto',
    clienteId: 'cliente_id',
    clienteNombre: 'cliente_nombre',
    tipoPrecio: 'tipo_precio',
    esCreditoPlaza: 'es_credito_plaza'
  };

  const PAGE_SIZE = 1000;
  const MAX_PUSH_BATCHES = 100;
  let currentSync = null;
  let timer = null;

  function normalize(entity, record) {
    const source = { ...record };
    for (const [from, to] of Object.entries(aliases)) {
      if (source[from] !== undefined && source[to] === undefined) source[to] = source[from];
    }
    const output = {};
    for (const key of ALLOWED[entity] || []) {
      if (source[key] !== undefined) output[key] = source[key];
    }
    return output;
  }

  function setStatus(type, text, detail = '') {
    const className = {
      ok: 'db-status-ok',
      error: 'db-status-error',
      local: 'db-status-demo',
      checking: 'db-status-checking'
    }[type] || 'db-status-checking';

    for (const id of ['dbStatusSidebar', 'dbStatusTop']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.className = `db-status ${className}`;
      el.innerHTML = `<span class="db-dot"></span><span>${text}</span>`;
      el.title = detail;
    }
  }

  async function fetchWholeTable(client, entity) {
    const table = TABLES[entity];
    const columns = (ALLOWED[entity] || []).join(',');
    const rows = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await client
        .from(table)
        .select(columns)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      const page = data || [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    return rows;
  }

  async function authorizeCloud(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const email = String(data?.session?.user?.email || '').trim().toLowerCase();
    if (!email) throw new Error('Nube no vinculada: inicia sesión de sincronización.');

    const users = await fetchWholeTable(client, 'usuarios');
    const current = users.find(user =>
      String(user.email || '').trim().toLowerCase() === email &&
      (user.estado || 'activo') === 'activo' &&
      String(user.rol || '').trim().toLowerCase() === 'admin'
    );
    if (!current) {
      throw new Error('La sincronización requiere una cuenta administradora activa de Loto Games.');
    }

    return { email, current, users };
  }

  async function pushPending(client) {
    let pushed = 0;

    for (let batch = 0; batch < MAX_PUSH_BATCHES; batch += 1) {
      const jobs = await desktop.sync.pending(100);
      if (!jobs.length) return pushed;

      for (const job of jobs) {
        const table = TABLES[job.entity];
        if (!table) {
          await desktop.sync.fail(job.id, `Entidad no permitida: ${job.entity}`);
          throw new Error(`Entidad no permitida en cola: ${job.entity}`);
        }

        try {
          if (job.operation === 'delete') {
            const { error } = await client.from(table).delete().eq('id', job.record_id);
            if (error) throw error;
          } else {
            const raw = JSON.parse(job.payload || '{}');
            const payload = normalize(job.entity, raw);
            if (payload.id === undefined || payload.id === null) {
              const numericId = Number(job.record_id);
              payload.id = Number.isSafeInteger(numericId) ? numericId : job.record_id;
            }
            const { error } = await client.from(table).upsert(payload, { onConflict: 'id' });
            if (error) throw error;
          }

          await desktop.sync.complete(job.id);
          pushed += 1;
        } catch (error) {
          await desktop.sync.fail(job.id, error?.message || String(error));
          throw error;
        }
      }
    }

    throw new Error('La cola de sincronización excedió el límite de seguridad por ciclo');
  }

  async function pullCloudSnapshot(client, authorizedUsers = null) {
    const storage = window.LotoDesktopStorage;
    if (!storage?.applyRemoteCollection) {
      throw new Error('Persistencia local no permite aplicar snapshot remoto');
    }

    const authorization = authorizedUsers
      ? { users: authorizedUsers }
      : await authorizeCloud(client);

    // Descarga todas las colecciones antes de modificar el estado local para evitar
    // una restauración parcial si una tabla remota falla a mitad del proceso.
    const snapshots = { usuarios: authorization.users };
    for (const entity of Object.keys(TABLES)) {
      if (entity === 'usuarios') continue;
      snapshots[entity] = await fetchWholeTable(client, entity);
    }

    let changedCollections = 0;
    for (const entity of Object.keys(TABLES)) {
      if (storage.applyRemoteCollection(entity, snapshots[entity] || [])) changedCollections += 1;
    }

    if (changedCollections > 0) {
      window.dispatchEvent(new CustomEvent('loto:cloud-data-updated', {
        detail: { changedCollections, at: new Date().toISOString() }
      }));
    }

    return changedCollections;
  }

  async function performSync() {
    const client = window.cloudSupabase;
    if (!client || !navigator.onLine) {
      setStatus('local', 'Local · sin conexión');
      return { ok: true, localOnly: true };
    }

    try {
      setStatus('checking', 'Verificando nube…');
      const authorization = await authorizeCloud(client);

      const initialPending = await desktop.sync.pending(1);
      if (initialPending.length) setStatus('checking', 'Sincronizando cambios…');
      const pushed = await pushPending(client);

      // Nunca hacemos pull si quedó algo pendiente: así evitamos sobrescribir una
      // modificación local que todavía no alcanzó Supabase.
      const remaining = await desktop.sync.pending(1);
      if (remaining.length) {
        setStatus('local', 'Local · cambios pendientes');
        return { ok: false, pushed, pending: true };
      }

      const pulled = await pullCloudSnapshot(client, authorization.users);
      setStatus('ok', 'Local + nube · sincronizado');
      return { ok: true, pushed, pulled, cloudUser: authorization.current };
    } catch (error) {
      console.warn('Sincronización pendiente:', error);
      const message = error?.message || String(error);
      const unlinked = /no vinculada|administradora activa|jwt|auth|permission|policy|rls|row-level|not authorized|unauthorized/i.test(message);
      setStatus('local', unlinked ? 'Local · nube sin autorizar' : 'Local · cambios pendientes', message);
      return { ok: false, error: message };
    }
  }

  function syncOnce() {
    // Si login, reconexión e intervalo disparan sync al mismo tiempo, todos esperan
    // exactamente la misma ejecución. Así el bootstrap nunca falla por un "skip"
    // producido por su propia sesión de Auth.
    if (currentSync) return currentSync;
    currentSync = performSync().finally(() => {
      currentSync = null;
    });
    return currentSync;
  }

  function start() {
    if (timer) return;
    window.addEventListener('online', syncOnce);
    window.addEventListener('offline', () => setStatus('local', 'Local · sin conexión'));
    timer = setInterval(syncOnce, 30000);
    setTimeout(syncOnce, 1200);
  }

  window.LotoSync = { syncOnce, start, authorizeCloud, pullCloudSnapshot };
  start();
})();
