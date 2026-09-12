// ============================================
// LOTO GAMES - SINCRONIZACIÓN OFFLINE-FIRST
// Local es la fuente de trabajo. La nube exige una sesión Supabase Auth
// cuyo correo corresponda a un administrador activo de Loto Games.
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  if (!desktop?.isDesktop) return;

  const AUDIT_ENTITY = 'auditoria_modificaciones';
  const TABLES = {
    productos: 'productos',
    ventas: 'ventas',
    clientes: 'clientes',
    usuarios: 'usuarios',
    servicios: 'servicios_tecnicos',
    traspasos: 'traspasos',
    cuentas_plaza_movimientos: 'cuentas_plaza_movimientos',
    movimientos_inventario: 'movimientos_inventario',
    auditoria_modificaciones: 'auditoria_modificaciones'
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
    movimientos_inventario: ['id','producto_id','producto_nombre','tipo','cantidad','stock_anterior','stock_nuevo','motivo','usuario','fecha'],
    auditoria_modificaciones: ['id','entidad','registro_id','accion','usuario_id','usuario_nombre','usuario_email','usuario_rol','fecha','cambios','created_at']
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
  const RECENT_EDIT_MS = 6000;
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

  function hasLocalUsers() {
    try {
      return (window.LotoDesktopStorage?.getCollection?.('usuarios') || []).length > 0;
    } catch (_) {
      return false;
    }
  }

  function isEditableElement(element) {
    if (!element) return false;
    const tag = String(element.tagName || '').toLowerCase();
    return ['input', 'textarea', 'select'].includes(tag) || !!element.isContentEditable;
  }

  function isVisible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.pointerEvents !== 'none';
  }

  // Un pull reemplaza snapshots locales completos. No lo hacemos mientras una
  // persona está capturando datos: primero subimos cambios pendientes y dejamos
  // la descarga para el siguiente ciclo. La primera vinculación queda excluida.
  function shouldDeferPull() {
    if (!hasLocalUsers()) return false;

    const openModal = Array.from(document.querySelectorAll('.modal')).some(isVisible);
    const cloudOverlay = isVisible(document.getElementById('cloudPairOverlay'));
    const active = document.activeElement;
    const recentInteraction = (Date.now() - Number(window.__lotoLastInteractionAt || 0)) < RECENT_EDIT_MS;
    const activeEditing = isEditableElement(active) && recentInteraction;

    return openModal || cloudOverlay || activeEditing;
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
          if (job.entity === AUDIT_ENTITY) {
            if (job.operation === 'delete') {
              throw new Error('La auditoría es append-only y no admite eliminaciones');
            }
            const raw = JSON.parse(job.payload || '{}');
            const payload = normalize(job.entity, raw);
            if (!payload.id) payload.id = String(job.record_id);
            const { error } = await client.from(table).insert(payload);
            // Si el servidor sí recibió el insert pero la respuesta se perdió, el
            // reintento puede encontrar la misma PK. Eso cuenta como éxito idempotente.
            if (error && error.code !== '23505') throw error;
          } else if (job.operation === 'delete') {
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

    const startedAt = performance.now();
    try {
      setStatus('checking', 'Verificando nube…');
      await authorizeCloud(client);

      const initialPending = await desktop.sync.pending(1);
      if (initialPending.length) setStatus('checking', 'Sincronizando cambios…');
      const pushed = await pushPending(client);

      const remaining = await desktop.sync.pending(1);
      if (remaining.length) {
        setStatus('local', 'Local · cambios pendientes');
        return { ok: false, pushed, pending: true };
      }

      if (shouldDeferPull()) {
        setStatus('local', 'Local · edición protegida', 'La descarga desde la nube se pospuso para no interferir con un formulario abierto.');
        return { ok: true, pushed, deferredPull: true, durationMs: Math.round(performance.now() - startedAt) };
      }

      const pulled = await pullCloudSnapshot(client);
      const durationMs = Math.round(performance.now() - startedAt);
      setStatus('ok', 'Local + nube · sincronizado', `Última sincronización: ${durationMs} ms`);
      return { ok: true, pushed, pulled, durationMs };
    } catch (error) {
      console.warn('Sincronización pendiente:', error);
      const message = error?.message || String(error);
      const unlinked = /no vinculada|administradora activa|jwt|auth|permission|policy|rls|row-level|not authorized|unauthorized/i.test(message);
      setStatus('local', unlinked ? 'Local · nube sin autorizar' : 'Local · cambios pendientes', message);
      return { ok: false, error: message, durationMs: Math.round(performance.now() - startedAt) };
    }
  }

  function syncOnce() {
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

  window.LotoSync = { syncOnce, start, authorizeCloud, pullCloudSnapshot, shouldDeferPull };
  start();
})();
