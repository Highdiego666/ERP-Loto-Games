window.productosModule = () => {
    const categorias = ['consolas', 'accesorios', 'videojuegos', 'refacciones', 'servicios'];
    const tipos = ['nueva', 'usada-completa', 'segunda-mano', 'pieza'];
    
    return `
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
            <table>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Código Barras</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tablaProductos">
                </tbody>
            </table>
        </div>
        
        <!-- Modal Producto -->
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
                            <option value="">Seleccionar</option>
                            ${categorias.map(c => `<option value="${c}">${c.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tipo *</label>
                        <select id="prodTipo" class="form-control" required>
                            <option value="">Seleccionar</option>
                            ${tipos.map(t => `<option value="${t}">${t.replace('-', ' ').toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Precio *</label>
                        <input type="number" id="prodPrecio" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Stock Inicial *</label>
                        <input type="number" id="prodStock" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Producto</button>
                </form>
            </div>
        </div>
    `;
};

window.cargarProductos = () => {
    const productos = window.DB.getProductos();
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;
    
    tbody.innerHTML = productos.map(p => `
        <tr>
            <td>${p.sku}</td>
            <td>${p.codigoBarras}</td>
            <td>${p.nombre}</td>
            <td>${p.categoria}</td>
            <td>${p.tipo}</td>
            <td>$${p.precio.toLocaleString()}</td>
            <td>${p.stock}</td>
            <td>
                <button class="btn" style="background: var(--warning); padding: 5px 10px; margin-right: 5px;" onclick="window.editarProducto(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn" style="background: var(--danger); padding: 5px 10px;" onclick="window.eliminarProducto(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.mostrarModalProducto = () => {
    document.getElementById('modalProductoTitulo').innerText = 'Nuevo Producto';
    document.getElementById('productoId').value = '';
    document.getElementById('formProducto').reset();
    document.getElementById('modalProducto').style.display = 'flex';
};

window.cerrarModalProducto = () => {
    document.getElementById('modalProducto').style.display = 'none';
};

window.editarProducto = (id) => {
    const productos = window.DB.getProductos();
    const producto = productos.find(p => p.id == id);
    if (producto) {
        document.getElementById('modalProductoTitulo').innerText = 'Editar Producto';
        document.getElementById('productoId').value = producto.id;
        document.getElementById('prodNombre').value = producto.nombre;
        document.getElementById('prodCategoria').value = producto.categoria;
        document.getElementById('prodTipo').value = producto.tipo;
        document.getElementById('prodPrecio').value = producto.precio;
        document.getElementById('prodStock').value = producto.stock;
        document.getElementById('modalProducto').style.display = 'flex';
    }
};

window.eliminarProducto = (id) => {
    if (confirm('¿Eliminar este producto?')) {
        window.DB.deleteProducto(id);
        window.cargarProductos();
        window.actualizarDashboard?.();
    }
};

// Guardar producto
document.addEventListener('submit', (e) => {
    if (e.target.id === 'formProducto') {
        e.preventDefault();
        const id = document.getElementById('productoId').value;
        const nombre = document.getElementById('prodNombre').value;
        const categoria = document.getElementById('prodCategoria').value;
        const tipo = document.getElementById('prodTipo').value;
        const precio = parseFloat(document.getElementById('prodPrecio').value);
        const stock = parseInt(document.getElementById('prodStock').value);
        
        if (id) {
            window.DB.updateProducto(id, { nombre, categoria, tipo, precio, stock });
        } else {
            const sku = `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const codigoBarras = `750${Math.floor(Math.random() * 1000000000)}`;
            window.DB.saveProducto({ nombre, categoria, tipo, precio, stock, sku, codigoBarras });
        }
        
        window.cerrarModalProducto();
        window.cargarProductos();
        window.actualizarDashboard?.();
    }
});
