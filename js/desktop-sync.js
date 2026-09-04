// ============================================
// LOTO GAMES - SINCRONIZACIÓN OFFLINE-FIRST
// La UI escribe localmente. Esta capa vacía la cola hacia Supabase
// cuando hay conexión sin bloquear ventas ni inventario.
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

  let running = false;
  let timer = null;

  function normalize(entity, record) {
    const source = { ...record };
    for (const [from, to] of Object.entries(aliases)) {
      if (source[from] !== undefined && source[to] === undefined) source[to] = source[from];
    }
    if (source.created_at === undefined && source.fecha === undefined && entity !== 'productos') {
      source.created_at = new Date().toISOString();
    }
    const output = {};
    for (const key of ALLOWED[entity] || []) {
      if (source[key] !== undefined) output[key] = source[key];
    }
    return output;
  }

  function setStatus(state, text) {
    const classes = ['db-status-online', 'db-status-offline', 'db-status-checking'];
    for (const id of ['dbStatusSidebar', 'dbStatusTop']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.remove(...classes);
      el.classList.add(state === 'online' ? 'db-status-online' : state === 'offline' ? 'db-status-offline' : 'db-status-checking');
      const span = el.querySelector('span:last-child');
      if (span) span.textContent = text;
    }
  }

  async function syncOnce() {
    if (running) return;
    const client = window.cloudSupabase;
    if (!client || !navigator.onLine) {
      setStatus('offline', 'Local · sin conexión');
      return;
    }

    running = true;
    try {
      const jobs = await desktop.sync.pending(100);
      if (!jobs.length) {
        setStatus('online', 'Local + nube · sincronizado');
        return;
      }

      setStatus('checking', `Sincronizando ${jobs.length} cambio${jobs.length === 1 ? '' : 's'}…`);

      for (const job of jobs) {
        const table = TABLES[job.entity];
        if (!table) {
          await desktop.sync.fail(job.id, `Entidad no permitida: ${job.entity}`);
          continue;
        }

        try {
          if (job.operation === 'delete') {
            const { error } = await client.from(table).delete().eq('id', job.record_id);
            if (error) throw error;
          } else {
            const raw = JSON.parse(job.payload || '{}');
            const payload = normalize(job.entity, raw);
            if (payload.id === undefined || payload.id === null) payload.id = Number(job.record_id);
            const { error } = await client.from(table).upsert(payload, { onConflict: 'id' });
            if (error) throw error;
          }
          await desktop.sync.complete(job.id);
        } catch (error) {
          await desktop.sync.fail(job.id, error?.message || String(error));
          throw error;
        }
      }

      setStatus('online', 'Local + nube · sincronizado');
    } catch (error) {
      console.warn('Sincronización pendiente:', error);
      setStatus('offline', 'Local · cambios pendientes');
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) return;
    window.addEventListener('online', syncOnce);
    window.addEventListener('offline', () => setStatus('offline', 'Local · sin conexión'));
    timer = setInterval(syncOnce, 30000);
    setTimeout(syncOnce, 1500);
  }

  window.LotoSync = { syncOnce, start };
  start();
})();
