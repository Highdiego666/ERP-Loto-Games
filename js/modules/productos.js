// Variables globales
let productosData = [];

window.productosModule = () => `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <div>
      <h2>📦 Gestión de Productos</h2>
      <p style="color: var(--text-muted);">Administra tu inventario</p>
    </div>
    <button class="btn btn-primary" onclick="window.mostrarModalProducto()">
      <i class="fas fa-plus"></i> Nuevo Producto
    </button>
  </div>
  
  <div class="table-container">
    <div style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
      <input type="text" id="buscarProductoInput" class="form-control" placeholder="🔍 Buscar por nombre, SKU o código..." style="flex: 1;">
      <select id="filtroCategoria" class="form-control" style="width: auto;">
        <option value="">Todas las categorías</option>
        <option value="consolas">🎮 Consolas</option>
        <option value="accesorios">🎧 Accesorios</option>
        <option value="videojuegos">🎮 Videojuegos</option>
        <option value="refacciones">🔧 Refacciones</option>
      </select>
      <button class="btn btn-primary" onclick="window.filtrarProductos()">Buscar</button>
    </div>
    
    <div style="overflow-x: auto;">
      <table style="width: 100%;">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Código Barras</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaProductos">
          <tr><td colspan="7" style="text-align: center;">Cargando productos...</td</tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <div id="modalProducto" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalProductoTitulo">Nuevo Producto</h3>
        <span class="close-modal" onclick="window.cerrarModalProducto()">&times;</span>
      </div>
      <form id="formProducto">
        <input type="hidden" id="productoId">
        <div class="form-group">
          <label>Nombre del Producto *</label>
          <input type="text" id="prodNombre" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Categoría *</label>
          <select id="prodCategoria" class="form-control" required>
            <option value="consolas">🎮 Consolas</option>
            <option value="accesorios">🎧 Accesorios</option>
            <option value="videojuegos">🎮 Videojuegos</option>
            <option value="refacciones">🔧 Refacciones</option>
            <option value="servicios">🛠️ Servicios</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tipo *</label>
          <select id="prodTipo" class="form-control" required>
            <option value="nueva">🆕 Nueva</option>
            <option value="usada-completa">📦 Usada Completa</option>
            <option value="segunda-mano">🔄 Segunda Mano</option>
            <option value="pieza">🔧 Pieza/Refacción</option>
          </select>
        </div>
        <div class="form-group">
          <label>Precio * (MXN)</label>
          <input type="number" id="prodPrecio" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Stock *</label>
          <input type="number" id="prodStock" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Producto</button>
      </form>
    </div>
  </div>
`;

// Cargar productos desde Supabase
window.cargarProductos = async () => {
  productosData = await window.DB.getProductos();
  window.renderizarTablaProductos(productosData);
};

// Renderizar tabla
window.renderizarTablaProductos = (productos) => {
  const tbody = document.getElementById('tablaProductos');
  if (!tbody) return;
  
  if (productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay productos registrados</td</tr>';
    return;
  }
  
  tbody.innerHTML = productos.map(p => `
    <tr>
      <td><strong>${p.sku || 'N/A'}</strong></td>
      <td><small>${p.codigo_barras || 'N/A'}</small></td>
      <td>${p.nombre}</td>
      <td><span style="background: var(--primary); padding: 4px 8px; border-radius: 8px; font-size: 11px;">${p.categoria}</span></td>
      <td><strong style="color: var(--success);">$${parseFloat(p.precio).toLocaleString()}</strong></td>
      <td style="${p.stock < 5 ? 'color: var(--danger); font-weight: bold;' : ''}">${p.stock} unidades</td>
      <td>
        <button class="btn" style="background: var(--warning); padding: 5px 10px; margin-right: 5px;" onclick="window.editarProducto(${p.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn" style="background: var(--danger); padding: 5px 10px;" onclick="window.eliminarProducto(${p.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </table>
  `).join('');
};

// Filtrar productos
window.filtrarProductos = () => {
  const busqueda = document.getElementById('buscarProductoInput').value.toLowerCase();
  const categoria = document.getElementById('filtroCategoria').value;
  
  let filtrados = [...productosData];
  
  if (busqueda) {
    filtrados = filtrados.filter(p => 
      (p.nombre && p.nombre.toLowerCase().includes(busqueda)) ||
      (p.sku && p.sku.toLowerCase().includes(busqueda)) ||
      (p.codigo_barras && p.codigo_barras.includes(busqueda))
    );
  }
  
  if (categoria) {
    filtrados = filtrados.filter(p => p.categoria === categoria);
  }
  
  window.renderizarTablaProductos(filtrados);
};

// Mostrar modal
window.mostrarModalProducto = () => {
  document.getElementById('modalProductoTitulo').innerText = 'Nuevo Producto';
  document.getElementById('productoId').value = '';
  document.getElementById('formProducto').reset();
  document.getElementById('modalProducto').style.display = 'flex';
};

// Cerrar modal
window.cerrarModalProducto = () => {
  document.getElementById('modalProducto').style.display = 'none';
};

// Editar producto
window.editarProducto = (id) => {
  const producto = productosData.find(p => p.id == id);
  if (producto) {
    document.getElementById('modalProductoTitulo').innerText = 'Editar Producto';
    document.getElementById('productoId').value = producto.id;
    document.getElementById('prodNombre').value = producto.nombre;
    document.getElementById('prodCategoria').value = producto.categoria;
    document.getElementById('prodTipo').value = producto.tipo || 'nueva';
    document.getElementById('prodPrecio').value = producto.precio;
    document.getElementById('prodStock').value = producto.stock;
    document.getElementById('modalProducto').style.display = 'flex';
  }
};

// Eliminar producto
window.eliminarProducto = async (id) => {
  if (confirm('¿Eliminar este producto?')) {
    await window.DB.deleteProducto(id);
    await window.cargarProductos();
    if (window.cargarProductosVenta) await window.cargarProductosVenta();
    alert('✅ Producto eliminado');
  }
};

// Guardar producto
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'formProducto') {
    e.preventDefault();
    const id = document.getElementById('productoId').value;
    const nombre = document.getElementById('prodNombre').value;
    const categoria = document.getElementById('prodCategoria').value;
    const tipo = document.getElementById('prodTipo').value;
    const precio = parseFloat(document.getElementById('prodPrecio').value);
    const stock = parseInt(document.getElementById('prodStock').value);
    
    if (id) {
      await window.DB.updateProducto(id, { nombre, categoria, tipo, precio, stock });
      alert('✅ Producto actualizado');
    } else {
      const sku = `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const codigoBarras = `750${Math.floor(Math.random() * 1000000000)}`;
      await window.DB.saveProducto({ nombre, categoria, tipo, precio, stock, sku, codigoBarras });
      alert('✅ Producto creado');
    }
    
    window.cerrarModalProducto();
    await window.cargarProductos();
    if (window.cargarProductosVenta) await window.cargarProductosVenta();
  }
});

// Inicializar
setTimeout(() => {
  if (document.getElementById('tablaProductos')) {
    window.cargarProductos();
  }
}, 100);

