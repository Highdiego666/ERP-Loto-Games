// ============================================
// LOTO GAMES POS - TRASPASOS V3
// Movimiento real de existencias entre Local 14 y Local 20.
// ============================================

(function () {
  'use strict';

  const LOCALES = { '14': '🏬 Local 14', '20': '🏬 Local 20' };
  let productos = [];
  let traspasos = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function stockLocal(producto, local) {
    if (window.DB?.getStocksByStore) return Number(window.DB.getStocksByStore(producto)?.[local] || 0);
    const total = Number(producto?.stock || 0);
    return String(producto?.local || '') === String(local) ? total : 0;
  }

  function selectedProduct() {
    const id = document.getElementById('selectProductoTraspaso')?.value;
    return productos.find(p => String(p.id) === String(id)) || null;
  }

  function fieldStyle() {
    return 'pointer-events:auto!important;position:relative;z-index:20;min-height:44px;';
  }

  window.traspasosModule = () => `
    <div style="margin-bottom:18px;position:relative;z-index:1;">
      <h2 style="margin:0;">🔄 Traspasos entre locales</h2>
      <p style="color:var(--text-muted);margin:4px 0 0;">Mover mercancía entre Local 14 y Local 20 sin alterar el stock total.</p>
    </div>

    <section class="table-container" style="margin-bottom:16px;padding:20px;position:relative;z-index:10;isolation:isolate;overflow:visible;">
      <h3 style="margin:0 0 16px;">Nuevo traspaso</h3>
      <form id="formTraspasoV3" onsubmit="return window.registrarTraspaso(event)" style="position:relative;z-index:20;pointer-events:auto;">
        <div class="form-group">
          <label>Producto</label>
          <select id="selectProductoTraspaso" class="form-control" style="${fieldStyle()}" onchange="window.actualizarResumenTraspaso()">
            <option value="">Seleccionar producto...</option>
          </select>
        </div>

        <div id="stockProductoTraspaso" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 16px;">
          <div style="padding:12px;border-radius:12px;background:var(--bg-dark);border:1px solid var(--border);"><small style="color:var(--text-muted);">Local 14</small><div id="stock14Traspaso" style="font-size:24px;font-weight:800;">0</div></div>
          <div style="padding:12px;border-radius:12px;background:var(--bg-dark);border:1px solid var(--border);"><small style="color:var(--text-muted);">Local 20</small><div id="stock20Traspaso" style="font-size:24px;font-weight:800;">0</div></div>
          <div style="padding:12px;border-radius:12px;background:var(--bg-dark);border:1px solid var(--border);"><small style="color:var(--text-muted);">Stock total</small><div id="stockTotalTraspaso" style="font-size:24px;font-weight:800;">0</div></div>
        </div>

        <div style="display:grid;grid-template-columns:minmax(180px,1fr) 64px minmax(180px,1fr);gap:12px;align-items:end;margin-bottom:16px;">
          <div class="form-group" style="margin:0;">
            <label>Sale de</label>
            <select id="selectOrigenTraspaso" class="form-control" style="${fieldStyle()}" onchange="window.cambiarOrigenTraspaso()">
              <option value="14">Local 14</option>
              <option value="20">Local 20</option>
            </select>
          </div>
          <div style="text-align:center;font-size:28px;padding-bottom:6px;color:var(--primary-light);">→</div>
          <div class="form-group" style="margin:0;">
            <label>Llega a</label>
            <select id="selectDestinoTraspaso" class="form-control" style="${fieldStyle()}" onchange="window.validarLocalesTraspaso()">
              <option value="20">Local 20</option>
              <option value="14">Local 14</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:180px minmax(0,1fr);gap:12px;margin-bottom:16px;">
          <div class="form-group" style="margin:0;">
            <label>Cantidad</label>
            <input id="inputCantidadTraspaso" type="number" min="1" step="1" class="form-control" style="${fieldStyle()}" placeholder="1">
          </div>
          <div class="form-group" style="margin:0;">
            <label>Motivo / referencia</label>
            <input id="motivoTraspasoV2" class="form-control" style="${fieldStyle()}" autocomplete="off" placeholder="Reposición, pedido, movimiento entre locales...">
          </div>
        </div>

        <div id="mensajeTraspasoV3" style="display:none;margin:0 0 12px;padding:11px;border-radius:10px;"></div>
        <button id="btnRegistrarTraspasoV3" type="submit" class="btn btn-primary" style="position:relative;z-index:21;padding:12px 20px;pointer-events:auto;">Registrar traspaso</button>
      </form>
    </section>

    <section class="table-container" style="position:relative;z-index:1;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
        <div><h3 style="margin:0;">Historial</h3><small style="color:var(--text-muted);">Movimientos Local 14 ↔ Local 20</small></div>
        <input id="filtroTraspasos" class="form-control" placeholder="🔍 Filtrar historial" oninput="window.filtrarTraspasos()" style="max-width:300px;pointer-events:auto;position:relative;z-index:2;">
      </div>
      <div style="overflow:auto;">
        <table style="width:100%;"><thead><tr><th>Fecha</th><th>Producto</th><th>Origen</th><th>Destino</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody id="tablaTraspasos"></tbody></table>
      </div>
    </section>
  `;

  function message(text, ok = false) {
    const el = document.getElementById('mensajeTraspasoV3');
    if (!el) return;
    el.style.display = 'block';
    el.style.background = ok ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)';
    el.style.color = ok ? '#34d399' : '#f87171';
    el.textContent = text;
  }

  window.cargarProductosTraspaso = async () => {
    productos = await window.DB.getProductos();
    const select = document.getElementById('selectProductoTraspaso');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar producto...</option>' + productos
      .slice()
      .sort((a,b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
      .map(p => {
        const s14 = stockLocal(p, '14');
        const s20 = stockLocal(p, '20');
        return `<option value="${esc(p.id)}">${esc(p.nombre)} · ${esc(p.sku || 'sin SKU')} · L14 ${s14} / L20 ${s20}</option>`;
      }).join('');

    const station = localStorage.getItem('loto_store_id');
    const origen = document.getElementById('selectOrigenTraspaso');
    const destino = document.getElementById('selectDestinoTraspaso');
    if (origen) origen.value = station === '20' ? '20' : '14';
    if (destino) destino.value = origen?.value === '20' ? '14' : '20';
    window.actualizarResumenTraspaso();
  };

  window.actualizarResumenTraspaso = () => {
    const p = selectedProduct();
    const s14 = p ? stockLocal(p, '14') : 0;
    const s20 = p ? stockLocal(p, '20') : 0;
    const total = Number(p?.stock || 0);
    const el14 = document.getElementById('stock14Traspaso');
    const el20 = document.getElementById('stock20Traspaso');
    const elTotal = document.getElementById('stockTotalTraspaso');
    if (el14) el14.textContent = s14;
    if (el20) el20.textContent = s20;
    if (elTotal) elTotal.textContent = total;
  };

  window.cambiarOrigenTraspaso = () => {
    const origen = document.getElementById('selectOrigenTraspaso');
    const destino = document.getElementById('selectDestinoTraspaso');
    if (!origen || !destino) return;
    destino.value = origen.value === '14' ? '20' : '14';
  };

  window.validarLocalesTraspaso = () => {
    const origen = document.getElementById('selectOrigenTraspaso');
    const destino = document.getElementById('selectDestinoTraspaso');
    if (!origen || !destino) return;
    if (origen.value === destino.value) origen.value = destino.value === '14' ? '20' : '14';
  };

  window.registrarTraspaso = async event => {
    event?.preventDefault?.();
    const p = selectedProduct();
    const origen = document.getElementById('selectOrigenTraspaso')?.value;
    const destino = document.getElementById('selectDestinoTraspaso')?.value;
    const cantidad = Number.parseInt(document.getElementById('inputCantidadTraspaso')?.value, 10);
    const motivo = document.getElementById('motivoTraspasoV2')?.value.trim() || '';

    if (!p) { message('Selecciona un producto.'); return false; }
    if (!['14','20'].includes(origen) || !['14','20'].includes(destino) || origen === destino) { message('Selecciona origen y destino diferentes.'); return false; }
    if (!Number.isFinite(cantidad) || cantidad < 1) { message('Ingresa una cantidad válida.'); return false; }

    const disponible = stockLocal(p, origen);
    if (cantidad > disponible) { message(`Local ${origen} sólo tiene ${disponible} unidad(es) disponibles de ${p.nombre}.`); return false; }

    if (!confirm(`TRASPASO\n\n${p.nombre}\nLocal ${origen} → Local ${destino}\nCantidad: ${cantidad}\n\n¿Confirmar movimiento?`)) return false;

    const button = document.getElementById('btnRegistrarTraspasoV3');
    if (button) { button.disabled = true; button.textContent = 'Registrando...'; }
    try {
      const actor = window.AuthV2?.getSession?.() || window.usuarioActual || {};
      if (typeof window.DB.transferBetweenStores !== 'function') throw new Error('El motor de existencias por local no está cargado.');
      await window.DB.transferBetweenStores({
        productoId: p.id,
        origen,
        destino,
        cantidad,
        motivo: motivo || `Movimiento Local ${origen} → Local ${destino}`,
        usuario: actor.nombre || 'Usuario'
      });

      document.getElementById('inputCantidadTraspaso').value = '';
      document.getElementById('motivoTraspasoV2').value = '';
      await window.cargarProductosTraspaso();
      await window.cargarTraspasos();
      message(`✅ ${cantidad} unidad(es) de ${p.nombre}: Local ${origen} → Local ${destino}.`, true);
      window.LotoSync?.syncOnce?.();
    } catch (error) {
      console.error(error);
      message('No se pudo registrar el traspaso: ' + (error?.message || error));
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Registrar traspaso'; }
    }
    return false;
  };

  function render(rows) {
    const tbody = document.getElementById('tablaTraspasos');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted);">Aún no hay traspasos registrados</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(t => {
      const from = String(t.origen || t.local_origen || '');
      const to = String(t.destino || t.local_destino || '');
      return `<tr>
        <td>${new Date(t.created_at || t.fecha || Date.now()).toLocaleString('es-MX')}</td>
        <td><strong>${esc(t.producto_nombre || '-')}</strong><br><small>${esc(t.producto_sku || '')}</small></td>
        <td>${LOCALES[from] || esc(from || '-')}</td>
        <td>${LOCALES[to] || esc(to || '-')}</td>
        <td><strong>${Number(t.cantidad || 0)}</strong></td>
        <td>${esc(t.motivo || '-')}</td>
        <td>${esc(t.usuario || '-')}</td>
      </tr>`;
    }).join('');
  }

  window.cargarTraspasos = async () => {
    traspasos = await window.DB.getTraspasos();
    render(traspasos);
  };

  window.filtrarTraspasos = () => {
    const q = (document.getElementById('filtroTraspasos')?.value || '').trim().toLowerCase();
    const rows = !q ? traspasos : traspasos.filter(t =>
      [t.producto_nombre, t.producto_sku, t.origen, t.destino, t.local_origen, t.local_destino, t.motivo, t.usuario]
        .some(v => String(v || '').toLowerCase().includes(q))
    );
    render(rows);
  };

  console.log('✅ Traspasos V3 activo: Local 14 ↔ Local 20 con existencias reales');
})();
