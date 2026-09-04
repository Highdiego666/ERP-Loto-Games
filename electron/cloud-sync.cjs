'use strict';

const SUPABASE_URL = 'https://vreznzasckljieptvqas.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GyZkdKYivt0zJ2sQdYrfhw_CHlkwKeY';
const API_ROOT = `${SUPABASE_URL}/rest/v1`;

const CONFIG = {
  productos: {
    table: 'productos',
    columns: ['id','nombre','sku','codigo_barras','categoria','tipo','local','precio','precio_cliente','precio_mayorista','precio_plaza','precio_base_cliente','precio_base_mayorista','precio_base_plaza','precio_markup_5_aplicado','stock','created_at']
  },
  ventas: {
    table: 'ventas',
    columns: ['id','items','subtotal','descuento_porcentaje','descuento_monto','total','metodo_pago','comentario','descuento_aplicado','usuario','cliente_id','cliente_nombre','tipo_precio','es_credito_plaza','fecha']
  },
  clientes: {
    table: 'clientes',
    columns: ['id','nombre','email','telefono','direccion','tipo_cliente','credito_habilitado','notas','created_at']
  },
  servicios: {
    table: 'servicios_tecnicos',
    columns: ['id','cliente_id','cliente_nombre','equipo','problema','diagnostico','estado','precio','garantia_dias','tecnico_asignado','entregado_por','created_at']
  },
  traspasos: {
    table: 'traspasos',
    columns: ['id','producto_id','producto_nombre','producto_sku','tipo','cantidad','motivo','usuario','local_origen','local_destino','locatario_nombre','locatario_telefono','monto','estado_pago','fecha_pago','fecha','origen','destino','estado','created_at']
  },
  cuentas_plaza_movimientos: {
    table: 'cuentas_plaza_movimientos',
    columns: ['id','cliente_id','cliente_nombre','tipo','monto','items','venta_id','nota','usuario','fecha','created_at']
  },
  usuarios: {
    table: 'usuarios',
    columns: ['id','nombre','email','rol','estado','privilegios','password_hash','password_salt','pin_hash','pin_salt','created_at']
  }
};

function pick(object, fields) {
  const output = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(object || {}, field) && object[field] !== undefined) {
      output[field] = object[field];
    }
  }
  return output;
}

function errorMessage(error) {
  if (!error) return 'Error desconocido';
  return error.message || String(error);
}

class CloudSync {
  constructor(store, { onStatus } = {}) {
    this.store = store;
    this.onStatus = typeof onStatus === 'function' ? onStatus : () => {};
    this.cloud = 'offline';
    this.syncing = false;
    this.lastError = null;
    this.inFlight = null;
  }

  status() {
    return {
      cloud: this.cloud,
      syncing: this.syncing,
      lastError: this.lastError,
      ...this.store.status()
    };
  }

  _emit() {
    this.onStatus(this.status());
  }

  async _request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Supabase ${response.status}: ${body || response.statusText}`);
      }

      if (response.status === 204) return null;
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async probe() {
    try {
      await this._request(`${API_ROOT}/productos?select=id&limit=1`);
      this.cloud = 'online';
      this.lastError = null;
      this._emit();
      return true;
    } catch (error) {
      this.cloud = 'offline';
      this.lastError = errorMessage(error);
      this._emit();
      return false;
    }
  }

  async _pushOne(item) {
    const cfg = CONFIG[item.entity];
    if (!cfg) throw new Error(`Entidad sin configuración de nube: ${item.entity}`);

    if (item.operation === 'delete') {
      const url = `${API_ROOT}/${cfg.table}?id=eq.${encodeURIComponent(item.record_id)}`;
      await this._request(url, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      return;
    }

    const payload = pick(item.payload || {}, cfg.columns);
    if (payload.id === undefined || payload.id === null) payload.id = Number(item.record_id);
    const url = `${API_ROOT}/${cfg.table}?on_conflict=id`;
    await this._request(url, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal,missing=default' },
      body: JSON.stringify(payload)
    });
  }

  async pushPending() {
    let processed = 0;
    while (processed < 1000) {
      const items = this.store.pending(100);
      if (!items.length) break;

      for (const item of items) {
        try {
          await this._pushOne(item);
          this.store.markSyncSuccess(item.id);
          processed += 1;
        } catch (error) {
          this.store.markSyncError(item.id, errorMessage(error));
          throw error;
        }
      }
    }
    return processed;
  }

  async pullAll() {
    let total = 0;
    for (const [entity, cfg] of Object.entries(CONFIG)) {
      const select = encodeURIComponent(cfg.columns.join(','));
      const rows = await this._request(`${API_ROOT}/${cfg.table}?select=${select}&order=id.asc`);
      const safeRows = Array.isArray(rows) ? rows : [];
      this.store.mergeCloud(entity, safeRows);
      total += safeRows.length;
    }
    return total;
  }

  async syncNow() {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this._syncNow().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  async _syncNow() {
    this.syncing = true;
    this._emit();
    try {
      const online = await this.probe();
      if (!online) return { ok: false, offline: true, ...this.status() };

      const pushed = await this.pushPending();
      const pulled = await this.pullAll();
      const now = new Date().toISOString();
      this.store.setMeta('last_sync_at', now);
      this.cloud = 'online';
      this.lastError = null;
      return { ok: true, pushed, pulled, ...this.status() };
    } catch (error) {
      this.cloud = 'offline';
      this.lastError = errorMessage(error);
      return { ok: false, error: this.lastError, ...this.status() };
    } finally {
      this.syncing = false;
      this._emit();
    }
  }
}

module.exports = { CloudSync };
