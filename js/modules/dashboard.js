cat > js/modules/dashboard.js << 'EOF'
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

window.actualizarDashboard = async () => {
    console.log('📊 Actualizando dashboard...');
    
    try {
        const productos = await window.DB.getProductos();
        const ventas = await window.DB.getVentas();
        const servicios = await window.DB.getServicios();
        const clientes = await window.DB.getClientes();
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        
        const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
        const totalHoy = ventasHoy.reduce((s, v) => s + (v.total || 0), 0);
        
        const ventasSemana = ventas.filter(v => new Date(v.fecha) >= inicioSemana);
        const totalSemana = ventasSemana.reduce((s, v) => s + (v.total || 0), 0);
        
        document.getElementById('ventasHoy').innerHTML = `$${totalHoy.toLocaleString()}`;
        document.getElementById('ventasSemana').innerHTML = `$${totalSemana.toLocaleString()}`;
        document.getElementById('totalProductos').innerHTML = productos.length;
        document.getElementById('serviciosPendientes').innerHTML = servicios.filter(s => s.estado === 'pendiente').length;
        document.getElementById('clientesTotales').innerHTML = clientes.length;
        
        const stockBajo = productos.filter(p => p.stock < 5).length;
        document.getElementById('stockBajoBadge').innerHTML = stockBajo > 0 ? `⚠️ ${stockBajo} con stock bajo` : '';
        
        const ventasProductos = {};
        ventas.forEach(v => {
            if (v.items) {
                v.items.forEach(item => {
                    if (item.tipo !== 'rapida' && item.nombre) {
                        ventasProductos[item.nombre] = (ventasProductos[item.nombre] || 0) + (item.cantidad || 0);
                    }
                });
            }
        });
        
        const top = Object.entries(ventasProductos).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('productoMasVendido').innerHTML = top ? `${top[0]} (${top[1]} uds)` : '-';
        
        const ctx = document.getElementById('ventasChart')?.getContext('2d');
        if (ctx) {
            if (window.ventasChartInstance) window.ventasChartInstance.destroy();
            
            const ultimos7 = [];
            for (let i = 6; i >= 0; i--) {
                const fecha = new Date();
                fecha.setDate(fecha.getDate() - i);
                fecha.setHours(0, 0, 0, 0);
                const total = ventas.filter(v => new Date(v.fecha) >= fecha && new Date(v.fecha) < new Date(fecha.getTime() + 86400000))
                    .reduce((s, v) => s + (v.total || 0), 0);
                ultimos7.push({ fecha: fecha.toLocaleDateString('es-MX', { weekday: 'short' }), total });
            }
            
            window.ventasChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ultimos7.map(d => d.fecha),
                    datasets: [{ label: 'Ventas', data: ultimos7.map(d => d.total), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4 }]
                },
                options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { y: { ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } }
            });
        }
        
        const top5 = Object.entries(ventasProductos).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topContainer = document.getElementById('topProductos');
        if (topContainer) {
            topContainer.innerHTML = top5.length ? top5.map(([n, c], i) => `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid var(--border)"><span><strong>${i+1}.</strong> ${n}</span><span style="color:var(--success)">${c} uds</span></div>`).join('') : '<p style="text-align:center">Sin ventas</p>';
        }
        
        const recent = [...ventas].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).slice(0,10);
        const actContainer = document.getElementById('actividadReciente');
        if (actContainer) {
            actContainer.innerHTML = recent.length ? recent.map(v => `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid var(--border)"><div><i class="fas fa-shopping-cart"></i> Venta #${v.id}</div><div>$${(v.total||0).toLocaleString()}</div><div style="font-size:12px">${new Date(v.fecha).toLocaleString()}</div></div>`).join('') : '<p style="text-align:center">Sin actividad</p>';
        }
        
        console.log('✅ Dashboard actualizado');
    } catch(e) {
        console.error('Error en dashboard:', e);
    }
};

console.log('📊 Módulo Dashboard listo');
EOF
