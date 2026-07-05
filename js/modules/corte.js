// ============================================
// MÓDULO DE CORTE DE CAJA
// ============================================

window.corteModule = () => {
    return `
        <div class="page-header">
            <h2><i class="fas fa-cash-register" style="color: #10b981;"></i> Corte de Caja</h2>
            <p>Resumen de ventas y cierre de caja</p>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <h3>📊 Resumen del Día</h3>
                <div id="resumenCorte">
                    <p>Cargando datos...</p>
                </div>
            </div>

            <div class="card">
                <h3>💳 Ventas por Método de Pago</h3>
                <div id="ventasPorMetodo">
                    <p>Cargando...</p>
                </div>
            </div>

            <div class="card" style="grid-column: 1 / -1;">
                <h3>📋 Lista de Ventas del Día</h3>
                <div id="listaVentasCorte">
                    <p>Cargando ventas...</p>
                </div>
            </div>

            <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, #10b981, #059669); color: white;">
                <h3 style="color: white;">💰 Total Recaudado</h3>
                <div id="totalCorte" style="font-size: 48px; font-weight: bold; text-align: center;">
                    $0.00
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: center;">
                    <button class="btn btn-primary" onclick="window.imprimirCorteCompleto()">
                        <i class="fas fa-print"></i> Imprimir Corte
                    </button>
                    <button class="btn btn-success" onclick="window.cerrarCorte()">
                        <i class="fas fa-check-circle"></i> Cerrar Corte
                    </button>
                </div>
            </div>
        </div>
    `;
};

// Cargar datos del corte
window.cargarCorte = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const ventas = await window.DB.getVentasPorFecha(today);
        
        if (!ventas || ventas.length === 0) {
            document.getElementById('resumenCorte').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox" style="font-size: 48px; color: var(--text-muted);"></i>
                    <p>No hay ventas registradas hoy</p>
                </div>
            `;
            document.getElementById('totalCorte').innerHTML = '$0.00';
            document.getElementById('listaVentasCorte').innerHTML = '<p>No hay ventas</p>';
            return;
        }

        // Resumen
        const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
        const cantidadVentas = ventas.length;
        
        document.getElementById('resumenCorte').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div style="text-align: center; padding: 15px; background: var(--bg-dark); border-radius: 12px;">
                    <div style="font-size: 28px; font-weight: bold; color: #10b981;">${cantidadVentas}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">Ventas Totales</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--bg-dark); border-radius: 12px;">
                    <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">$${totalVentas.toFixed(2)}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">Total Recaudado</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--bg-dark); border-radius: 12px;">
                    <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${new Date().toLocaleDateString()}</div>
                    <div style="color: var(--text-muted); font-size: 14px;">Fecha</div>
                </div>
            </div>
        `;

        document.getElementById('totalCorte').innerHTML = `$${totalVentas.toFixed(2)}`;

        // Ventas por método de pago
        const metodoPago = {};
        ventas.forEach(v => {
            const metodo = v.metodoPago || 'efectivo';
            metodoPago[metodo] = (metodoPago[metodo] || 0) + v.total;
        });

        document.getElementById('ventasPorMetodo').innerHTML = Object.entries(metodoPago)
            .map(([metodo, total]) => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
                    <span>${metodo.charAt(0).toUpperCase() + metodo.slice(1)}</span>
                    <span style="font-weight: bold;">$${total.toFixed(2)}</span>
                </div>
            `).join('');

        // Lista de ventas
        document.getElementById('listaVentasCorte').innerHTML = `
            <div style="max-height: 300px; overflow-y: auto;">
                ${ventas.map(v => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
                        <span>#${v.id || 'N/A'}</span>
                        <span>${new Date(v.fecha).toLocaleTimeString()}</span>
                        <span>${v.usuario || 'Admin'}</span>
                        <span style="font-weight: bold; color: #10b981;">$${v.total.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error cargando corte:', error);
        document.getElementById('resumenCorte').innerHTML = `
            <div class="error-module">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar datos del corte</p>
                <small>${error.message}</small>
            </div>
        `;
    }
};

// Imprimir corte completo
window.imprimirCorteCompleto = () => {
    const totalElement = document.getElementById('totalCorte');
    if (!totalElement) return;
    
    const total = totalElement.textContent;
    const fecha = new Date().toLocaleString();
    
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) {
        alert('Permite ventanas emergentes para imprimir');
        return;
    }
    
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Corte de Caja</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Arial', sans-serif;
                    font-size: 12px;
                    padding: 10px;
                    width: 74mm;
                    margin: 0 auto;
                    background: #fff;
                }
                .corte { text-align: center; }
                .corte hr { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
                .corte .total {
                    font-size: 28px;
                    font-weight: bold;
                    color: #10b981;
                    padding: 15px 0;
                }
                @page { size: 74mm auto; margin: 0; }
                @media print { body { padding: 5px; } }
            </style>
        </head>
        <body>
            <div class="corte">
                <h2>📊 CORTE DE CAJA</h2>
                <div style="font-size: 11px; color: #666;">${fecha}</div>
                <hr>
                <div style="font-size: 14px; font-weight: bold;">Total Recaudado</div>
                <div class="total">${total}</div>
                <hr>
                <div style="font-size: 10px; color: #888; margin-top: 10px;">
                    LOTO GAMES POS - Corte generado automáticamente
                </div>
            </div>
            <script>
                setTimeout(function() { window.print(); }, 500);
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
};

// Cerrar corte
window.cerrarCorte = () => {
    if (confirm('¿Estás seguro de cerrar el corte de caja del día?')) {
        alert('✅ Corte cerrado correctamente');
        window.cargarCorte();
    }
};

// Inicializar módulo
setTimeout(() => {
    if (document.getElementById('resumenCorte')) {
        window.cargarCorte();
    }
}, 200);
