// ============================================
// LOTO GAMES POS - VENTAS V2
// Producto primero + carrito lateral + 3 precios + cuenta de plaza
// ============================================

(function () {
  'use strict';

  let productosVentaV2 = [];
  let clientesVentaV2 = [];
  let carritoV2 = [];
  let tipoPrecioV2 = 'cliente';
  let scannerBufferV2 = '';
  let scannerTimerV2 = null;

  const money = v => Number(v || 0).toLocaleString('es-MX', { style:'currency', currency:'MXN' });
  const session = () => window.AuthV2?.getSession() || window.usuarioActual || {};
  const getClienteSeleccionado = () => {
    const id = document.getElementById('clienteVentaV2')?.value;
    return clientesVentaV2.find(c => String(c.id) === String(id)) || null;
  };
  const precioProducto = p => window.DB.getPrecioProducto(p, tipoPrecioV2);

  window.ventasModule = () => `
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:16px;align-items:start;">
      <section style="min-width:0;">
        <div class="table-container" style="padding:14px;position:sticky;top:0;z-index:10;margin-bottom:12px;">
          <div style="display:flex;gap:8px;align-items:center;">
            <div style="position:relative;flex:1;">
              <input id="buscadorProducto" class="form-control" autocomplete="off" placeholder="🔍 Escanea o escribe nombre, SKU o código — F2" style="font-size:16px;padding:13px 14px;" oninput="window.filtrarProductosVentaV2()" onkeydown="window.teclaBusquedaVentaV2(event)">
            </div>
            <button class="btn btn-primary" onclick="window.focusVentaSearch()">Buscar</button>
          </div>
          <div id="resultadoBusqueda" style="min-height:20px;margin-top:6px;font-size:12px;color:var(--text-muted);">Listo para escáner o teclado.</div>
        </div>

        <div id="listaProductosGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;max-height:calc(100vh - 215px);overflow:auto;padding:2px 4px 20px 2px;">
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
          <select id="clienteVentaV2" class="form-control" onchange="window.cambiarClienteVentaV2()"><option value="">Público general</option></select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div><label style="font-size:12px;">Lista de precio</label><select id="tipoPrecioVentaV2" class="form-control" onchange="window.cambiarTipoPrecioVentaV2(this.value)"><option value="cliente">Cliente</option><option value="mayorista">Mayorista</option><option value="plaza">Plaza</option></select></div>
          <div><label style="font-size:12px;">Pago</label><select id="metodoPagoVenta" class="form-control"><option value="Efectivo">Efectivo</option><option value="Tarjeta">Tarjeta</option><option value="Transferencia">Transferencia</option><option value="Cuenta Plaza">Cuenta Plaza</option></select></div>
        </div>

        <div id="carritoVentas" style="border-top:1px solid var(--border);border-bottom:1px solid var(--border);min-height:150px;max-height:315px;overflow:auto;margin:8px 0;padding:4px 0;"></div>

        <div style="display:flex;justify-content:space-between;align-items:end;margin:10px 0;">
          <span style="font-size:13px;color:var(--text-muted);"><span id="cantidadCarritoV2">0</span> artículos</span>
          <div style="text-align:right;"><small style="color:var(--text-muted);">TOTAL</small><div id="totalCarrito" style="font-size:28px;font-weight:800;color:var(--success);">$0.00</div></div>
        </div>

        <details style="margin:8px 0;padding:8px;background:var(--bg-dark);border-radius:10px;">
          <summary style="cursor:pointer;font-weight:600;">⚡ Venta rápida / concepto libre</summary>
          <div style="display:grid;grid-template-columns:1fr 100px 42px;gap:6px;margin-top:8px;">
            <input id="ventaRapidaConcepto" class="form-control" placeholder="Concepto">
            <input id="ventaRapidaMonto" type="number" min="0.01" step="0.01" class="form-control" placeholder="$">
            <button class="btn btn-success" onclick="window.agregarVentaRapida()">+</button>
          </div>
        </details>

        <textarea id="comentarioVenta" class="form-control" rows="2" placeholder="Comentario opcional" style="margin:8px 0;"></textarea>
        <button id="btnFinalizarVentaV2" class="btn btn-primary" onclick="window.finalizarVenta()" style="width:100%;padding:14px;font-size:16px;font-weight:800;">✓ COBRAR / REGISTRAR — F4</button>
        <button class="btn" onclick="window.limpiarCarrito()" style="width:100%;margin-top:7px;background:var(--bg-dark);">Vaciar carrito</button>
      </aside>
    </div>
  `;

  function renderProductos(list) {
    const container = document.getElementById('listaProductosGrid');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:35px;color:var(--text-muted);">Sin productos disponibles</div>';
      return;
    }
    container.innerHTML = list.map(p => {
      const stock = Number(p.stock || 0);
      return `<button type="button" onclick="window.agregarAlCarrito(${p.id})" style="text-align:left;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;color:var(--text);cursor:pointer;min-height:108px;transition:.15s;" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="font-weight:700;line-height:1.2;margin-bottom:7px;">${p.nombre}</div>
        <div style="font-size:20px;color:var(--success);font-weight:800;">${money(precioProducto(p))}</div>
        <small style="display:block;color:var(--text-muted);margin-top:4px;">${p.sku || ''}</small>
        <small style="color:${stock<5?'#f59e0b':'var(--text-muted)'};">Stock: ${stock}</small>
      </button>`;
    }).join('');
  }

  window.cargarProductosVenta = async () => {
    [productosVentaV2, clientesVentaV2] = await Promise.all([window.DB.getProductos(), window.DB.getClientes()]);
    productosVentaV2 = productosVentaV2.filter(p => Number(p.stock || 0) > 0);
    const sel = document.getElementById('clienteVentaV2');
    if (sel) sel.innerHTML = '<option value="">Público general</option>' + clientesVentaV2.map(c => `<option value="${c.id}">${c.nombre} — ${{cliente:'Cliente',mayorista:'Mayorista',plaza:'Plaza'}[c.tipo_cliente]||'Cliente'}</option>`).join('');
    const seller = document.getElementById('vendedorVentaV2');
    if (seller) seller.textContent = `👤 ${session().nombre || 'Usuario'}`;
    renderProductos(productosVentaV2);
    window.renderCarritoVentas();
    window.inicializarEscannerV2();
    setTimeout(() => document.getElementById('buscadorProducto')?.focus(), 50);
  };

  window.filtrarProductosVentaV2 = () => {
    const q = (document.getElementById('buscadorProducto')?.value || '').trim().toLowerCase();
    const list = !q ? productosVentaV2 : productosVentaV2.filter(p =>
      String(p.nombre||'').toLowerCase().includes(q) || String(p.sku||'').toLowerCase().includes(q) || String(p.codigo_barras||'').toLowerCase().includes(q)
    );
    renderProductos(list);
    const result = document.getElementById('resultadoBusqueda');
    if (result) result.textContent = q ? `${list.length} coincidencia(s)` : 'Listo para escáner o teclado.';
  };

  window.teclaBusquedaVentaV2 = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    const exact = productosVentaV2.find(p => String(p.sku||'').toLowerCase() === q || String(p.codigo_barras||'').toLowerCase() === q);
    const matches = productosVentaV2.filter(p => String(p.nombre||'').toLowerCase().includes(q));
    if (exact) window.agregarAlCarrito(exact.id);
    else if (matches.length === 1) window.agregarAlCarrito(matches[0].id);
  };

  window.focusVentaSearch = () => {
    const input = document.getElementById('buscadorProducto');
    if (input) { input.focus(); input.select(); }
  };

  window.cambiarClienteVentaV2 = () => {
    const c = getClienteSeleccionado();
    const tipo = c?.tipo_cliente === 'mayorista' ? 'mayorista' : c?.tipo_cliente === 'plaza' ? 'plaza' : 'cliente';
    document.getElementById('tipoPrecioVentaV2').value = tipo;
    window.cambiarTipoPrecioVentaV2(tipo);
  };

  window.cambiarTipoPrecioVentaV2 = tipo => {
    tipoPrecioV2 = ['cliente','mayorista','plaza'].includes(tipo) ? tipo : 'cliente';
    carritoV2.forEach(item => {
      if (item.tipo !== 'producto' || item.precioEditado) return;
      const p = productosVentaV2.find(x => String(x.id) === String(item.id));
      if (p) item.precioUnitario = window.DB.getPrecioProducto(p, tipoPrecioV2);
    });
    window.filtrarProductosVentaV2();
    window.renderCarritoVentas();
  };

  window.agregarAlCarrito = async id => {
    const p = productosVentaV2.find(x => String(x.id) === String(id)) || await window.DB.getProductoById(id);
    if (!p || Number(p.stock || 0) <= 0) return alert('Producto sin stock.');
    const existing = carritoV2.find(i => i.tipo === 'producto' && String(i.id) === String(id));
    if (existing) {
      if (existing.cantidad + 1 > Number(p.stock)) return alert(`Solo hay ${p.stock} unidades disponibles.`);
      existing.cantidad += 1;
    } else {
      const price = window.DB.getPrecioProducto(p, tipoPrecioV2);
      carritoV2.push({ id:p.id, nombre:p.nombre, sku:p.sku, cantidad:1, tipo:'producto', precioUnitario:price, precioPersonalizado:price, precioBase:price, precioEditado:false });
    }
    window.renderCarritoVentas();
    const input = document.getElementById('buscadorProducto');
    if (input) input.value = '';
    window.filtrarProductosVentaV2();
    input?.focus();
  };

  window.agregarVentaRapida = () => {
    const nombre = document.getElementById('ventaRapidaConcepto')?.value.trim();
    const monto = Number(document.getElementById('ventaRapidaMonto')?.value);
    if (!nombre || !Number.isFinite(monto) || monto <= 0) return alert('Ingresa concepto y monto válidos.');
    carritoV2.push({ id:`R-${Date.now()}`, nombre, sku:'RAPIDA', cantidad:1, tipo:'rapida', precioUnitario:monto, precioPersonalizado:monto, precioBase:monto, precioEditado:true });
    document.getElementById('ventaRapidaConcepto').value = '';
    document.getElementById('ventaRapidaMonto').value = '';
    window.renderCarritoVentas();
  };

  window.renderCarritoVentas = () => {
    const container = document.getElementById('carritoVentas');
    if (!container) return;
    if (!carritoV2.length) container.innerHTML = '<div style="text-align:center;padding:35px 10px;color:var(--text-muted);">Carrito vacío<br><small>Haz clic en un producto o escanea su código.</small></div>';
    else container.innerHTML = carritoV2.map((i,index) => `<div style="padding:9px 2px;border-bottom:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;gap:8px;"><strong style="font-size:13px;">${i.nombre}${i.precioEditado?' ✏️':''}</strong><button onclick="window.eliminarDelCarrito(${index})" style="border:0;background:transparent;color:#ef4444;cursor:pointer;">✕</button></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:6px;">
        <div>${i.tipo==='producto'?`<button onclick="window.modificarCantidad(${index},-1)" class="btn" style="padding:3px 8px;">−</button> <strong>${i.cantidad}</strong> <button onclick="window.modificarCantidad(${index},1)" class="btn" style="padding:3px 8px;">+</button>`:`<strong>1</strong>`}</div>
        <button onclick="window.editarPrecioCarrito(${index})" style="border:0;background:transparent;color:var(--primary);cursor:pointer;" title="Editar precio">${money(i.precioUnitario)}</button>
        <strong>${money(i.precioUnitario*i.cantidad)}</strong>
      </div>
    </div>`).join('');
    const total = carritoV2.reduce((s,i)=>s+Number(i.precioUnitario)*Number(i.cantidad),0);
    const qty = carritoV2.reduce((s,i)=>s+Number(i.cantidad),0);
    if (document.getElementById('totalCarrito')) document.getElementById('totalCarrito').textContent = money(total);
    if (document.getElementById('cantidadCarritoV2')) document.getElementById('cantidadCarritoV2').textContent = qty;
    window._totalesCarrito = { totalBase:total, totalConRecargo:total };
  };

  window.modificarCantidad = async (index, delta) => {
    const i = carritoV2[index]; if (!i) return;
    if (i.tipo === 'rapida') { if (delta < 0) carritoV2.splice(index,1); return window.renderCarritoVentas(); }
    const p = await window.DB.getProductoById(i.id);
    const next = i.cantidad + delta;
    if (next <= 0) carritoV2.splice(index,1);
    else if (p && next <= Number(p.stock)) i.cantidad = next;
    else return alert(`Stock insuficiente. Disponible: ${p?.stock || 0}`);
    window.renderCarritoVentas();
  };

  window.editarPrecioCarrito = index => {
    const i = carritoV2[index]; if (!i) return;
    const value = prompt(`Precio unitario para ${i.nombre}:`, Number(i.precioUnitario).toFixed(2));
    if (value === null) return;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return alert('Precio inválido.');
    i.precioUnitario = n; i.precioPersonalizado = n; i.precioBase = n; i.precioEditado = true;
    window.renderCarritoVentas();
  };

  window.eliminarDelCarrito = index => { carritoV2.splice(index,1); window.renderCarritoVentas(); };
  window.limpiarCarrito = () => { if (carritoV2.length && !confirm('¿Vaciar carrito?')) return; carritoV2=[]; window.renderCarritoVentas(); };

  window.finalizarVenta = async () => {
    if (!carritoV2.length) return alert('El carrito está vacío.');
    const cliente = getClienteSeleccionado();
    const metodo = document.getElementById('metodoPagoVenta').value;
    const comentario = document.getElementById('comentarioVenta').value.trim();
    const total = carritoV2.reduce((s,i)=>s+Number(i.precioUnitario)*Number(i.cantidad),0);
    const esCreditoPlaza = metodo === 'Cuenta Plaza';
    if (esCreditoPlaza && (!cliente || cliente.tipo_cliente !== 'plaza')) return alert('Selecciona un locatario de plaza para registrar mercancía a cuenta.');
    if (esCreditoPlaza && !cliente.credito_habilitado) return alert('Este locatario no tiene habilitada la cuenta de plaza.');

    const resumen = `${carritoV2.reduce((s,i)=>s+i.cantidad,0)} artículo(s)\nTotal: ${money(total)}\nPago: ${metodo}${cliente?`\nComprador: ${cliente.nombre}`:''}${esCreditoPlaza?'\n📒 Se agregará al saldo pendiente del locatario.':''}`;
    if (!confirm(`CONFIRMAR VENTA\n\n${resumen}`)) return;

    const btn = document.getElementById('btnFinalizarVentaV2');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }
    try {
      const items = carritoV2.map(i => ({ ...i, precioPersonalizado:i.precioUnitario, precioBase:i.precioUnitario }));
      await window.DB.registrarVenta({
        items, total, metodoPago:metodo, comentario,
        usuario:session().nombre || 'Usuario',
        clienteId:cliente?.id || null, clienteNombre:cliente?.nombre || null,
        tipoPrecio:tipoPrecioV2, esCreditoPlaza, fecha:new Date().toISOString(), descuentoAplicado:false
      });

      const ticket = { items, total, metodoPago:metodo, comentario, usuario:session().nombre || 'Usuario', descuentoAplicado:false, fecha:new Date().toISOString() };
      carritoV2 = [];
      window.renderCarritoVentas();
      document.getElementById('comentarioVenta').value = '';
      await window.cargarProductosVenta();
      alert(esCreditoPlaza ? `✅ Mercancía registrada a cuenta.\nCargo: ${money(total)}` : `✅ Venta registrada.\nTotal: ${money(total)}`);
      if (confirm('¿Imprimir ticket?')) window.imprimirTicketVenta?.(ticket);
    } catch (error) {
      console.error(error);
      alert('❌ No se pudo registrar la venta: ' + error.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✓ COBRAR / REGISTRAR — F4'; }
    }
  };

  window.inicializarEscannerV2 = () => {
    if (window.__scannerV2Handler) return;
    window.__scannerV2Handler = e => {
      if (window.getCurrentModule?.() !== 'ventas') return;
      const tag = String(e.target?.tagName || '').toLowerCase();
      if (['input','textarea','select'].includes(tag)) return;
      if (e.key === 'Enter' && scannerBufferV2) {
        const code = scannerBufferV2; scannerBufferV2 = ''; clearTimeout(scannerTimerV2);
        window.procesarCodigoEscaneadoV2(code); return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scannerBufferV2 += e.key;
        clearTimeout(scannerTimerV2);
        scannerTimerV2 = setTimeout(() => {
          const code = scannerBufferV2; scannerBufferV2 = '';
          if (code.length > 2) window.procesarCodigoEscaneadoV2(code);
        },80);
      }
    };
    document.addEventListener('keydown',window.__scannerV2Handler);
  };

  window.procesarCodigoEscaneadoV2 = code => {
    const q = String(code||'').replace(/[\r\n]/g,'').trim().toLowerCase();
    const p = productosVentaV2.find(x => String(x.sku||'').toLowerCase()===q || String(x.codigo_barras||'').toLowerCase()===q);
    const result = document.getElementById('resultadoBusqueda');
    if (p) { if (result) result.textContent = `✅ ${p.nombre} agregado`; window.agregarAlCarrito(p.id); }
    else if (result) result.textContent = `❌ Código no encontrado: ${code}`;
  };

  console.log('✅ Ventas V2 activo: flujo rápido + listas de precio + cuenta de plaza');
})();
