let carritoVentas = [];

window.ventasModule = () => `
  <div style="display: grid; grid-template-columns: 1fr 450px; gap: 24px;">
    <!-- Panel izquierdo - Buscador y productos -->
    <div>
      <!-- Buscador mejorado -->
      <div class="table-container">
        <h3 style="margin-bottom: 20px;">🔍 Buscar Producto</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <input type="text" id="buscadorProducto" class="form-control" placeholder="SKU, Código de barras o Nombre..." style="flex: 1;">
          <button class="btn btn-primary" onclick="window.buscarProductoVenta()">
            <i class="fas fa-search"></i> Buscar
          </button>
        </div>
        <div id="resultadoBusqueda" style="min-height: 100px;"></div>
      </div>
      
      <!-- Lista de productos rápidos -->
      <div class="table-container" style="margin-top: 24px;">
        <h3 style="margin-bottom: 20px;">📦 Productos Rápidos</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto;" id="productosRapidos">
          <!-- Productos se cargarán aquí -->
        </div>
      </div>
    </div>
    
    <!-- Panel derecho - Carrito -->
    <div>
      <div class="table-container">
        <h3 style="margin-bottom: 20px;">🛒 Carrito de Venta</h3>
        
        <!-- Carrito -->
        <div id="carritoVentas" style="min-height: 250px; max-height: 350px; overflow-y: auto;">
          <p style="text-align: center; color: var(--text-muted);">No hay productos en el carrito</p>
        </div>
        
        <hr style="margin: 15px 0; border-color: var(--border);">
        
        <!-- Totales -->
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Subtotal:</span>
            <span id="subtotalCarrito">$0</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>IVA (16%):</span>
            <span id="ivaCarrito">$0</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid var(--border);">
            <span>TOTAL:</span>
            <span id="totalCarrito" style="color: var(--primary-light);">$0</span>
          </div>
        </div>
        
        <!-- Método de pago -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px;">💳 Método de Pago:</label>
          <div style="display: flex; gap: 15px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="metodoPago" value="efectivo" checked> Efectivo
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="metodoPago" value="tarjeta"> Tarjeta
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="metodoPago" value="transferencia"> Transferencia
            </label>
          </div>
        </div>
        
        <!-- Comentario/Observación -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px;">📝 Nota / Comentario:</label>
          <textarea id="comentarioVenta" class="form-control" rows="2" placeholder="Ej: Venta de pieza suelta, reparación, observaciones..."></textarea>
        </div>
        
        <!-- Venta rápida (producto sin registro) -->
        <div style="margin-bottom: 15px; padding: 15px; background: rgba(99, 102, 241, 0.1); border-radius: 12px;">
          <h4 style="margin-bottom: 10px;">⚡ Venta Rápida / Pieza Suelta</h4>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="ventaRapidaConcepto" class="form-control" placeholder="Concepto (ej: Pieza de consola)" style="flex: 2;">
            <input type="number" id="ventaRapidaMonto" class="form-control" placeholder="Monto $" style="flex: 1;">
            <button class="btn btn-success" onclick="window.agregarVentaRapida()" style="white-space: nowrap;">
              <i class="fas fa-plus"></i> Agregar
            </button>
          </div>
          <small style="color: var(--text-muted);">Para piezas sueltas, refacciones o servicios no registrados en el inventario</small>
        </div>
        
        <!-- Botones de acción -->
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" style="flex: 1;" onclick="window.finalizarVenta()">
            <i class="fas fa-check"></i> Finalizar Venta
          </button>
          <button class="btn btn-danger" style="flex: 1;" onclick="window.limpiarCarrito()">
            <i class="fas fa-trash"></i> Limpiar
          </button>
        </div>
      </div>
    </div>
  </div>
`;

// Cargar productos rápidos
window.cargarProductosVenta = () => {
  const productos = window.DB.getProductos().filter(p => p.stock > 0);
  const container = document.getElementById('productosRapidos');
  if (container) {
    container.innerHTML = productos.slice(0, 12).map(p => `
      <div style="background: var(--bg-dark); padding: 10px; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onclick="window.agregarAlCarrito(${p.id})">
        <div style="font-weight: bold; font-size: 13px;">${p.nombre.substring(0, 25)}</div>
        <div style="color: var(--primary-light);">$${p.precio.toLocaleString()}</div>
        <small style="color: var(--text-muted);">Stock: ${p.stock}</small>
      </div>
    `).join('');
  }
  
  // También cargar tabla de productos
  const tbody = document.getElementById('listaProductosVenta');
  if (tbody) {
    tbody.innerHTML = productos.map(p => `
      <tr>
        <td>${p.nombre}</td>
        <td>$${p.precio.toLocaleString()}</td>
        <td>${p.stock}</td>
        <td><button class="btn btn-success" style="padding: 5px 10px" onclick="window.agregarAlCarrito(${p.id})">+</button></td>
      </tr>
    `).join('');
  }
};

// Buscar producto (mejorado)
window.buscarProductoVenta = () => {
  const busqueda = document.getElementById('buscadorProducto').value.trim().toLowerCase();
  if (!busqueda) {
    document.getElementById('resultadoBusqueda').innerHTML = '<p style="color: var(--warning);">🔍 Ingresa SKU, código de barras o nombre</p>';
    return;
  }
  
  const productos = window.DB.getProductos();
  const producto = productos.find(p => 
    p.sku?.toLowerCase() === busqueda || 
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
            <span style="color: var(--primary-light); font-size: 18px;">$${producto.precio.toLocaleString()}</span>
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
    resultadoDiv.innerHTML = `<div style="background: var(--bg-card); padding: 15px; border-radius: 10px; border-left: 4px solid var(--warning);">
      🔍 No se encontró "${busqueda}"<br>
      <small>Puedes usar "Venta Rápida" para agregar un monto personalizado</small>
    </div>`;
  }
};

// Agregar producto al carrito
window.agregarAlCarrito = (id, cantidad = 1) => {
  const productos = window.DB.getProductos();
  const producto = productos.find(p => p.id == id);
  
  if (!producto) {
    alert('Producto no encontrado');
    return;
  }
  
  if (producto.stock < cantidad) {
    alert(`Stock insuficiente. Solo hay ${producto.stock} unidades.`);
    return;
  }
  
  const itemExistente = carritoVentas.find(item => item.id == id && item.tipo === 'producto');
  if (itemExistente) {
    if (itemExistente.cantidad + cantidad > producto.stock) {
      alert('No hay suficiente stock');
      return;
    }
    itemExistente.cantidad += cantidad;
  } else {
    carritoVentas.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad,
      sku: producto.sku,
      tipo: 'producto'
    });
  }
  
  window.renderCarritoVentas();
  document.getElementById('buscadorProducto').value = '';
  document.getElementById('resultadoBusqueda').innerHTML = '';
};

// Agregar venta rápida (pieza suelta, refacción, etc.)
window.agregarVentaRapida = () => {
  const concepto = document.getElementById('ventaRapidaConcepto').value.trim();
  const monto = parseFloat(document.getElementById('ventaRapidaMonto').value);
  
  if (!concepto) {
    alert('Ingresa un concepto para la venta rápida');
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
  
  // Limpiar campos
  document.getElementById('ventaRapidaConcepto').value = '';
  document.getElementById('ventaRapidaMonto').value = '';
  
  window.renderCarritoVentas();
};

// Renderizar carrito
window.renderCarritoVentas = () => {
  const container = document.getElementById('carritoVentas');
  if (!container) return;
  
  if (carritoVentas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No hay productos en el carrito</p>';
    document.getElementById('subtotalCarrito').innerText = '$0';
    document.getElementById('ivaCarrito').innerText = '$0';
    document.getElementById('totalCarrito').innerText = '$0';
    return;
  }
  
  let subtotal = 0;
  container.innerHTML = carritoVentas.map((item, index) => {
    const itemTotal = item.precio * item.cantidad;
    subtotal += itemTotal;
    const esRapida = item.tipo === 'rapida';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border);">
        <div style="flex: 2;">
          <strong>${item.nombre}</strong><br>
          <small>${esRapida ? 'Venta rápida' : `SKU: ${item.sku}`}</small><br>
          <small>$${item.precio.toLocaleString()} c/u</small>
        </div>
        <div style="flex: 1; text-align: center;">
          ${!esRapida ? `
            <button style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer;" onclick="window.modificarCantidad(${index}, -1)">-</button>
            <span style="margin: 0 10px;">${item.cantidad}</span>
            <button style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer;" onclick="window.modificarCantidad(${index}, 1)">+</button>
          ` : `
            <span>Cantidad: 1</span>
          `}
        </div>
        <div style="flex: 1; text-align: right;">
          $${itemTotal.toLocaleString()}
        </div>
        <div>
          <button style="background: var(--danger); border: none; width: 30px; height: 30px; border-radius: 5px; cursor: pointer; margin-left: 10px;" onclick="window.eliminarDelCarrito(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  
  document.getElementById('subtotalCarrito').innerText = `$${subtotal.toLocaleString()}`;
  document.getElementById('ivaCarrito').innerText = `$${iva.toLocaleString()}`;
  document.getElementById('totalCarrito').innerHTML = `$${total.toLocaleString()}`;
};

// Modificar cantidad
window.modificarCantidad = (index, delta) => {
  const item = carritoVentas[index];
  if (item.tipo === 'rapida') return;
  
  const nuevaCantidad = item.cantidad + delta;
  if (nuevaCantidad < 1) {
    carritoVentas.splice(index, 1);
  } else {
    const productos = window.DB.getProductos();
    const producto = productos.find(p => p.id == item.id);
    if (producto && nuevaCantidad <= producto.stock) {
      item.cantidad = nuevaCantidad;
    } else {
      alert('Stock insuficiente');
      return;
    }
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
  if (confirm('¿Limpiar todo el carrito?')) {
    carritoVentas = [];
    window.renderCarritoVentas();
  }
};

// Finalizar venta
window.finalizarVenta = () => {
  if (carritoVentas.length === 0) {
    alert('El carrito está vacío');
    return;
  }
  
  const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;
  const comentario = document.getElementById('comentarioVenta').value;
  
  const subtotal = carritoVentas.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  
  const ventaDetalle = carritoVentas.map(item => 
    `${item.nombre} x${item.cantidad} = $${(item.precio * item.cantidad).toLocaleString()}`
  ).join('\n');
  
  const mensaje = `📋 CONFIRMAR VENTA\n\n` +
    `Productos:\n${ventaDetalle}\n\n` +
    `Subtotal: $${subtotal.toLocaleString()}\n` +
    `IVA (16%): $${iva.toLocaleString()}\n` +
    `TOTAL: $${total.toLocaleString()}\n\n` +
    `💳 Método: ${metodoPago.toUpperCase()}\n` +
    `📝 Comentario: ${comentario || 'Sin comentarios'}\n\n` +
    `¿Confirmar venta?`;
  
  if (confirm(mensaje)) {
    const venta = {
      items: [...carritoVentas],
      subtotal: subtotal,
      iva: iva,
      total: total,
      metodoPago: metodoPago,
      comentario: comentario,
      fecha: new Date().toISOString()
    };
    
    window.DB.registrarVenta(venta);
    carritoVentas = [];
    window.renderCarritoVentas();
    window.cargarProductosVenta();
    
    // Limpiar campos
    document.getElementById('comentarioVenta').value = '';
    document.querySelector('input[name="metodoPago"][value="efectivo"]').checked = true;
    
    alert(`✅ Venta registrada exitosamente\n\nTotal: $${total.toLocaleString()}\nMétodo: ${metodoPago.toUpperCase()}`);
  }
};
