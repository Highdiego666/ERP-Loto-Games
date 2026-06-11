let carritoVentas = [];

window.ventasModule = () => `
  <div style="display: grid; grid-template-columns: 1fr 400px; gap: 24px;">
    <div>
      <div class="table-container">
        <h3 style="margin-bottom: 20px;">🔍 Buscar Producto</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <input type="text" id="buscadorProducto" class="form-control" placeholder="Escribe SKU, código o nombre...">
          <button class="btn btn-primary" onclick="window.buscarProductoVenta()">
            <i class="fas fa-search"></i> Buscar
          </button>
        </div>
        <div id="resultadoBusqueda" style="min-height: 100px;"></div>
      </div>
      
      <div class="table-container" style="margin-top: 24px;">
        <h3 style="margin-bottom: 20px;">📦 Todos los Productos</h3>
        <div id="listaProductosGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto;">
        </div>
      </div>
    </div>
    
    <div>
      <div class="table-container">
        <h3 style="margin-bottom: 20px;">🛒 Carrito</h3>
        <div id="carritoVentas" style="min-height: 250px; max-height: 350px; overflow-y: auto;">
          <p style="text-align: center; color: var(--text-muted);">Carrito vacío</p>
        </div>
        
        <hr style="margin: 15px 0;">
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span id="subtotalCarrito">$0</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 5px;">
            <span>IVA (16%):</span>
            <span id="ivaCarrito">$0</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 10px;">
            <span>TOTAL:</span>
            <span id="totalCarrito" style="color: var(--success);">$0</span>
          </div>
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
            <button class="btn btn-success" onclick="window.agregarVentaRapida()">+</button>
          </div>
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

// Cargar todos los productos en grid
window.cargarProductosVenta = () => {
  const productos = window.DB.getProductos().filter(p => p.stock > 0);
  const container = document.getElementById('listaProductosGrid');
  if (!container) return;
  
  if (productos.length === 0) {
    container.innerHTML = '<p style="text-align: center;">No hay productos disponibles</p>';
    return;
  }
  
  container.innerHTML = productos.map(p => `
    <div style="background: var(--bg-dark); padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onclick="window.agregarAlCarrito(${p.id})">
      <div style="font-weight: bold;">${p.nombre}</div>
      <div style="color: var(--success); font-size: 18px;">$${p.precio.toLocaleString()}</div>
      <small style="color: var(--text-muted);">SKU: ${p.sku}</small>
      <div style="font-size: 11px;">Stock: ${p.stock}</div>
    </div>
  `).join('');
};

// Buscar producto
window.buscarProductoVenta = () => {
  const busqueda = document.getElementById('buscadorProducto').value.trim().toLowerCase();
  if (!busqueda) {
    document.getElementById('resultadoBusqueda').innerHTML = '<p style="color: var(--warning);">✏️ Escribe SKU, código o nombre</p>';
    return;
  }
  
  const productos = window.DB.getProductos();
  const producto = productos.find(p => 
    p.sku.toLowerCase() === busqueda || 
    p.codigoBarras === busqueda ||
    p.nombre.toLowerCase().includes(busqueda)
  );
  
  const resultadoDiv = document.getElementById('resultadoBusqueda');
  
  if (producto && producto.stock > 0) {
    resultadoDiv.innerHTML = `
      <div style="background: var(--bg-card); padding: 15px; border-radius: 10px; border-left: 4px solid var(--success);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 16px;">${producto.nombre}</strong><br>
            <small>SKU: ${producto.sku} | Código: ${producto.codigoBarras}</small><br>
            <strong style="color: var(--success);">$${producto.precio.toLocaleString()}</strong>
            <span style="color: var(--text-muted);"> | Stock: ${producto.stock}</span>
          </div>
          <button class="btn btn-success" onclick="window.agregarAlCarrito(${producto.id})">
            Agregar
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
      <small>Puedes usar "Venta Rápida" para agregar un monto personalizado</small>
    </div>`;
  }
};

// Agregar producto al carrito
window.agregarAlCarrito = (id) => {
  const productos = window.DB.getProductos();
  const producto = productos.find(p => p.id == id);
  
  if (!producto) {
    alert('Producto no encontrado');
    return;
  }
  
  if (producto.stock < 1) {
    alert('❌ Producto sin stock disponible');
    return;
  }
  
  const itemExistente = carritoVentas.find(item => item.id == id && item.tipo === 'producto');
  if (itemExistente) {
    if (itemExistente.cantidad + 1 > producto.stock) {
      alert(`⚠️ Stock insuficiente. Solo hay ${producto.stock} unidades`);
      return;
    }
    itemExistente.cantidad++;
  } else {
    carritoVentas.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      sku: producto.sku,
      tipo: 'producto'
    });
  }
  
  window.renderCarritoVentas();
  document.getElementById('buscadorProducto').value = '';
  document.getElementById('resultadoBusqueda').innerHTML = '';
  alert(`✅ ${producto.nombre} agregado al carrito`);
};

// Venta rápida
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
    precio: monto,
    cantidad: 1,
    sku: 'VENTA_RAPIDA',
    tipo: 'rapida'
  });
  
  document.getElementById('ventaRapidaConcepto').value = '';
  document.getElementById('ventaRapidaMonto').value = '';
  window.renderCarritoVentas();
  alert('✅ Agregado al carrito');
};

// Renderizar carrito
window.renderCarritoVentas = () => {
  const container = document.getElementById('carritoVentas');
  if (!container) return;
  
  if (carritoVentas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">🛒 Carrito vacío</p>';
    document.getElementById('subtotalCarrito').innerHTML = '$0';
    document.getElementById('ivaCarrito').innerHTML = '$0';
    document.getElementById('totalCarrito').innerHTML = '$0';
    return;
  }
  
  let subtotal = 0;
  container.innerHTML = carritoVentas.map((item, index) => {
    const itemTotal = item.precio * item.cantidad;
    subtotal += itemTotal;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border);">
        <div style="flex: 2;">
          <strong>${item.nombre}</strong><br>
          <small>$${item.precio.toLocaleString()} c/u</small>
        </div>
        <div style="flex: 1; text-align: center;">
          ${item.tipo === 'producto' ? `
            <button onclick="window.modificarCantidad(${index}, -1)" style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px;">-</button>
            <span style="margin: 0 8px;">${item.cantidad}</span>
            <button onclick="window.modificarCantidad(${index}, 1)" style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px;">+</button>
          ` : `
            <span>1</span>
          `}
        </div>
        <div style="flex: 1; text-align: right;">
          $${itemTotal.toLocaleString()}
        </div>
        <div>
          <button onclick="window.eliminarDelCarrito(${index})" style="background: var(--danger); border: none; width: 30px; height: 30px; border-radius: 5px; margin-left: 10px;">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  
  document.getElementById('subtotalCarrito').innerHTML = `$${subtotal.toLocaleString()}`;
  document.getElementById('ivaCarrito').innerHTML = `$${iva.toLocaleString()}`;
  document.getElementById('totalCarrito').innerHTML = `$${total.toLocaleString()}`;
};

// Modificar cantidad
window.modificarCantidad = (index, delta) => {
  const item = carritoVentas[index];
  if (item.tipo === 'rapida') return;
  
  const productos = window.DB.getProductos();
  const producto = productos.find(p => p.id == item.id);
  
  const nuevaCantidad = item.cantidad + delta;
  if (nuevaCantidad < 1) {
    carritoVentas.splice(index, 1);
  } else if (producto && nuevaCantidad <= producto.stock) {
    item.cantidad = nuevaCantidad;
  } else {
    alert(`⚠️ Stock insuficiente. Solo hay ${producto?.stock || 0} unidades`);
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
    window.renderCarritoVentas();
  }
};

// Finalizar venta
window.finalizarVenta = () => {
  if (carritoVentas.length === 0) {
    alert('❌ El carrito está vacío');
    return;
  }
  
  const metodoPago = document.getElementById('metodoPagoVenta').value;
  const comentario = document.getElementById('comentarioVenta').value;
  
  const subtotal = carritoVentas.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  
  const resumen = carritoVentas.map(item => 
    `${item.nombre} x${item.cantidad} = $${(item.precio * item.cantidad).toLocaleString()}`
  ).join('\n');
  
  if (confirm(`📋 CONFIRMAR VENTA\n\n${resumen}\n\nSubtotal: $${subtotal.toLocaleString()}\nIVA: $${iva.toLocaleString()}\nTOTAL: $${total.toLocaleString()}\n\nMétodo: ${metodoPago}\n\n¿Confirmar?`)) {
    
    const venta = {
      items: [...carritoVentas],
      subtotal: subtotal,
      iva: iva,
      total: total,
      metodoPago: metodoPago,
      comentario: comentario
    };
    
    window.DB.registrarVenta(venta);
    carritoVentas = [];
    window.renderCarritoVentas();
    window.cargarProductosVenta();
    document.getElementById('comentarioVenta').value = '';
    
    alert(`✅ Venta realizada con éxito\n\nTotal: $${total.toLocaleString()}`);
  }
};
