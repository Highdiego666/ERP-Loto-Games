// ============================================
// LOTO GAMES POS - VENTAS V3
// Flujo rápido + teclado físico + recargo general 5%
// ============================================

(function () {
  'use strict';

  let productosVentaV3 = [];
  let clientesVentaV3 = [];
  let carritoV3 = [];
  let tipoPrecioV3 = 'cliente';
  let scannerBufferV3 = '';
  let scannerTimerV3 = null;
  let descuentoCincoVentaV3 = false;

  const RECARGO_KEY = window.LOTO_DEMO_MODE ? 'loto_demo_recargo_general_5' : 'loto_recargo_general_5';
  let recargoGeneral5V3 = localStorage.getItem(RECARGO_KEY) !== '0';

  const money = v => Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  const session = () => window.AuthV2?.getSession() || window.usuarioActual || {};

  const getClienteSeleccionado = () => {
    const id = document.getElementById('clienteVentaV2')?.value;
    return clientesVentaV3.find(c => String(c.id) === String(id)) || null;
  };

  const recargoAplicado = () => recargoGeneral5V3 && !descuentoCincoVentaV3;
  const factorVenta = () => recargoAplicado() ? 1.05 : 1;
  const precioListaProducto = p => window.DB.getPrecioProducto(p, tipoPrecioV3);
  const precioMostradoProducto = p => precioListaProducto(p) * factorVenta();

  function calcularTotales() {
    const subtotal = carritoV3.reduce((s, i) => s + Number(i.precioUnitario || 0) * Number(i.cantidad || 0), 0);
    const recargo = recargoAplicado() ? subtotal * 0.05 : 0;
    return { subtotal, recargo, total: subtotal + recargo };
  }

  window.ventasModule = () => `
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:16px;align-items:start;">
      <section style="min-width:0;">
        <div class="table-container" style="padding:14px;position:sticky;top:0;z-index:10;margin-bottom:12px;">
          <div style="display:flex;gap:8px;align-items:center;">
            <div style="position:relative;flex:1;">
              <input id="buscadorProducto" class="form-control" autocomplete="off"
                placeholder="🔍 Escanea o escribe nombre, SKU o código — F2"
                style="font-size:16px;padding:13px 14px;"
                oninput="window.filtrarProductosVentaV2()"
                onkeydown="window.teclaBusquedaVentaV2(event)">
            </div>
            <button class="btn btn-primary" onclick="window.focusVentaSearch()">Buscar</button>
          </div>
          <div id="resultadoBusqueda" style="min-height:20px;margin-top:6px;font-size:12px;color:var(--text-muted);">
            F2 buscar · F3 venta rápida · F4 cobrar
          </div>
        </div>

        <div id="listaProductosGrid"
          style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;max-height:calc(100vh - 215px);overflow:auto;padding:2px 4px 20px 2px;">
          <div style="grid-column:1/-1;text-align:center;padding:30px;">Cargando productos...</div>
        </div>
      </section>

      <aside class="table-container" style="padding:14px;position:sticky;top:0;max-height:calc(100vh - 115px);overflow:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;">🛒 Venta</h3>
          <span id="vendedorVentaV2" style="font-size:12px;color:var(--text-muted);"></span>
        </div>

        <div class="form-group" style="margin-bottom:9px;">
          <label>Comprador</label>
          <select id="clienteVentaV2" class="form-control" onchange="window.cambiarClienteVentaV2()">
            <option value="">Público general</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div>
            <label style="font-size:12px;">Lista de precio</label>
            <select id="tipoPrecioVentaV2" class="form-control" onchange="window.cambiarTipoPrecioVentaV2(this.value)">
              <option value="cliente">Cliente</option>
              <option value="mayorista">Mayorista</option>
              <option value="plaza">Plaza</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;">Pago</label>
            <select id="metodoPagoVenta" class="form-control">
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cuenta Plaza">Cuenta Plaza</option>
            </select>
          </div>
        </div>

        <div id="panelRecargo5V3" style="padding:10px 11px;margin:8px 0;border:1px solid var(--border);border-radius:12px;background:rgba(99,102,241,.08);">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
            <div>
              <strong style="font-size:13px;">💳 Recargo general +5%</strong><br>
              <small id="estadoRecargo5V3" style="color:var(--text-muted);"></small>
            </div>
            <button id="btnConfigRecargo5V3" class="btn" onclick="window.toggleRecargoGeneral5V3()" style="padding:7px 9px;background:var(--bg-dark);font-size:11px;">Configurar</button>
          </div>
          <button id="btnDescuento" class="btn" onclick="window.toggleDescuento()" style="width:100%;margin-top:8px;padding:9px;background:var(--warning);color:#111827;font-weight:800;">
            Quitar 5% en esta venta
          </button>
        </div>

        <div id="carritoVentas" style="border-top:1px solid var(--border);border-bottom:1px solid var(--border);min-height:130px;max-height:250px;overflow:auto;margin:8px 0;padding:4px 0;"></div>

        <div style="margin:10px 0;padding:10px;border-radius:12px;background:var(--bg-dark);">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);">
            <span>Subtotal</span><span id="subtotalCarritoV3">$0.00</span>
          </div>
          <div id="filaRecargo5V3" style="display:flex;justify-content:space-between;font-size:12px;color:var(--warning);margin-top:3px;">
            <span>Recargo 5%</span><span id="recargoCarritoV3">$0.00</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:end;margin-top:6px;">
            <span style="font-size:13px;color:var(--text-muted);"><span id="cantidadCarritoV2">0</span> artículos</span>
            <div style="text-align:right;">
              <small style="color:var(--text-muted);">TOTAL</small>
              <div id="totalCarrito" style="font-size:30px;font-weight:800;color:var(--success);">$0.00</div>
            </div>
          </div>
        </div>

        <div id="ventaRapidaPanelV3" style="margin:10px 0;padding:14px;border:2px solid rgba(16,185,129,.45);background:rgba(16,185,129,.08);border-radius:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div>
              <strong style="font-size:16px;">⚡ Venta rápida</strong><br>
              <small style="color:var(--text-muted);">F3 · escribe concepto → Enter → monto → Enter</small>
            </div>
            <span style="font-size:11px;padding:4px 8px;border-radius:999px;background:#10b981;color:white;font-weight:800;">F3</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:9px;">
            <input id="ventaRapidaConcepto" class="form-control" autocomplete="off"
              placeholder="Concepto de la venta rápida"
              style="font-size:16px;padding:13px 14px;"
              onkeydown="window.teclaVentaRapidaConceptoV3(event)">
            <div style="display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:9px;">
              <input id="ventaRapidaMonto" type="number" min="0.01" step="0.01" class="form-control"
                placeholder="Monto base $"
                style="font-size:18px;padding:13px 14px;font-weight:700;"
                onkeydown="window.teclaVentaRapidaMontoV3(event)">
              <button class="btn btn-success" onclick="window.agregarVentaRapida()" style="font-size:14px;font-weight:800;">+ AGREGAR</button>
            </div>
          </div>
        </div>

        <textarea id="comentarioVenta" class="form-control" rows="2" placeholder="Comentario opcional" style="margin:8px 0;"></textarea>
        <button id="btnFinalizarVentaV2" class="btn btn-primary" onclick="window.finalizarVenta()" style="width:100%;padding:14px;font-size:16px;font-weight:800;">
          ✓ COBRAR / REGISTRAR — F4
        </button>
        <button class="btn" onclick="window.limpiarCarrito()" style="width:100%;margin-top:7px;background:var(--bg-dark);">Vaciar carrito</button>
      </aside>
    </div>
  `;

  function actualizarPanelRecargoV3() {
    const estado = document.getElementById('estadoRecargo5V3');
    const config = document.getElementById('btnConfigRecargo5V3');
    const descuento = document.getElementById('btnDescuento');

    if (estado) {
      if (!recargoGeneral5V3) estado.textContent = 'Desactivado para todas las ventas';
      else if (descuentoCincoVentaV3) estado.textContent = 'Activo globalmente · quitado sólo en esta venta';
      else estado.textContent = 'Activo · se suma 5% al total';
    }
    if (config) config.textContent = recargoGeneral5V3 ? 'General: ON' : 'General: OFF';
    if (descuento) {
      descuento.disabled = !recargoGeneral5V3;
      descuento.textContent = descuentoCincoVentaV3 ? 'Restaurar +5% en esta venta' : 'Quitar 5% en esta venta';
      descuento.style.opacity = recargoGeneral5V3 ? '1' : '.45';
      descuento.style.background = descuentoCincoVentaV3 ? 'var(--success)' : 'var(--warning)';
      descuento.style.color = descuentoCincoVentaV3 ? 'white' : '#111827';
    }
  }

  function renderProductos(list) {
    const container = document.getElementById('listaProductosGrid');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:35px;color:var(--text-muted);">Sin productos disponibles</div>';
      return;
    }

    container.innerHTML = list.map(p => {
      const stock = Number(p.stock || 0);
      const base = precioListaProducto(p);
      const final = precioMostradoProducto(p);
      return `<button type="button" onclick="window.agregarAlCarrito(${p.id})"
        style="text-align:left;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;color:var(--text);cursor:pointer;min-height:116px;transition:.15s;"
        onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="font-weight:700;line-height:1.2;margin-bottom:7px;">${p.nombre}</div>
        <div style="font-size:20px;color:var(--success);font-weight:800;">${money(final)}</div>
        ${recargoAplicado() ? `<small style="display:block;color:var(--text-muted);">Base ${money(base)} + 5%</small>` : ''}
        <small style="display:block;color:var(--text-muted);margin-top:4px;">${p.sku || ''}</small>
        <small style="color:${stock < 5 ? '#f59e0b' : 'var(--text-muted)'};">Stock: ${stock}</small>
      </button>`;
    }).join('');
  }

  window.cargarProductosVenta = async () => {
    [productosVentaV3, clientesVentaV3] = await Promise.all([window.DB.getProductos(), window.DB.getClientes()]);
    productosVentaV3 = productosVentaV3.filter(p => Number(p.stock || 0) > 0);

    const sel = document.getElementById('clienteVentaV2');
    if (sel) {
      sel.innerHTML = '<option value="">Público general</option>' + clientesVentaV3.map(c => {
        const label = { cliente: 'Cliente', mayorista: 'Mayorista', plaza: 'Plaza' }[c.tipo_cliente] || 'Cliente';
        return `<option value="${c.id}">${c.nombre} — ${label}</option>`;
      }).join('');
    }

    const seller = document.getElementById('vendedorVentaV2');
    if (seller) seller.textContent = `👤 ${session().nombre || 'Usuario'}`;

    renderProductos(productosVentaV3);
    window.renderCarritoVentas();
    actualizarPanelRecargoV3();
    window.inicializarEscannerV2();
    setTimeout(() => document.getElementById('buscadorProducto')?.focus(), 50);
  };

  window.filtrarProductosVentaV2 = () => {
    const q = (document.getElementById('buscadorProducto')?.value || '').trim().toLowerCase();
    const list = !q ? productosVentaV3 : productosVentaV3.filter(p =>
      String(p.nombre || '').toLowerCase().includes(q) ||
      String(p.sku || '').toLowerCase().includes(q) ||
      String(p.codigo_barras || '').toLowerCase().includes(q)
    );
    renderProductos(list);
    const result = document.getElementById('resultadoBusqueda');
    if (result) result.textContent = q ? `${list.length} coincidencia(s)` : 'F2 buscar · F3 venta rápida · F4 cobrar';
  };

  window.teclaBusquedaVentaV2 = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    const exact = productosVentaV3.find(p =>
      String(p.sku || '').toLowerCase() === q || String(p.codigo_barras || '').toLowerCase() === q
    );
    const matches = productosVentaV3.filter(p => String(p.nombre || '').toLowerCase().includes(q));
    if (exact) window.agregarAlCarrito(exact.id);
    else if (matches.length === 1) window.agregarAlCarrito(matches[0].id);
  };

  window.focusVentaSearch = () => {
    const input = document.getElementById('buscadorProducto');
    if (input) { input.focus(); input.select(); }
  };

  window.focusVentaRapida = () => {
    const input = document.getElementById('ventaRapidaConcepto');
    if (input) { input.focus(); input.select(); }
  };

  window.teclaVentaRapidaConceptoV3 = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const monto = document.getElementById('ventaRapidaMonto');
    if (monto) { monto.focus(); monto.select(); }
  };

  window.teclaVentaRapidaMontoV3 = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    window.agregarVentaRapida();
  };

  window.cambiarClienteVentaV2 = () => {
    const c = getClienteSeleccionado();
    const tipo = c?.tipo_cliente === 'mayorista' ? 'mayorista' : c?.tipo_cliente === 'plaza' ? 'plaza' : 'cliente';
    const select = document.getElementById('tipoPrecioVentaV2');
    if (select) select.value = tipo;
    window.cambiarTipoPrecioVentaV2(tipo);
  };

  window.cambiarTipoPrecioVentaV2 = tipo => {
    tipoPrecioV3 = ['cliente', 'mayorista', 'plaza'].includes(tipo) ? tipo : 'cliente';
    carritoV3.forEach(item => {
      if (item.tipo !== 'producto' || item.precioEditado) return;
      const p = productosVentaV3.find(x => String(x.id) === String(item.id));
      if (p) item.precioUnitario = window.DB.getPrecioProducto(p, tipoPrecioV3);
    });
    window.filtrarProductosVentaV2();
    window.renderCarritoVentas();
  };

  window.agregarAlCarrito = async id => {
    const p = productosVentaV3.find(x => String(x.id) === String(id)) || await window.DB.getProductoById(id);
    if (!p || Number(p.stock || 0) <= 0) return alert('Producto sin stock.');

    const existing = carritoV3.find(i => i.tipo === 'producto' && String(i.id) === String(id));
    if (existing) {
      if (existing.cantidad + 1 > Number(p.stock)) return alert(`Solo hay ${p.stock} unidades disponibles.`);
      existing.cantidad += 1;
    } else {
      const price = window.DB.getPrecioProducto(p, tipoPrecioV3);
      carritoV3.push({
        id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        cantidad: 1,
        tipo: 'producto',
        precioUnitario: price,
        precioPersonalizado: price,
        precioBase: price,
        precioEditado: false
      });
    }

    window.renderCarritoVentas();
    const input = document.getElementById('buscadorProducto');
    if (input) input.value = '';
    window.filtrarProductosVentaV2();
    input?.focus();
  };

  window.agregarVentaRapida = () => {
    const conceptoEl = document.getElementById('ventaRapidaConcepto');
    const montoEl = document.getElementById('ventaRapidaMonto');
    const nombre = conceptoEl?.value.trim();
    const monto = Number(montoEl?.value);

    if (!nombre) {
      alert('Ingresa el concepto de la venta rápida.');
      conceptoEl?.focus();
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      alert('Ingresa un monto válido.');
      montoEl?.focus();
      return;
    }

    carritoV3.push({
      id: `R-${Date.now()}`,
      nombre,
      sku: 'RAPIDA',
      cantidad: 1,
      tipo: 'rapida',
      precioUnitario: monto,
      precioPersonalizado: monto,
      precioBase: monto,
      precioEditado: true
    });

    conceptoEl.value = '';
    montoEl.value = '';
    window.renderCarritoVentas();
    conceptoEl.focus();
  };

  window.renderCarritoVentas = () => {
    const container = document.getElementById('carritoVentas');
    if (!container) return;

    if (!carritoV3.length) {
      container.innerHTML = '<div style="text-align:center;padding:30px 10px;color:var(--text-muted);">Carrito vacío<br><small>Haz clic, escanea o usa F3 para venta rápida.</small></div>';
    } else {
      container.innerHTML = carritoV3.map((i, index) => {
        const unitarioFinal = Number(i.precioUnitario) * factorVenta();
        const subtotalFinal = unitarioFinal * Number(i.cantidad);
        return `<div style="padding:9px 2px;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <strong style="font-size:13px;">${i.nombre}${i.precioEditado ? ' ✏️' : ''}</strong>
            <button onclick="window.eliminarDelCarrito(${index})" style="border:0;background:transparent;color:#ef4444;cursor:pointer;">✕</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:6px;">
            <div>${i.tipo === 'producto'
              ? `<button onclick="window.modificarCantidad(${index},-1)" class="btn" style="padding:3px 8px;">−</button> <strong>${i.cantidad}</strong> <button onclick="window.modificarCantidad(${index},1)" class="btn" style="padding:3px 8px;">+</button>`
              : '<strong>1</strong>'}</div>
            <button onclick="window.editarPrecioCarrito(${index})" style="border:0;background:transparent;color:var(--primary);cursor:pointer;" title="Editar precio base">${money(unitarioFinal)}</button>
            <strong>${money(subtotalFinal)}</strong>
          </div>
        </div>`;
      }).join('');
    }

    const { subtotal, recargo, total } = calcularTotales();
    const qty = carritoV3.reduce((s, i) => s + Number(i.cantidad || 0), 0);

    if (document.getElementById('subtotalCarritoV3')) document.getElementById('subtotalCarritoV3').textContent = money(subtotal);
    if (document.getElementById('recargoCarritoV3')) document.getElementById('recargoCarritoV3').textContent = money(recargo);
    if (document.getElementById('filaRecargo5V3')) document.getElementById('filaRecargo5V3').style.display = recargoAplicado() ? 'flex' : 'none';
    if (document.getElementById('totalCarrito')) document.getElementById('totalCarrito').textContent = money(total);
    if (document.getElementById('cantidadCarritoV2')) document.getElementById('cantidadCarritoV2').textContent = qty;

    window._totalesCarrito = { totalBase: subtotal, totalConRecargo: subtotal * 1.05, totalFinal: total, recargo5: recargo };
    actualizarPanelRecargoV3();
  };

  window.modificarCantidad = async (index, delta) => {
    const i = carritoV3[index];
    if (!i) return;

    if (i.tipo === 'rapida') {
      if (delta < 0) carritoV3.splice(index, 1);
      window.renderCarritoVentas();
      return;
    }

    const p = await window.DB.getProductoById(i.id);
    const next = i.cantidad + delta;
    if (next <= 0) carritoV3.splice(index, 1);
    else if (p && next <= Number(p.stock)) i.cantidad = next;
    else return alert(`Stock insuficiente. Disponible: ${p?.stock || 0}`);
    window.renderCarritoVentas();
  };

  window.editarPrecioCarrito = index => {
    const i = carritoV3[index];
    if (!i) return;
    const value = prompt(`Precio base antes del 5% para ${i.nombre}:`, Number(i.precioUnitario).toFixed(2));
    if (value === null) return;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return alert('Precio inválido.');
    i.precioUnitario = n;
    i.precioPersonalizado = n;
    i.precioBase = n;
    i.precioEditado = true;
    window.renderCarritoVentas();
  };

  window.eliminarDelCarrito = index => {
    carritoV3.splice(index, 1);
    window.renderCarritoVentas();
  };

  window.limpiarCarrito = () => {
    if (carritoV3.length && !confirm('¿Vaciar carrito?')) return;
    carritoV3 = [];
    descuentoCincoVentaV3 = false;
    window.renderCarritoVentas();
  };

  window.toggleDescuento = () => {
    if (!recargoGeneral5V3) return;
    descuentoCincoVentaV3 = !descuentoCincoVentaV3;
    window.filtrarProductosVentaV2();
    window.renderCarritoVentas();
  };

  window.toggleRecargoGeneral5V3 = () => {
    if ((session().rol || '').toLowerCase() !== 'admin') {
      alert('Sólo un administrador puede cambiar el recargo general del 5%.');
      return;
    }
    const activar = !recargoGeneral5V3;
    const texto = activar
      ? '¿Activar el recargo general del 5% para todas las ventas?'
      : '¿Desactivar el recargo general del 5% para todas las ventas?';
    if (!confirm(texto)) return;
    recargoGeneral5V3 = activar;
    descuentoCincoVentaV3 = false;
    localStorage.setItem(RECARGO_KEY, activar ? '1' : '0');
    window.filtrarProductosVentaV2();
    window.renderCarritoVentas();
  };

  window.finalizarVenta = async () => {
    if (!carritoV3.length) return alert('El carrito está vacío.');

    const cliente = getClienteSeleccionado();
    const metodo = document.getElementById('metodoPagoVenta')?.value || 'Efectivo';
    const comentario = document.getElementById('comentarioVenta')?.value.trim() || '';
    const { subtotal, recargo, total } = calcularTotales();
    const esCreditoPlaza = metodo === 'Cuenta Plaza';

    if (esCreditoPlaza && (!cliente || cliente.tipo_cliente !== 'plaza')) {
      return alert('Selecciona un locatario de plaza para registrar mercancía a cuenta.');
    }
    if (esCreditoPlaza && !cliente.credito_habilitado) {
      return alert('Este locatario no tiene habilitada la cuenta de plaza.');
    }

    const resumen = `${carritoV3.reduce((s, i) => s + Number(i.cantidad || 0), 0)} artículo(s)\n` +
      `Subtotal: ${money(subtotal)}\n` +
      (recargoAplicado() ? `Recargo 5%: ${money(recargo)}\n` : (recargoGeneral5V3 ? 'Descuento: se retiró el recargo del 5%\n' : 'Recargo general 5%: desactivado\n')) +
      `TOTAL: ${money(total)}\n` +
      `Pago: ${metodo}` +
      (cliente ? `\nComprador: ${cliente.nombre}` : '') +
      (esCreditoPlaza ? '\n📒 Se agregará al saldo pendiente del locatario.' : '');

    if (!confirm(`CONFIRMAR VENTA\n\n${resumen}`)) return;

    const btn = document.getElementById('btnFinalizarVentaV2');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

    try {
      const factor = factorVenta();
      const items = carritoV3.map(i => {
        const precioCobrado = Number(i.precioUnitario || 0) * factor;
        return {
          ...i,
          precioLista: Number(i.precioUnitario || 0),
          precioUnitario: precioCobrado,
          precioPersonalizado: precioCobrado,
          precioBase: precioCobrado
        };
      });

      const descuentoAplicado = recargoGeneral5V3 && descuentoCincoVentaV3;

      await window.DB.registrarVenta({
        items,
        total,
        metodoPago: metodo,
        comentario,
        usuario: session().nombre || 'Usuario',
        clienteId: cliente?.id || null,
        clienteNombre: cliente?.nombre || null,
        tipoPrecio: tipoPrecioV3,
        esCreditoPlaza,
        fecha: new Date().toISOString(),
        descuentoAplicado,
        recargoCincoAplicado: recargoAplicado()
      });

      const ticket = {
        items,
        total,
        metodoPago: metodo,
        comentario,
        usuario: session().nombre || 'Usuario',
        descuentoAplicado,
        recargoCincoAplicado: recargoAplicado(),
        recargoCinco: recargo,
        subtotal,
        fecha: new Date().toISOString()
      };

      carritoV3 = [];
      descuentoCincoVentaV3 = false;
      window.renderCarritoVentas();
      const comentarioEl = document.getElementById('comentarioVenta');
      if (comentarioEl) comentarioEl.value = '';
      await window.cargarProductosVenta();

      alert(esCreditoPlaza
        ? `✅ Mercancía registrada a cuenta.\nCargo: ${money(total)}`
        : `✅ Venta registrada.\nTotal: ${money(total)}`);

      if (confirm('¿Imprimir ticket?')) window.imprimirTicketVenta?.(ticket);
    } catch (error) {
      console.error(error);
      alert('❌ No se pudo registrar la venta: ' + error.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✓ COBRAR / REGISTRAR — F4'; }
    }
  };

  window.inicializarEscannerV2 = () => {
    if (window.__scannerV3Handler) return;

    window.__scannerV3Handler = e => {
      if (window.getCurrentModule?.() !== 'ventas') return;

      const tag = String(e.target?.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      if (e.key === 'Enter' && scannerBufferV3) {
        const code = scannerBufferV3;
        scannerBufferV3 = '';
        clearTimeout(scannerTimerV3);
        window.procesarCodigoEscaneadoV2(code);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scannerBufferV3 += e.key;
        clearTimeout(scannerTimerV3);
        scannerTimerV3 = setTimeout(() => {
          const code = scannerBufferV3;
          scannerBufferV3 = '';
          if (code.length > 2) window.procesarCodigoEscaneadoV2(code);
        }, 80);
      }
    };

    document.addEventListener('keydown', window.__scannerV3Handler);
  };

  window.procesarCodigoEscaneadoV2 = code => {
    const q = String(code || '').replace(/[\r\n]/g, '').trim().toLowerCase();
    const p = productosVentaV3.find(x =>
      String(x.sku || '').toLowerCase() === q || String(x.codigo_barras || '').toLowerCase() === q
    );
    const result = document.getElementById('resultadoBusqueda');
    if (p) {
      if (result) result.textContent = `✅ ${p.nombre} agregado`;
      window.agregarAlCarrito(p.id);
    } else if (result) {
      result.textContent = `❌ Código no encontrado: ${code}`;
    }
  };

  console.log('✅ Ventas V3: venta rápida grande + teclado + recargo general 5%');
})();
