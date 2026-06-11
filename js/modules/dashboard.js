// ============================================
// LOTO GAMES POS - DASHBOARD PRINCIPAL
// ============================================

window.dashboardModule = () => {
    return `
        <div class="cards-grid">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                <div class="stat-value" id="ventasHoy">$0</div>
                <div class="stat-label">Ventas Hoy</div>
                <small id="tendenciaVentas" style="color: var(--success);">+0% vs ayer</small>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-calendar-week"></i></div>
                <div class="stat-value" id="ventasSemana">$0</div>
                <div class="stat-label">Ventas Esta Semana</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-boxes"></i></div>
                <div class="stat-value" id="totalProductos">0</div>
                <div class="stat-label">Productos</div>
                <small id="stockBajoBadge" style="color: var(--warning);"></small>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-tools"></i></div>
                <div class="stat-value" id="serviciosPendientes">0</div>
                <div class="stat-label">Servicios Pendientes</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-value" id="clientesTotales">0</div>
                <div class="stat-label">Clientes Registrados</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-chart-pie"></i></div>
                <div class="stat-value" id="productoMasVendido">-</div>
                <div class="stat-label">Producto Más Vendido</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px;">
            <div class="table-container">
                <h3>📈 Ventas Últimos 7 Días</h3>
                <canvas id="ventasChart" style="max-height: 300px; width: 100%;"></canvas>
            </div>
            <div class="table-container">
                <h3>🥇 Top 5 Productos Más Vendidos</h3>
                <div id="topProductos" style="max-height: 300px; overflow-y: auto;">
                    <p style="text-align: center; color: var(--text-muted);">Cargando...</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <h3>🕐 Actividad Reciente</h3>
            <div id="actividadReciente" style="max-height: 300px; overflow-y: auto;">
                <p style="text-align: center; color: var(--text-muted);">Cargando actividad...</p>
            </div>
        </div>
    `;
};

// Función para actualizar el dashboard
window.actualizarDashboard = async () => {
    console.log('📊 Actualizando dashboard...');
    
    try {
        // Obtener datos
        const productos = await window.DB.getProductos();
        const ventas = await window.DB.getVentas();
        const servicios = await window.DB.getServicios();
        const clientes = await window.DB.getClientes();
        
        console.log(`📦 Datos cargados: ${productos.length} productos, ${ventas.length} ventas`);
        
        // ========== VENTAS HOY ==========
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const ventasHoy = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta >= hoy;
        });
        const totalHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const ventasHoyElement = document.getElementById('ventasHoy');
        if (ventasHoyElement) ventasHoyElement.innerHTML = `$${totalHoy.toLocaleString()}`;
        
        // ========== VENTAS SEMANA ==========
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        
        const ventasSemana = ventas.filter(v => new Date(v.fecha) >= inicioSemana);
        const totalSemana = ventasSemana.reduce((sum, v) => sum + (v.total || 0), 0);
        
        const ventasSemanaElement = document.getElementById('ventasSemana');
        if (ventasSemanaElement) ventasSemanaElement.innerHTML = `$${totalSemana.toLocaleString()}`;
        
        // ========== TENDENCIA ==========
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        ayer.setHours(0, 0, 0, 0);
        
        const ventasAyer = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta >= ayer && fechaVenta < hoy;
        });
        const totalAyer = ventasAyer.reduce((sum, v) => sum + (v.total || 0), 0);
        
        let tendencia = 0;
        if (totalAyer > 0) {
            tendencia = ((totalHoy - totalAyer) / totalAyer * 100);
        } else if (totalHoy > 0) {
            tendencia = 100;
        }
        
        const tendenciaElement = document.getElementById('tendenciaVentas');
        if (tendenciaElement) {
            tendenciaElement.innerHTML = `${tendencia >= 0 ? '+' : ''}${tendencia.toFixed(0)}% vs ayer`;
            tendenciaElement.style.color = tendencia >= 0 ? 'var(--success)' : 'var(--danger)';
        }
        
        // ========== PRODUCTOS ==========
        const totalProductosElement = document.getElementById('totalProductos');
        if (totalProductosElement) totalProductosElement.innerHTML = productos.length;
        
        const stockBajo = productos.filter(p => (p.stock || 0) < 5).length;
        const stockBajoBadge = document.getElementById('stockBajoBadge');
        if (stockBajoBadge) {
            stockBajoBadge.innerHTML = stockBajo > 0 ? `⚠️ ${stockBajo} con stock bajo` : '';
        }
        
        // ========== SERVICIOS PENDIENTES ==========
        const pendientes = servicios.filter(s => s.estado === 'pendiente').length;
        const serviciosElement = document.getElementById('serviciosPendientes');
        if (serviciosElement) serviciosElement.innerHTML = pendientes;
        
        // ========== CLIENTES ==========
        const clientesElement = document.getElementById('clientesTotales');
        if (clientesElement) clientesElement.innerHTML = clientes.length;
        
        // ========== PRODUCTO MÁS VENDIDO ==========
        const ventasProductos = {};
        ventas.forEach(venta => {
            if (venta.items && Array.isArray(venta.items)) {
                venta.items.forEach(item => {
                    if (item.tipo !== 'rapida' && item.nombre) {
                        const nombre = item.nombre;
                        ventasProductos[nombre] = (ventasProductos[nombre] || 0) + (item.cantidad || 0);
                    }
                });
            }
        });
        
        const topProducto = Object.entries(ventasProductos).sort((a, b) => b[1] - a[1])[0];
        const productoTopElement = document.getElementById('productoMasVendido');
        if (productoTopElement) {
            productoTopElement.innerHTML = topProducto ? `${topProducto[0]} (${topProducto[1]} uds)` : 'Sin ventas';
        }
        
        // ========== GRÁFICO DE VENTAS ==========
        const ultimos7Dias = [];
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            fecha.setHours(0, 0, 0, 0);
            const fechaFin = new Date(fecha);
            fechaFin.setDate(fechaFin.getDate() + 1);
            
            const totalDia = ventas.filter(v => {
                const fechaVenta = new Date(v.fecha);
                return fechaVenta >= fecha && fechaVenta < fechaFin;
            }).reduce((sum, v) => sum + (v.total || 0), 0);
            
            ultimos7Dias.push({
                fecha: fecha.toLocaleDateString('es-MX', { weekday: 'short' }),
                total: totalDia
            });
        }
        
        const ctx = document.getElementById('ventasChart')?.getContext('2d');
        if (ctx) {
            if (window.ventasChartInstance) {
                window.ventasChartInstance.destroy();
            }
            window.ventasChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ultimos7Dias.map(d => d.fecha),
                    datasets: [{
                        label: 'Ventas ($)',
                        data: ultimos7Dias.map(d => d.total),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { labels: { color: '#94a3b8' } },
                        tooltip: { callbacks: { label: (ctx) => `$${ctx.raw.toLocaleString()}` } }
                    },
                    scales: {
                        y: { 
                            ticks: { color: '#94a3b8', callback: (v) => `$${v.toLocaleString()}` },
                            grid: { color: '#334155' }
                        },
                        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                    }
                }
            });
        }
        
        // ========== TOP 5 PRODUCTOS ==========
        const top5 = Object.entries(ventasProductos).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topContainer = document.getElementById('topProductos');
        if (topContainer) {
            if (top5.length === 0) {
                topContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No hay ventas registradas</p>';
            } else {
                topContainer.innerHTML = top5.map(([nombre, cantidad], i) => `
                    <div style="display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
                        <span><strong>${i + 1}.</strong> ${nombre}</span>
                        <span style="color: var(--success); font-weight: bold;">${cantidad} unidades</span>
                    </div>
                `).join('');
            }
        }
        
        // ========== ACTIVIDAD RECIENTE ==========
        const ultimasVentas = [...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);
        const activityContainer = document.getElementById('actividadReciente');
        if (activityContainer) {
            if (ultimasVentas.length === 0) {
                activityContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No hay actividad reciente</p>';
            } else {
                activityContainer.innerHTML = ultimasVentas.map(v => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border);">
                        <div>
                            <i class="fas fa-shopping-cart" style="color: var(--primary);"></i>
                            <strong> Venta #${v.id}</strong>
                        </div>
                        <div style="color: var(--success); font-weight: bold;">$${(v.total || 0).toLocaleString()}</div>
                        <div style="color: var(--text-muted); font-size: 12px;">${new Date(v.fecha).toLocaleString()}</div>
                    </div>
                `).join('');
            }
        }
        
        console.log('✅ Dashboard actualizado correctamente');
        
    } catch (error) {
        console.error('❌ Error al actualizar dashboard:', error);
    }
};

// Inicializar dashboard cuando el módulo esté listo
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (document.getElementById('ventasHoy')) {
            window.actualizarDashboard();
        }
    }, 500);
}
