// ============================================
// LOTO GAMES POS - MÓDULO DE VENTAS
// CON USUARIO, DESCUENTO, Y TICKET COMPLETO
// ============================================

let carritoVentas = [];
let descuentoActivo = false;

window.ventasModule = () => {
  return `
    <div style="display: grid; grid-template-columns: 1fr 400px; gap: 24px;">
      <!-- Panel izquierdo -->
      <div>
        <div class="table-container">
          <h3 style="margin-bottom: 20px;">🔍 Buscar Producto</h3>
          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <input type="text" id="buscadorProducto" class="form-control" placeholder="SKU, código de barras o nombre...">
            <button class="btn btn-primary" onclick="window.buscarProductoVenta()">
              <i class="fas fa-search"></i> Buscar
            </button>
          </div>
          <div id="resultadoBusqueda" style="min-height: 100px;"></div>
        </div>
        
        <div class="table-container" style="margin-top: 24px;">
          <h3 style="margin-bottom: 20px;">📦 Productos Disponibles</h3>
          <div id="listaProductosGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto;">
            <p style="text-align: center; grid-column: 1/-1;">Cargando productos...</p>
          </div>
        </div>
      </div>
      
      <!-- Panel derecho - Carrito -->
      <div>
        <div class="table-container">
          <h3 style="margin-bottom: 20px;">🛒 Carrito de Venta</h3>
          
          <!-- Selector de usuario (vendedor) -->
          <div style="margin-bottom: 15px;">
            <label style="font-size: 12px; color: var(--text-muted);">👤 Vendedor</label>
            <select id="usuarioVenta" class="form-control">
              <option value="">Cargando usuarios...</option>
            </select>
          </div>
          
          <div id="carritoVentas" style="min-height: 200px; max-height: 300px; overflow-y: auto;">
            <p style="text-align: center; color: var(--text-muted);">Carrito vacío</p>
          </div>
          
          <hr style="margin: 15px 0;">
          
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
              <span>TOTAL:</span>
              <span id="totalCarrito" style="color: var(--success);">$0</span>
            </div>
          </div>
          
          <!-- Botón de descuento -->
          <div style="margin-bottom: 15px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span><strong>🎯 Descuento 5%</strong></span>
            <button id="btnDescuento" class="btn" style="background: var(--gray); color: white; padding: 8px 16px;" onclick="window.toggleDescuento()">
              Activar
            </button>
          </div>
          
          <div style="margin-bottom: 15px;">
            <label>💳 Método de Pago:</label>
            <select id="metodoPagoVenta" class="form-control" style="margin-top: 5px;">
              <option value="efectivo">💰 Efectivo</option>
              <option value="tarjeta">💳 Tarjeta</option>
              <option value="transferencia">🏦 Transferencia</option>
            </select>
          </div>
          
          <div style="margin-bottom: 15px;">
            <label>📝 Comentario:</label>
            <textarea id="comentarioVenta" class="form-control" rows="2" placeholder="Observaciones..."></textarea>
          </div>
          
          <div style="margin-bottom: 15px; padding: 15px; background: rgba(99, 102, 241, 0.1); border-radius: 12px;">
            <h4>⚡ Venta Rápida</h4>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <input type="text" id="ventaRapidaConcepto" class="form-control" placeholder="Concepto" style="flex: 2;">
              <input type="number" id="ventaRapidaMonto" class="form-control" placeholder="Monto" style="flex: 1;">
              <button class="btn btn-success" onclick="window.agregarVentaRapida()">➕</button>
            </div>
            <small style="color: var(--text-muted);">Para piezas sueltas, refacciones o servicios</small>
          </div>
          
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" style="flex: 1;" onclick="window.finalizarVenta()">
              <i class="fas fa-check"></i> Finalizar
            </button>
            <button class="btn btn-danger" style="flex: 1;" onclick="window.limpiarCarrito()">
              <i class="fas fa-trash"></i> Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};

// ============================================
// FUNCIONES
// ============================================

window.cargarUsuariosVenta = async () => {
  try {
    const usuarios = await window.DB.getUsuarios();
    const select = document.getElementById('usuarioVenta');
    if (select) {
      select.innerHTML = usuarios.map(u => 
        `<option value="${u.nombre}">${u.nombre}</option>`
      ).join('');
      if (window.usuarioActual) {
        select.value = window.usuarioActual.nombre;
      }
    }
  } catch (e) {
    console.warn('No se pudieron cargar usuarios', e);
  }
};

window.cargarProductosVenta = async () => {
  const productos = await window.DB.getProductos();
  const productosConStock = productos.filter(p => p.stock > 0);
  const container = document.getElementById('listaProductosGrid');
  if (!container) return;
  
  if (productosConStock.length === 0) {
    container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No hay productos disponibles</p>';
    return;
  }
  
  container.innerHTML = productosConStock.map(p => {
    const precioBase = parseFloat(p.precio);
    const precioConRecargo = precioBase * 1.05;
    return `
      <div style="background: var(--bg-dark); padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onclick="window.agregarAlCarrito(${p.id})">
        <div style="font-weight: bold; font-size: 14px;">${p.nombre}</div>
        <div style="color: var(--success); font-size: 18px;">$${precioConRecargo.toFixed(2)}</div>
        <small style="color: var(--text-muted);">SKU: ${p.sku}</small>
        <div style="font-size: 11px;">Stock: ${p.stock}</div>
      </div>
    `;
  }).join('');
  
  window.cargarUsuariosVenta();
};

window.buscarProductoVenta = async () => {
  const busqueda = document.getElementById('buscadorProducto').value.trim().toLowerCase();
  if (!busqueda) {
    document.getElementById('resultadoBusqueda').innerHTML = '<p style="color: var(--warning);">✏️ Escribe SKU, código o nombre</p>';
    return;
  }
  
  const productos = await window.DB.getProductos();
  const producto = productos.find(p => 
    (p.sku && p.sku.toLowerCase() === busqueda) || 
    (p.codigo_barras && p.codigo_barras === busqueda) ||
    (p.nombre && p.nombre.toLowerCase().includes(busqueda))
  );
  
  const resultadoDiv = document.getElementById('resultadoBusqueda');
  
  if (producto && producto.stock > 0) {
    const precioBase = parseFloat(producto.precio);
    const precioConRecargo = precioBase * 1.05;
    resultadoDiv.innerHTML = `
      <div style="background: var(--bg-card); padding: 15px; border-radius: 10px; border-left: 4px solid var(--success);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 16px;">${producto.nombre}</strong><br>
            <small>SKU: ${producto.sku} | Código: ${producto.codigo_barras}</small><br>
            <strong style="color: var(--success);">$${precioConRecargo.toFixed(2)}</strong>
            <span style="color: var(--text-muted);"> | Stock: ${producto.stock}</span>
          </div>
          <button class="btn btn-success" onclick="window.agregarAlCarrito(${producto.id})">
            <i class="fas fa-cart-plus"></i> Agregar
          </button>
        </div>
      </div>
    `;
  } else if (producto && producto.stock === 0) {
    resultadoDiv.innerHTML = `<div style="background: var(--bg-card); padding: 15px; border-radius: 10px; border-left: 4px solid var(--danger); color: var(--danger);">
      ⚠️ ${producto.nombre} - Sin stock disponible
    </div>`;
  } else {
    resultadoDiv.innerHTML = `<div style="background: var(--bg-card); padding: 15px; border-radius: 10px;">
      ❌ No se encontró "${busqueda}"<br>
      <small>Usa "Venta Rápida" para montos personalizados</small>
    </div>`;
  }
};

window.agregarAlCarrito = async (id) => {
  const productos = await window.DB.getProductos();
  const producto = productos.find(p => p.id == id);
  
  if (!producto) {
    alert('Producto no encontrado');
    return;
  }
  
  if (producto.stock < 1) {
    alert('❌ Producto sin stock');
    return;
  }
  
  const precioBase = parseFloat(producto.precio);
  const existente = carritoVentas.find(item => item.id === id && item.tipo === 'producto');
  if (existente) {
    if (existente.cantidad + 1 > producto.stock) {
      alert(`⚠️ Stock insuficiente. Solo hay ${producto.stock}`);
      return;
    }
    existente.cantidad++;
  } else {
    carritoVentas.push({
      id: producto.id,
      nombre: producto.nombre,
      precioBase: precioBase,
      cantidad: 1,
      sku: producto.sku,
      tipo: 'producto'
    });
  }
  
  window.renderCarritoVentas();
  document.getElementById('buscadorProducto').value = '';
  document.getElementById('resultadoBusqueda').innerHTML = '';
};

window.agregarVentaRapida = () => {
  const concepto = document.getElementById('ventaRapidaConcepto').value.trim();
  const monto = parseFloat(document.getElementById('ventaRapidaMonto').value);
  
  if (!concepto) {
    alert('Ingresa un concepto');
    return;
  }
  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido');
    return;
  }
  
  carritoVentas.push({
    id: Date.now(),
    nombre: `🔧 ${concepto}`,
    precioBase: monto,
    cantidad: 1,
    sku: 'RAPIDA',
    tipo: 'rapida'
  });
  
  document.getElementById('ventaRapidaConcepto').value = '';
  document.getElementById('ventaRapidaMonto').value = '';
  window.renderCarritoVentas();
};

window.renderCarritoVentas = () => {
  const container = document.getElementById('carritoVentas');
  if (!container) return;
  
  if (carritoVentas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">🛒 Carrito vacío</p>';
    document.getElementById('totalCarrito').innerHTML = '$0';
    return;
  }
  
  let totalBase = 0;
  let totalConRecargo = 0;
  
  container.innerHTML = carritoVentas.map((item, index) => {
    const precioBase = item.precioBase;
    const precioConRecargo = precioBase * 1.05;
    const itemTotalBase = precioBase * item.cantidad;
    const itemTotalRecargo = precioConRecargo * item.cantidad;
    
    totalBase += itemTotalBase;
    totalConRecargo += itemTotalRecargo;
    
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border);">
        <div style="flex: 2;">
          <strong>${item.nombre}</strong><br>
          <small>$${precioConRecargo.toFixed(2)} c/u</small>
        </div>
        <div style="flex: 1; text-align: center;">
          ${item.tipo === 'producto' ? `
            <button onclick="window.modificarCantidad(${index}, -1)" style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer;">-</button>
            <span style="margin: 0 8px;">${item.cantidad}</span>
            <button onclick="window.modificarCantidad(${index}, 1)" style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer;">+</button>
          ` : `<span>1</span>`}
        </div>
        <div style="flex: 1; text-align: right;">
          $${itemTotalRecargo.toFixed(2)}
        </div>
        <div>
          <button onclick="window.eliminarDelCarrito(${index})" style="background: var(--danger); border: none; width: 30px; height: 30px; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  let totalMostrar = descuentoActivo ? totalBase : totalConRecargo;
  document.getElementById('totalCarrito').innerHTML = `$${totalMostrar.toFixed(2)}`;
  
  window._totalesCarrito = { totalBase, totalConRecargo };
};

window.toggleDescuento = () => {
  descuentoActivo = !descuentoActivo;
  const btn = document.getElementById('btnDescuento');
  if (btn) {
    btn.style.background = descuentoActivo ? 'var(--success)' : 'var(--gray)';
    btn.innerText = descuentoActivo ? 'Activo ✅' : 'Activar';
  }
  window.renderCarritoVentas();
};

window.modificarCantidad = async (index, delta) => {
  const item = carritoVentas[index];
  if (item.tipo === 'rapida') {
    if (delta < 1) {
      carritoVentas.splice(index, 1);
    }
    window.renderCarritoVentas();
    return;
  }
  
  const productos = await window.DB.getProductos();
  const producto = productos.find(p => p.id == item.id);
  
  const nuevaCantidad = item.cantidad + delta;
  if (nuevaCantidad < 1) {
    carritoVentas.splice(index, 1);
  } else if (producto && nuevaCantidad <= producto.stock) {
    item.cantidad = nuevaCantidad;
  } else {
    alert(`⚠️ Stock insuficiente. Solo hay ${producto?.stock || 0}`);
    return;
  }
  
  window.renderCarritoVentas();
};

window.eliminarDelCarrito = (index) => {
  carritoVentas.splice(index, 1);
  window.renderCarritoVentas();
};

window.limpiarCarrito = () => {
  if (carritoVentas.length === 0) return;
  if (confirm('¿Vaciar todo el carrito?')) {
    carritoVentas = [];
    descuentoActivo = false;
    const btn = document.getElementById('btnDescuento');
    if (btn) {
      btn.style.background = 'var(--gray)';
      btn.innerText = 'Activar';
    }
    window.renderCarritoVentas();
  }
};

// ============================================
// IMPRESIÓN DE TICKET
// ============================================

window.imprimirTicket = (ventaData) => {
  if (!ventaData) return;
  
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('Permite ventanas emergentes para imprimir el ticket');
    return;
  }
  
  const fecha = new Date(ventaData.fecha).toLocaleString();
  const items = ventaData.items || [];
  const total = ventaData.total || 0;
  const metodo = ventaData.metodoPago || 'Efectivo';
  const usuario = ventaData.usuario || 'Admin';
  const comentario = ventaData.comentario || '';
  const descuento = ventaData.descuentoAplicado ? '✅ Descuento 5% aplicado' : '';
  
  let itemsHtml = items.map(item => {
    const precio = (item.precioBase || item.precio || 0) * 1.05;
    const subtotal = precio * item.cantidad;
    return `
      <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0;">
        <span>${item.nombre} x${item.cantidad}</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
    `;
  }).join('');
  
  const terminosGarantia = `
TÉRMINOS DE GARANTÍA
         LOTO GAMES REPAIR
═══════════════════════════════════════

🔧 GARANTÍA POR REPARACIÓN: 30 DÍAS

La garantía cubre ÚNICAMENTE la falla específica 
reportada y reparada en este servicio.

❌ LA GARANTÍA SE ANULA AUTOMÁTICAMENTE SI:

1. El equipo es abierto, manipulado o reparado 
   por personal ajeno a LOTO GAMES.

2. Se presentan daños por líquidos, golpes, 
   caídas o mal uso del equipo.

3. Se instala software, firmware o modificaciones 
   no autorizadas.

4. La etiqueta de seguridad se encuentra rota, 
   removida o alterada.

5. El daño original es diferente al reportado 
   en este ticket.

⚠️ IMPORTANTE:
- Guarda este ticket como comprobante de garantía.
- La garantía es personal e intransferible.
- Aplica solo en nuestra tienda física.
- No cubre piezas estéticas (carcasas, botones, 
  o cosméticos).

✅ MANTENEMOS DERECHO DE REVISIÓN:
Ante cualquier anomalía, el equipo será revisado 
por nuestro departamento técnico para determinar 
si la garantía sigue vigente.

═══════════════════════════════════════
   ¡Gracias por confiar en LOTO GAMES!
   ¿Preguntas? 📞 (tu teléfono aquí)
═══════════════════════════════════════
  `;
  
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket de Venta</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          padding: 15px;
          width: 80mm;
          margin: 0 auto;
          background: #fff;
        }
        .ticket { text-align: center; }
        .ticket h2 { font-size: 18px; margin-bottom: 5px; }
        .ticket .sub { font-size: 12px; color: #555; margin-bottom: 10px; }
        .ticket hr { border: none; border-top: 1px dashed #ccc; margin: 8px 0; }
        .ticket .items { text-align: left; margin: 10px 0; }
        .ticket .total { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .ticket .info-line {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          padding: 2px 0;
        }
        .ticket .footer { font-size: 11px; color: #777; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px; }
        .ticket .no-devolucion { font-size: 13px; font-weight: bold; color: #d32f2f; margin: 6px 0; }
        .ticket .horario-garantia { font-size: 12px; color: #333; margin: 6px 0; }
        .ticket .terminos {
          text-align: left;
          font-size: 10px;
          line-height: 1.3;
          color: #333;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dashed #ccc;
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
        }
        .ticket .terminos strong { font-weight: bold; }
        @media print {
          body { padding: 10px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <h2>🏪 LOTO GAMES</h2>
        <div class="sub">Sistema POS</div>
        <hr>
        <div class="info-line"><span>Fecha:</span><span>${fecha}</span></div>
        <div class="info-line"><span>Vendedor:</span><span>${usuario}</span></div>
        ${descuento ? `<div class="info-line"><span>Descuento:</span><span>5%</span></div>` : ''}
        <hr>
        <div class="items">${itemsHtml}</div>
        <hr>
        <div class="info-line"><span>Método de pago:</span><span>${metodo}</span></div>
        <div class="info-line"><span>Total:</span><span style="font-weight:bold;">$${total.toFixed(2)}</span></div>
        ${comentario ? `<div style="font-size:11px; margin-top:5px; color:#555;">📝 ${comentario}</div>` : ''}
        <hr>
        <div class="no-devolucion">❌ No Hay devoluciones de Efectivo</div>
        <div class="horario-garantia">🕐 Garantías: Lun-Vie 11:00 a 17:00</div>
        <div class="horario-garantia" style="font-size:11px; color:#888;">Sábado y Domingo no atendemos garantías</div>
        <hr>
        <div class="terminos">${terminosGarantia}</div>
        <hr>
        <div class="footer">
          ¡Gracias por su compra!<br>
          Visítanos en LOTO GAMES
        </div>
      </div>
      <script>
        setTimeout(function() {
          window.print();
        }, 500);
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
};

// ============================================
// FINALIZAR VENTA
// ============================================

window.finalizarVenta = async () => {
  if (carritoVentas.length === 0) {
    alert('❌ El carrito está vacío');
    return;
  }
  
  const metodoPago = document.getElementById('metodoPagoVenta').value;
  const comentario = document.getElementById('comentarioVenta').value;
  const usuario = document.getElementById('usuarioVenta')?.value || 'Admin';
  
  const { totalBase, totalConRecargo } = window._totalesCarrito;
  const totalFinal = descuentoActivo ? totalBase : totalConRecargo;
  
  const resumen = carritoVentas.map(item => {
    const precioConRecargo = item.precioBase * 1.05;
    const subtotal = descuentoActivo ? (item.precioBase * item.cantidad) : (precioConRecargo * item.cantidad);
    return `${item.nombre} x${item.cantidad} = $${subtotal.toFixed(2)}`;
  }).join('\n');
  
  const mensaje = `📋 CONFIRMAR VENTA\n\n${resumen}\n\nTOTAL: $${totalFinal.toFixed(2)}\n\nMétodo: ${metodoPago}\nVendedor: ${usuario}\n${descuentoActivo ? '✅ Descuento 5% aplicado' : ''}\n\n¿Confirmar venta?`;
  
  if (confirm(mensaje)) {
    const venta = {
      items: carritoVentas,
      total: totalFinal,
      metodoPago: metodoPago,
      comentario: comentario,
      usuario: usuario,
      descuentoAplicado: descuentoActivo
    };
    
    const ventaGuardada = await window.DB.registrarVenta(venta);
    
    carritoVentas = [];
    descuentoActivo = false;
    const btn = document.getElementById('btnDescuento');
    if (btn) {
      btn.style.background = 'var(--gray)';
      btn.innerText = 'Activar';
    }
    window.renderCarritoVentas();
    await window.cargarProductosVenta();
    document.getElementById('comentarioVenta').value = '';
    
    alert(`✅ Venta realizada con éxito\n\nTotal: $${totalFinal.toFixed(2)}`);
    
    if (confirm('¿Deseas imprimir el ticket de la venta?')) {
      window.imprimirTicket({
        ...venta,
        fecha: new Date().toISOString(),
        id: ventaGuardada?.id || 'N/A'
      });
    }
  }
};

// ============================================
// INICIALIZACIÓN
// ============================================

setTimeout(() => {
  if (document.getElementById('listaProductosGrid')) {
    window.cargarProductosVenta();
  }
}, 100);
