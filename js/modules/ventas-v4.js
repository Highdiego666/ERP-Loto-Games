// ============================================
// LOTO GAMES POS - VENTAS V4
// Flujo de caja rápido + teclado físico + descuento real 5%
// ============================================

(function () {
  'use strict';

  let productosVentaV4 = [];
  let clientesVentaV4 = [];
  let carritoV4 = [];
  let tipoPrecioV4 = 'cliente';
  let scannerBufferV4 = '';
  let scannerTimerV4 = null;
  let descuento5ActivoV4 = false;

  const round2 = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const money = value => Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });
  const session = () => window.AuthV2?.getSession() || window.usuarioActual || {};

  const getClienteSeleccionado = () => {
    const id = document.getElementById('clienteVentaV2')?.value;
    return clientesVentaV4.find(c => String(c.id) === String(id)) || null;
  };

  const precioListaProducto = producto => window.DB.getPrecioProducto(producto, tipoPrecioV4);
  const precioConDescuento = precio => descuento5ActivoV4 ? round2(Number(precio || 0) * 0.95) : round2(precio);

  function calcularTotales() {
    const subtotal = round2(carritoV4.reduce(
      (sum, item) => sum + Number(item.precioUnitario || 0) * Number(item.cantidad || 0),
      0
    ));
    const descuento = descuento5ActivoV4 ? round2(subtotal * 0.05) : 0;
    const total = round2(subtotal - descuento);
    return { subtotal, descuento, total };
  }

  window.ventasModule = () => `
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:16px;align-items:start;">
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
            F2 buscar · F3 venta rápida · F4 cobrar · F6 descuento 5%
          </div>
        </div>

        <div id="listaProductosGrid"
          style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;max-height:calc(100vh - 215px);overflow:auto;padding:2px 4px 20px 2px;">
          <div style="grid-column:1/-1;text-align:center;padding:30px;">Cargando productos...</div>
        </div>
      </section>

      <aside class="table-container" style="padding:14px;position:sticky;top:0;max-height:calc(100vh - 105px);overflow:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <h3 style="margin:0;">🛒 Venta</h3>
            <small style="color:var(--text-muted);">Operación de caja</small>
          </div>
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

        <button id="btnDescuento" class="btn" onclick="window.toggleDescuento()"
          style="width:100%;margin:5px 0 10px;padding:11px 12px;background:var(--bg-dark);border:1px solid var(--border);font-weight:800;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <span>🏷️ Descuento 5%</span>
          <span id="estadoDescuento5V4" style="font-size:11px;padding:4px 8px;border-radius:999px;background:var(--border);">F6 · INACTIVO</span>
        </button>

        <div id="carritoVentas" style="border-top:1px solid var(--border);border-bottom:1px solid var(--border);min-height:135px;max-height:260px;overflow:auto;margin:8px 0;padding:4px 0;"></div>

        <div style="margin:10px 0;padding:11px;border-radius:12px;background:var(--bg-dark);">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);">
            <span>Subtotal</span><span id="subtotalCarritoV4">$0.00</span>
          </div>
          <div id="filaDescuento5V4" style="display:none;justify-content:space-between;font-size:13px;color:var(--success);margin-top:4px;font-weight:700;">
            <span>Descuento 5%</span><span id="descuentoCarritoV4">-$0.00</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:end;margin-top:8px;">
            <span style="font-size:13px;color:var(--text-muted);"><span id="cantidadCarritoV2">0</span> artículos</span>
            <div style="text-align:right;">
              <small style="color:var(--text-muted);">TOTAL</small>
              <div id="totalCarrito" style="font-size:31px;font-weight:800;color:var(--success);">$0.00</div>
            </div>
          </div>
        </div>

        <div id="ventaRapidaPanelV4" style="margin:10px 0;padding:15px;border:2px solid rgba(16,185,129,.45);background:rgba(16,185,129,.08);border-radius:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div>
              <strong style="font-size:17px;">⚡ Venta rápida</strong><br>
              <small style="color:var(--text-muted);">F3 · concepto → Enter → monto → Enter</small>
            </div>
            <span style="font-size:11px;padding:5px 9px;border-radius:999px;background:#10b981;color:white;font-weight:800;">F3</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:9px;">
            <input id="ventaRapidaConcepto" class="form-control" autocomplete="off"
              placeholder="Concepto de la venta rápida"
              style="font-size:16px;padding:14px;"
              onkeydown="window.teclaVentaRapidaConceptoV4(event)">
            <div style="display:grid;grid-template-columns:minmax(0,1fr) 125px;gap:9px;">
              <input id="ventaRapidaMonto" type="number" min="0.01" step="0.01" class="form-control"
                placeholder="Monto $"
                style="font-size:19px;padding:14px;font-weight:700;"
                onkeydown="window.teclaVentaRapidaMontoV4(event)">
              <button class="btn btn-success" onclick="window.agregarVentaRapida()" style="font-size:14px;font-weight:800;">+ AGREGAR</button>
            </div>
          </div>
        </div>

        <textarea id="comentarioVenta" class="form-control" rows="2" placeholder="Comentario opcional" style="margin:8px 0;"></textarea>

        <button id="btnFinalizarVentaV2" class="btn btn-primary" onclick="window.finalizarVenta()"
          style="width:100%;padding:15px;font-size:17px;font-weight:800;">
          ✓ COBRAR / REGISTRAR — F4
        </button>
        <button class="btn" onclick="window.limpiarCarrito()" style="width:100%;margin-top:7px;background:var(--bg-dark);">Vaciar carrito</button>
      </aside>
    </div>
  `;

  function actualizarDescuentoV4() {
    const button = document.getElementById('btnDescuento');
    const badge = document.getElementById('estadoDescuento5V4');
    if (!button || !badge) return;

    if (descuento5ActivoV4) {
      button.style.background = 'rgba(16,185,129,.14)';
      button.style.borderColor = 'var(--success)';
      badge.textContent = 'F6 · ACTIVO';
      badge.style.background = 'var(--success)';
      badge.style.color = 'white';
    } else {
      button.style.background = 'var(--bg-dark)';
      button.style.borderColor = 'var(--border)';
      badge.textContent = 'F6 · INACTIVO';
      badge.style.background = 'var(--border)';
      badge.style.color = 'inherit';
    }
  }

  function renderProductos(list) {
    const container = document.getElementById('listaProductosGrid');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:35px;color:var(--text-muted);">Sin productos disponibles</div>';
      return;
    }

    container.innerHTML = list.map(producto => {
      const stock = Number(producto.stock || 0);
      const base = round2(precioListaProducto(producto));
      const final = precioConDescuento(base);
      return `<button type="button" onclick="window.agregarAlCarrito(${producto.id})"
        style="text-align:left;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;color:var(--text);cursor:pointer;min-height:116px;transition:.15s;"
        onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="font-weight:700;line-height:1.2;margin-bottom:7px;">${producto.nombre}</div>
        <div style="font-size:20px;color:var(--success);font-weight:800;">${money(final)}</div>
        ${descuento5ActivoV4 ? `<small style="display:block;color:var(--text-muted);text-decoration:line-through;">${money(base)}</small>` : ''}
        <small style="display:block;color:var(--text-muted);margin-top:4px;">${producto.sku || ''}</small>
        <small style="color:${stock < 5 ? '#f59e0b' : 'var(--text-muted)'};">Stock: ${stock}</small>
      </button>`;
    }).join('');
  }

  window.cargarProductosVenta = async () => {
    [productosVentaV4, clientesVentaV4] = await Promise.all([
      window.DB.getProductos(),
      window.DB.getClientes()
    ]);

    productosVentaV4 = productosVentaV4.filter(producto => Number(producto.stock || 0) > 0);

    const comprador = document.getElementById('clienteVentaV2');
    if (comprador) {
      comprador.innerHTML = '<option value="">Público general</option>' + clientesVentaV4.map(cliente => {
        const label = { cliente: 'Cliente', mayorista: 'Mayorista', plaza: 'Plaza' }[cliente.tipo_cliente] || 'Cliente';
        return `<option value="${cliente.id}">${cliente.nombre} — ${label}</option>`;
      }).join('');
    }

    const vendedor = document.getElementById('vendedorVentaV2');
    if (vendedor) vendedor.textContent = `👤 ${session().nombre || 'Usuario'}`;

    renderProductos(productosVentaV4);
    window.renderCarritoVentas();
    window.inicializarEscannerV2();
    setTimeout(() => document.getElementById('buscadorProducto')?.focus(), 50);
  };

  window.filtrarProductosVentaV2 = () => {
    const q = (document.getElementById('buscadorProducto')?.value || '').trim().toLowerCase();
    const list = !q ? productosVentaV4 : productosVentaV4.filter(producto =>
      String(producto.nombre || '').toLowerCase().includes(q) ||
      String(producto.sku || '').toLowerCase().includes(q) ||
      String(producto.codigo_barras || '').toLowerCase().includes(q)
    );
    renderProductos(list);
    const result = document.getElementById('resultadoBusqueda');
    if (result) result.textContent = q
      ? `${list.length} coincidencia(s)`
      : 'F2 buscar · F3 venta rápida · F4 cobrar · F6 descuento 5%';
  };

  window.teclaBusquedaVentaV2 = event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const q = event.target.value.trim().toLowerCase();
    if (!q) return;

    const exact = productosVentaV4.find(producto =>
      String(producto.sku || '').toLowerCase() === q ||
      String(producto.codigo_barras || '').toLowerCase() === q
    );
    const matches = productosVentaV4.filter(producto =>
      String(producto.nombre || '').toLowerCase().includes(q)
    );

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

  window.teclaVentaRapidaConceptoV4 = event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const monto = document.getElementById('ventaRapidaMonto');
    if (monto) { monto.focus(); monto.select(); }
  };

  window.teclaVentaRapidaMontoV4 = event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    window.agregarVentaRapida();
  };

  window.cambiarClienteVentaV2 = () => {
    const cliente = getClienteSeleccionado();
    const tipo = cliente?.tipo_cliente === 'mayorista'
      ? 'mayorista'
      : cliente?.tipo_cliente === 'plaza'
        ? 'plaza'
        : 'cliente';

    const select = document.getElementById('tipoPrecioVentaV2');
    if (select) select.value = tipo;
    window.cambiarTipoPrecioVentaV2(tipo);
  };

  window.cambiarTipoPrecioVentaV2 = tipo => {
    tipoPrecioV4 = ['cliente', 'mayorista', 'plaza'].includes(tipo) ? tipo : 'cliente';
    carritoV4.forEach(item => {
      if (item.tipo !== 'producto' || item.precioEditado) return;
      const producto = productosVentaV4.find(p => String(p.id) === String(item.id));
      if (producto) item.precioUnitario = round2(window.DB.getPrecioProducto(producto, tipoPrecioV4));
    });
    window.filtrarProductosVentaV2();
    window.renderCarritoVentas();
  };

  window.agregarAlCarrito = async id => {
    const producto = productosVentaV4.find(p => String(p.id) === String(id)) || await window.DB.getProductoById(id);
    if (!producto || Number(producto.stock || 0) <= 0) return alert('Producto sin stock.');

    const existing = carritoV4.find(item => item.tipo === 'producto' && String(item.id) === String(id));
    if (existing) {
      if (existing.cantidad + 1 > Number(producto.stock)) {
        return alert(`Solo hay ${producto.stock} unidades disponibles.`);
      }
      existing.cantidad += 1;
    } else {
      const precio = round2(window.DB.getPrecioProducto(producto, tipoPrecioV4));
      carritoV4.push({
        id: producto.id,
        nombre: producto.nombre,
        sku: producto.sku,
        cantidad: 1,
        tipo: 'producto',
        precioUnitario: precio,
        precioPersonalizado: precio,
        precioBase: precio,
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
    const monto = round2(montoEl?.value);

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

    carritoV4.push({
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

    if (!carritoV4.length) {
      container.innerHTML = '<div style="text-align:center;padding:30px 10px;color:var(--text-muted);">Carrito vacío<br><small>Haz clic, escanea o usa F3 para venta rápida.</small></div>';
    } else {
      container.innerHTML = carritoV4.map((item, index) => {
        const unitarioBase = round2(item.precioUnitario);
        const unitarioMostrado = precioConDescuento(unitarioBase);
        const subtotalMostrado = round2(unitarioMostrado * Number(item.cantidad));

        return `<div style="padding:9px 2px;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <strong style="font-size:13px;">${item.nombre}${item.precioEditado ? ' ✏️' : ''}</strong>
            <button onclick="window.eliminarDelCarrito(${index})" style="border:0;background:transparent;color:#ef4444;cursor:pointer;">✕</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:6px;">
            <div>${item.tipo === 'producto'
              ? `<button onclick="window.modificarCantidad(${index},-1)" class="btn" style="padding:3px 8px;">−</button> <strong>${item.cantidad}</strong> <button onclick="window.modificarCantidad(${index},1)" class="btn" style="padding:3px 8px;">+</button>`
              : '<strong>1</strong>'}</div>
            <button onclick="window.editarPrecioCarrito(${index})" style="border:0;background:transparent;color:var(--primary);cursor:pointer;" title="Editar precio">${money(unitarioMostrado)}</button>
            <strong>${money(subtotalMostrado)}</strong>
          </div>
        </div>`;
      }).join('');
    }

    const { subtotal, descuento, total } = calcularTotales();
    const qty = carritoV4.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);

    if (document.getElementById('subtotalCarritoV4')) document.getElementById('subtotalCarritoV4').textContent = money(subtotal);
    if (document.getElementById('descuentoCarritoV4')) document.getElementById('descuentoCarritoV4').textContent = `-${money(descuento)}`;
    if (document.getElementById('filaDescuento5V4')) document.getElementById('filaDescuento5V4').style.display = descuento5ActivoV4 ? 'flex' : 'none';
    if (document.getElementById('totalCarrito')) document.getElementById('totalCarrito').textContent = money(total);
    if (document.getElementById('cantidadCarritoV2')) document.getElementById('cantidadCarritoV2').textContent = qty;

    window._totalesCarrito = {
      subtotal,
      descuento5: descuento,
      totalFinal: total,
      descuentoAplicado: descuento5ActivoV4
    };

    actualizarDescuentoV4();
  };

  window.modificarCantidad = async (index, delta) => {
    const item = carritoV4[index];
    if (!item) return;

    if (item.tipo === 'rapida') {
      if (delta < 0) carritoV4.splice(index, 1);
      window.renderCarritoVentas();
      return;
    }

    const producto = await window.DB.getProductoById(item.id);
    const next = item.cantidad + delta;
    if (next <= 0) carritoV4.splice(index, 1);
    else if (producto && next <= Number(producto.stock)) item.cantidad = next;
    else return alert(`Stock insuficiente. Disponible: ${producto?.stock || 0}`);
    window.renderCarritoVentas();
  };

  window.editarPrecioCarrito = index => {
    const item = carritoV4[index];
    if (!item) return;
    const value = prompt(`Precio unitario para ${item.nombre}:`, Number(item.precioUnitario).toFixed(2));
    if (value === null) return;
    const nuevo = round2(value);
    if (!Number.isFinite(nuevo) || nuevo < 0) return alert('Precio inválido.');
    item.precioUnitario = nuevo;
    item.precioPersonalizado = nuevo;
    item.precioBase = nuevo;
    item.precioEditado = true;
    window.renderCarritoVentas();
  };

  window.eliminarDelCarrito = index => {
    carritoV4.splice(index, 1);
    window.renderCarritoVentas();
  };

  window.limpiarCarrito = () => {
    if (carritoV4.length && !confirm('¿Vaciar carrito?')) return;
    carritoV4 = [];
    descuento5ActivoV4 = false;
    window.renderCarritoVentas();
  };

  window.toggleDescuento = () => {
    descuento5ActivoV4 = !descuento5ActivoV4;
    window.filtrarProductosVentaV2();
    window.renderCarritoVentas();
  };

  window.finalizarVenta = async () => {
    if (!carritoV4.length) return alert('El carrito está vacío.');

    const cliente = getClienteSeleccionado();
    const metodo = document.getElementById('metodoPagoVenta')?.value || 'Efectivo';
    const comentario = document.getElementById('comentarioVenta')?.value.trim() || '';
    const { subtotal, descuento, total } = calcularTotales();
    const esCreditoPlaza = metodo === 'Cuenta Plaza';

    if (esCreditoPlaza && (!cliente || cliente.tipo_cliente !== 'plaza')) {
      return alert('Selecciona un locatario de plaza para registrar mercancía a cuenta.');
    }
    if (esCreditoPlaza && !cliente.credito_habilitado) {
      return alert('Este locatario no tiene habilitada la cuenta de plaza.');
    }

    const resumen = `${carritoV4.reduce((sum, item) => sum + Number(item.cantidad || 0), 0)} artículo(s)\n` +
      `Subtotal: ${money(subtotal)}\n` +
      (descuento5ActivoV4 ? `Descuento 5%: -${money(descuento)}\n` : '') +
      `TOTAL: ${money(total)}\n` +
      `Pago: ${metodo}` +
      (cliente ? `\nComprador: ${cliente.nombre}` : '') +
      (esCreditoPlaza ? '\n📒 Se agregará al saldo pendiente del locatario.' : '');

    if (!confirm(`CONFIRMAR VENTA\n\n${resumen}`)) return;

    const btn = document.getElementById('btnFinalizarVentaV2');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

    try {
      const items = carritoV4.map(item => ({
        ...item,
        precioLista: round2(item.precioUnitario),
        precioUnitario: precioConDescuento(item.precioUnitario),
        precioPersonalizado: precioConDescuento(item.precioUnitario),
        precioBase: round2(item.precioUnitario)
      }));

      const fecha = new Date().toISOString();
      const venta = {
        items,
        subtotal,
        descuentoMonto: descuento,
        descuentoPorcentaje: descuento5ActivoV4 ? 5 : 0,
        total,
        metodoPago: metodo,
        comentario,
        usuario: session().nombre || 'Usuario',
        clienteId: cliente?.id || null,
        clienteNombre: cliente?.nombre || null,
        tipoPrecio: tipoPrecioV4,
        esCreditoPlaza,
        fecha,
        descuentoAplicado: descuento5ActivoV4
      };

      await window.DB.registrarVenta(venta);

      const ticket = {
        ...venta,
        descuentoAplicado: descuento5ActivoV4,
        descuentoMonto: descuento,
        subtotal
      };

      carritoV4 = [];
      descuento5ActivoV4 = false;
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
    if (window.__scannerV4Handler) return;

    window.__scannerV4Handler = event => {
      if (window.getCurrentModule?.() !== 'ventas') return;
      const tag = String(event.target?.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      if (event.key === 'Enter' && scannerBufferV4) {
        const code = scannerBufferV4;
        scannerBufferV4 = '';
        clearTimeout(scannerTimerV4);
        window.procesarCodigoEscaneadoV2(code);
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        scannerBufferV4 += event.key;
        clearTimeout(scannerTimerV4);
        scannerTimerV4 = setTimeout(() => {
          const code = scannerBufferV4;
          scannerBufferV4 = '';
          if (code.length > 2) window.procesarCodigoEscaneadoV2(code);
        }, 80);
      }
    };

    document.addEventListener('keydown', window.__scannerV4Handler);
  };

  window.procesarCodigoEscaneadoV2 = code => {
    const q = String(code || '').replace(/[\r\n]/g, '').trim().toLowerCase();
    const producto = productosVentaV4.find(p =>
      String(p.sku || '').toLowerCase() === q ||
      String(p.codigo_barras || '').toLowerCase() === q
    );
    const result = document.getElementById('resultadoBusqueda');

    if (producto) {
      if (result) result.textContent = `✅ ${producto.nombre} agregado`;
      window.agregarAlCarrito(producto.id);
    } else if (result) {
      result.textContent = `❌ Código no encontrado: ${code}`;
    }
  };

  console.log('✅ Ventas V4: venta rápida grande + teclado + descuento real 5%');
})();
