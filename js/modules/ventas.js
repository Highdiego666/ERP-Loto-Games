// ============================================
// LOTO GAMES POS - MÓDULO DE VENTAS
// CON 5% AUTOMÁTICO Y DESCUENTO OPCIONAL
// ============================================

let carritoVentas = [];
let descuentoActivo = false; // Controla si se aplica el descuento del 5%

window.ventasModule = () => `
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

// Función para activar/desactivar descuento
window.toggleDescuento = () => {
  descuentoActivo = !descuentoActivo;
  const btn = document.getElementById('btnDescuento');
  if (btn) {
    btn.style.background = descuentoActivo ? 'var(--success)' : 'var(--gray)';
    btn.innerText = descuentoActivo ? 'Activo ✅' : 'Activar';
  }
  window.renderCarritoVentas();
};

// Cargar productos para venta (muestra precio con 5% incluido)
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
};

// Buscar producto (muestra precio con 5% incluido)
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

// Agregar al carrito (guarda precio base y calcula recargo al mostrar)
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
      precioBase: precioBase,          // Precio sin recargo
      cantidad: 1,
      sku: producto.sku,
      tipo: 'producto'
    });
  }
  
  window.renderCarritoVentas();
  document.getElementById('buscadorProducto').value = '';
  document.getElementById('resultadoBusqueda').innerHTML = '';
};

// Venta rápida (el monto ya incluye el 5% si se desea, pero se guarda como precioBase)
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
  
  // Para venta rápida, el precio base es el monto ingresado (sin recargo adicional)
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

// Renderizar carrito
window.renderCarritoVentas = () => {
  const container = document.getElementById('carritoVentas');
  if (!container) return;
  
  if (carritoVentas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">🛒 Carrito vacío</p>';
    document.getElementById('totalCarrito').innerHTML = '$0';
    return;
  }
  
  let totalBase = 0;        // Suma de precios base
  let totalConRecargo = 0;  // Suma de precios con 5% incluido
  
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
  
  // Determinar total a mostrar según descuento activo
  let totalMostrar = descuentoActivo ? totalBase : totalConRecargo;
  document.getElementById('totalCarrito').innerHTML = `$${totalMostrar.toFixed(2)}`;
  
  // Guardar totales para usarlos al finalizar venta
  window._totalesCarrito = { totalBase, totalConRecargo };
};

// Modificar cantidad
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

// Eliminar del carrito
window.eliminarDelCarrito = (index) => {
  carritoVentas.splice(index, 1);
  window.renderCarritoVentas();
};

// Limpiar carrito
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

// Finalizar venta
window.finalizarVenta = async () => {
  if (carritoVentas.length === 0) {
    alert('❌ El carrito está vacío');
    return;
  }
  
  const metodoPago = document.getElementById('metodoPagoVenta').value;
  const comentario = document.getElementById('comentarioVenta').value;
  
  const { totalBase, totalConRecargo } = window._totalesCarrito;
  const totalFinal = descuentoActivo ? totalBase : totalConRecargo;
  
  const resumen = carritoVentas.map(item => {
    const precioConRecargo = item.precioBase * 1.05;
    const subtotal = descuentoActivo ? (item.precioBase * item.cantidad) : (precioConRecargo * item.cantidad);
    return `${item.nombre} x${item.cantidad} = $${subtotal.toFixed(2)}`;
  }).join('\n');
  
  const mensaje = `📋 CONFIRMAR VENTA\n\n${resumen}\n\nTOTAL: $${totalFinal.toFixed(2)}\n\nMétodo: ${metodoPago}\n${descuentoActivo ? '✅ Descuento 5% aplicado' : ''}\n\n¿Confirmar?`;
  
  if (confirm(mensaje)) {
    const venta = {
      items: carritoVentas.map(item => ({
        ...item,
        precioAplicado: descuentoActivo ? item.precioBase : item.precioBase * 1.05
      })),
      total: totalFinal,
      metodoPago: metodoPago,
      comentario: comentario,
      descuentoAplicado: descuentoActivo
    };
    
    await window.DB.registrarVenta(venta);
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
  }
};
