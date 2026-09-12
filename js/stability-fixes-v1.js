// ============================================
// LOTO GAMES - ESTABILIZACION PRE-PILOTO V1
// Correcciones seguras sobre módulos heredados mientras se completa la refactorización.
// ============================================

(function () {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  const runtimeErrorKey = 'loto_runtime_errors_v1';

  // ------------------------------------------------------------
  // TELEMETRÍA LOCAL DE ESTABILIDAD
  // ------------------------------------------------------------
  function rememberInteraction() {
    window.__lotoLastInteractionAt = Date.now();
  }

  for (const eventName of ['input', 'keydown', 'pointerdown', 'focusin']) {
    document.addEventListener(eventName, rememberInteraction, true);
  }

  function recordRuntimeError(kind, errorLike) {
    try {
      const previous = JSON.parse(localStorage.getItem(runtimeErrorKey) || '[]');
      const rows = Array.isArray(previous) ? previous : [];
      rows.push({
        at: new Date().toISOString(),
        kind,
        module: window.getCurrentModule?.() || null,
        message: String(errorLike?.message || errorLike || 'Error desconocido').slice(0, 1500),
        stack: String(errorLike?.stack || '').slice(0, 4000)
      });
      localStorage.setItem(runtimeErrorKey, JSON.stringify(rows.slice(-50)));
    } catch (_) {
      // El diagnóstico nunca debe romper el POS.
    }
  }

  window.addEventListener('error', event => recordRuntimeError('error', event.error || event.message));
  window.addEventListener('unhandledrejection', event => recordRuntimeError('unhandledrejection', event.reason));

  function isVisible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.pointerEvents !== 'none';
  }

  window.LotoRuntimeHealth = {
    getErrors() {
      try {
        const rows = JSON.parse(localStorage.getItem(runtimeErrorKey) || '[]');
        return Array.isArray(rows) ? rows : [];
      } catch (_) {
        return [];
      }
    },
    clearErrors() {
      localStorage.removeItem(runtimeErrorKey);
    },
    snapshot() {
      const active = document.activeElement;
      const visibleModals = Array.from(document.querySelectorAll('.modal'))
        .filter(isVisible)
        .map(el => el.id || '(modal sin id)');
      const overlays = ['loginRoot', 'cloudPairOverlay']
        .map(id => document.getElementById(id))
        .filter(isVisible)
        .map(el => el.id);
      return {
        at: new Date().toISOString(),
        module: window.getCurrentModule?.() || null,
        activeElement: active ? { tag: active.tagName, id: active.id || null, disabled: !!active.disabled, readOnly: !!active.readOnly } : null,
        visibleModals,
        overlays,
        bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
        lastInteractionAt: window.__lotoLastInteractionAt || null,
        online: navigator.onLine
      };
    }
  };

  // ------------------------------------------------------------
  // SERVICIO TÉCNICO: reparar búsqueda heredada que renderizaba "..."
  // ------------------------------------------------------------
  window.buscarServicio = async () => {
    const input = document.getElementById('buscarServicio');
    const tbody = document.getElementById('tablaServicios');
    if (!input || !tbody) return;

    try {
      const q = input.value.trim().toLowerCase();
      const rows = await window.DB.getServicios();
      const filtered = !q ? rows : rows.filter(s =>
        String(s.equipo || '').toLowerCase().includes(q) ||
        String(s.cliente_nombre || '').toLowerCase().includes(q) ||
        String(s.problema || '').toLowerCase().includes(q) ||
        String(s.tecnico_asignado || '').toLowerCase().includes(q)
      );

      tbody.innerHTML = filtered.map(s => `
        <tr>
          <td>#${esc(s.id)}</td>
          <td>${new Date(s.createdAt || s.created_at || Date.now()).toLocaleDateString('es-MX')}</td>
          <td>${esc(s.cliente_nombre || '-')}</td>
          <td>${esc(s.equipo || '-')}</td>
          <td>${esc(String(s.problema || '').slice(0, 40))}</td>
          <td>${window.getEstadoBadge?.(s.estado) || esc(s.estado || '-')}</td>
          <td>${esc(s.tecnico_asignado || '-')}</td>
          <td>${esc(s.entregado_por || '-')}</td>
          <td>${money(s.precio || 0)}</td>
          <td style="white-space:nowrap;">
            <button class="btn" style="background:var(--warning);padding:5px 10px;" onclick="window.editarServicio(${Number(s.id)})">✏️</button>
            <button class="btn" style="background:var(--danger);padding:5px 10px;" onclick="window.eliminarServicio(${Number(s.id)})">🗑️</button>
          </td>
        </tr>`).join('') || '<tr><td colspan="10" style="text-align:center;padding:24px;">Sin coincidencias</td></tr>';
    } catch (error) {
      recordRuntimeError('servicios.buscar', error);
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--danger);">Error buscando servicios: ${esc(error.message)}</td></tr>`;
    }
  };

  // ------------------------------------------------------------
  // INVENTARIO: ajuste robusto + movimiento trazable
  // ------------------------------------------------------------
  if (typeof window.abrirModalAjusteStock === 'function') {
    const originalOpenStock = window.abrirModalAjusteStock;
    window.abrirModalAjusteStock = id => {
      window.__lotoProductoAjusteId = id;
      return originalOpenStock(id);
    };
  }

  if (!window.DB.registrarMovimientoInventario) {
    window.DB.registrarMovimientoInventario = async movimiento => {
      const payload = {
        producto_id: movimiento.producto_id,
        producto_nombre: movimiento.producto_nombre,
        tipo: movimiento.tipo,
        cantidad: Math.abs(Number(movimiento.cantidad || 0)),
        stock_anterior: Number(movimiento.stock_anterior || 0),
        stock_nuevo: Number(movimiento.stock_nuevo || 0),
        motivo: movimiento.motivo || 'ajuste',
        usuario: movimiento.usuario || 'Usuario',
        fecha: movimiento.fecha || new Date().toISOString()
      };

      if (window.supabase) {
        const { data, error } = await window.supabase
          .from('movimientos_inventario')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const rows = JSON.parse(localStorage.getItem('movimientos_inventario') || '[]');
      const row = { ...payload, id: Date.now() };
      rows.push(row);
      localStorage.setItem('movimientos_inventario', JSON.stringify(rows));
      return row;
    };
  }

  window.guardarAjusteStock = async () => {
    const id = window.__lotoProductoAjusteId;
    const nuevoInput = document.getElementById('nuevoStockInv');
    const motivoInput = document.getElementById('motivoAjusteInv');
    if (id === undefined || id === null || !nuevoInput || !motivoInput) return;

    try {
      const producto = await window.DB.getProductoById(id);
      if (!producto) throw new Error('El producto ya no existe. Recarga Inventario.');

      const stockAnterior = Number(producto.stock || 0);
      const nuevoStock = Number.parseInt(nuevoInput.value, 10);
      const motivo = motivoInput.value || 'inventario';
      if (!Number.isFinite(nuevoStock) || nuevoStock < 0) return alert('Ingresa un stock válido.');
      if (nuevoStock === stockAnterior) return alert('El stock no ha cambiado.');

      const delta = nuevoStock - stockAnterior;
      const actor = window.AuthV2?.getSession?.() || window.usuarioActual || {};

      await window.DB.updateProducto(id, { stock: nuevoStock });
      await window.DB.registrarMovimientoInventario({
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        tipo: delta > 0 ? 'entrada' : 'salida',
        cantidad: Math.abs(delta),
        stock_anterior: stockAnterior,
        stock_nuevo: nuevoStock,
        motivo,
        usuario: actor.nombre || 'Usuario'
      });

      const nombre = producto.nombre;
      window.cerrarModalAjusteStock?.();
      window.__lotoProductoAjusteId = null;
      await window.cargarInventario?.();
      alert(`✅ Stock actualizado: ${nombre}\n${stockAnterior} → ${nuevoStock}`);
    } catch (error) {
      recordRuntimeError('inventario.ajuste', error);
      alert('❌ No se pudo ajustar el stock: ' + (error.message || error));
    }
  };

  // ------------------------------------------------------------
  // IMPRESIÓN PILOTO: sin window.open() para no chocar con Electron.
  // Usa el diálogo de impresión del sistema mientras llega selección nativa.
  // ------------------------------------------------------------
  function printWidth() {
    const value = Number(localStorage.getItem('loto_ticket_width_mm') || 80);
    return value === 58 ? 58 : 80;
  }

  function printInFrame(html, widthMm = printWidth()) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${widthMm}mm;height:200mm;border:0;background:white;`;
    frame.srcdoc = html;
    document.body.appendChild(frame);

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        setTimeout(() => frame.remove(), 250);
      };
      frame.onload = () => {
        try {
          const target = frame.contentWindow;
          if (!target) throw new Error('No se pudo crear el documento de impresión.');
          target.addEventListener('afterprint', () => { cleanup(); resolve(true); }, { once: true });
          target.focus();
          target.print();
          setTimeout(() => {
            if (document.body.contains(frame)) {
              cleanup();
              resolve(true);
            }
          }, 15000);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
    });
  }

  function ticketHtml(ticket) {
    const width = printWidth();
    const items = Array.isArray(ticket?.items) ? ticket.items : [];
    const rows = items.map(item => {
      const qty = Number(item.cantidad || 1);
      const unit = Number(item.precioUnitario ?? item.precioPersonalizado ?? item.precioPublico ?? item.precio ?? 0);
      return `<div class="item"><div><strong>${esc(item.nombre || 'Artículo')}</strong><br><small>${qty} x ${money(unit)}</small></div><strong>${money(qty * unit)}</strong></div>`;
    }).join('');
    const fecha = new Date(ticket?.fecha || Date.now()).toLocaleString('es-MX');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Ticket Loto Games</title>
      <style>
        *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,sans-serif}
        body{width:${width}mm;padding:3mm;font-size:11px}.center{text-align:center}.title{font-size:17px;font-weight:800}.sep{border-top:1px dashed #000;margin:2.5mm 0}
        .item{display:flex;justify-content:space-between;gap:3mm;margin:1.5mm 0}.item>div:first-child{min-width:0;flex:1}.total{display:flex;justify-content:space-between;font-size:15px;font-weight:800}
        .meta{line-height:1.45}small{font-size:9px}@page{margin:0}@media print{body{width:${width}mm}}
      </style></head><body>
      <div class="center"><div class="title">LOTO GAMES</div><div>Ticket de venta</div></div>
      <div class="sep"></div><div class="meta">Fecha: ${esc(fecha)}<br>Vendedor: ${esc(ticket?.usuario || 'Usuario')}<br>Pago: ${esc(ticket?.metodoPago || ticket?.metodo_pago || 'Efectivo')}${ticket?.clienteNombre ? `<br>Cliente: ${esc(ticket.clienteNombre)}` : ''}</div>
      <div class="sep"></div>${rows || '<div>Sin artículos</div>'}<div class="sep"></div>
      ${Number(ticket?.descuentoMonto || 0) > 0 ? `<div class="item"><span>Descuento</span><span>-${money(ticket.descuentoMonto)}</span></div>` : ''}
      <div class="total"><span>TOTAL</span><span>${money(ticket?.total || 0)}</span></div>
      ${ticket?.comentario ? `<div class="sep"></div><div>Nota: ${esc(ticket.comentario)}</div>` : ''}
      <div class="sep"></div><div class="center">Gracias por tu compra</div>
      </body></html>`;
  }

  window.imprimirTicketVenta = async ticket => {
    try {
      await printInFrame(ticketHtml(ticket), printWidth());
    } catch (error) {
      recordRuntimeError('impresion.ticket', error);
      alert('❌ No se pudo abrir el diálogo de impresión: ' + (error.message || error));
    }
  };

  window.imprimirEtiqueta = async id => {
    try {
      const producto = await window.DB.getProductoById(id);
      if (!producto) return alert('Producto no encontrado.');
      const codigo = String(producto.codigo_barras || producto.sku || producto.id || '').trim();
      if (!codigo) return alert('El producto no tiene código para imprimir.');
      if (typeof window.JsBarcode !== 'function') throw new Error('El generador de códigos de barras no está disponible.');

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      window.JsBarcode(svg, codigo, { format: 'CODE128', width: 1.2, height: 42, displayValue: true, fontSize: 10, margin: 0 });
      const barcode = new XMLSerializer().serializeToString(svg);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta</title>
        <style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,sans-serif}body{width:40mm;height:30mm;padding:1.5mm;text-align:center;display:flex;flex-direction:column;justify-content:center}.name{font-weight:800;font-size:10px;line-height:1.1;margin-bottom:1mm}svg{width:36mm;max-height:19mm}@page{size:40mm 30mm;margin:0}</style>
        </head><body><div class="name">${esc(producto.nombre || '')}</div>${barcode}</body></html>`;
      await printInFrame(html, 40);
    } catch (error) {
      recordRuntimeError('impresion.etiqueta', error);
      alert('❌ No se pudo imprimir la etiqueta: ' + (error.message || error));
    }
  };

  window.LotoPilotPrint = { printInFrame, ticketHtml };
  console.log('✅ Estabilización pre-piloto activa: diagnóstico, inventario, servicio e impresión sin popups');
})();
