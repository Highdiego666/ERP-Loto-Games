window.dashboardModule = () => {
    const stats = window.DB.getStats();
    
    return `
        <div class="cards-grid">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">
                        <i class="fas fa-boxes"></i>
                    </div>
                    <i class="fas fa-ellipsis-h"></i>
                </div>
                <div class="stat-value">${stats.totalProductos}</div>
                <div class="stat-label">Productos Registrados</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                </div>
                <div class="stat-value">${stats.stockBajo}</div>
                <div class="stat-label">Productos con Stock Bajo</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                </div>
                <div class="stat-value">${stats.ventasHoy}</div>
                <div class="stat-label">Ventas Hoy</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                </div>
                <div class="stat-value">$${stats.totalVentasHoy.toLocaleString()}</div>
                <div class="stat-label">Ingresos Hoy</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">
                        <i class="fas fa-tools"></i>
                    </div>
                </div>
                <div class="stat-value">${stats.serviciosPendientes}</div>
                <div class="stat-label">Servicios Pendientes</div>
            </div>
        </div>
        
        <div class="table-container">
            <h3 style="margin-bottom: 20px;">📦 Últimos Productos Agregados</h3>
            <table>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                    </tr>
                </thead>
                <tbody id="ultimosProductos">
                </tbody>
            </table>
        </div>
        
        <div class="table-container" style="margin-top: 24px;">
            <h3 style="margin-bottom: 20px;">🛒 Últimas Ventas</h3>
            <table>
                <thead>
                    <tr>
                        <th>ID Venta</th>
                        <th>Fecha</th>
                        <th>Productos</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody id="ultimasVentas">
                </tbody>
            </table>
        </div>
    `;
};

window.actualizarDashboard = () => {
    const productos = window.DB.getProductos();
    const ultimosProductos = productos.slice(-5).reverse();
    
    const tbodyProductos = document.getElementById('ultimosProductos');
    if (tbodyProductos) {
        tbodyProductos.innerHTML = ultimosProductos.map(p => `
            <tr>
                <td>${p.sku}</td>
                <td>${p.nombre}</td>
                <td>${p.categoria}</td>
                <td>$${p.precio.toLocaleString()}</td>
                <td>${p.stock}</td>
            </tr>
        `).join('');
    }
    
    const ventas = window.DB.getVentas();
    const ultimasVentas = ventas.slice(-5).reverse();
    
    const tbodyVentas = document.getElementById('ultimasVentas');
    if (tbodyVentas) {
        tbodyVentas.innerHTML = ultimasVentas.map(v => `
            <tr>
                <td>#${v.id}</td>
                <td>${new Date(v.fecha).toLocaleString()}</td>
                <td>${v.items.length} productos</td>
                <td>$${v.total.toLocaleString()}</td>
            </tr>
        `).join('');
    }
};
