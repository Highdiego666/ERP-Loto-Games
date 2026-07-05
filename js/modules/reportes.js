// ============================================
// LOTO GAMES POS - MÓDULO DE REPORTES AVANZADOS
// CON IMPRESIÓN EN MINI PRINTER
// ============================================

window.reportesModule = () => {
  return `
    <div style="margin-bottom: 24px;">
      <h2>📈 Reportes y Corte de Caja</h2>
      <p style="color: var(--text-muted);">Estadísticas detalladas de ventas, inventario y movimientos</p>
    </div>

    <!-- Tabs de reportes -->
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px;">
      <button class="btn btn-primary" onclick="window.cambiarReporte('corte')" id="tabCorte">💰 Corte de Caja</button>
      <button class="btn" style="background: var(--bg-card);" onclick="window.cambiarReporte('ventas')" id="tabVentas">📊 Ventas</button>
      <button class="btn" style="background: var(--bg-card);" onclick="window.cambiarReporte('usuario')" id="tabUsuario">👤 Ventas por Usuario</button>
      <button class="btn" style="background: var(--bg-card);" onclick="window.cambiarReporte('inventario')" id="tabInventario">📦 Movimientos de Inventario</button>
      <button class="btn" style="background: var(--bg-card);" onclick="window.cambiarReporte('existencias')" id="tabExistencias">📊 Existencias</button>
      <button class="btn" style="background: var(--bg-card);" onclick="window.cambiarReporte('servicios')" id="tabServicios">🔧 Servicios</button>
    </div>

    <!-- Contenedor del reporte activo -->
    <div id="reporteContenido"></div>
  `;
};

// Variables globales
let reporteActivo = 'corte';
let reporteVentasData = [];
let reporteTraspasosData = [];

// Cambiar entre pestañas
window.cambiarReporte = (tipo) => {
  reporteActivo = tipo;
  // Actualizar estilos de tabs
  document.querySelectorAll('[id^="tab"]').forEach(btn => {
    btn.style.background = 'var(--bg-card)';
    btn.style.color = 'var(--text)';
  });
  const tabMap = {
    corte: 'tabCorte',
    ventas: 'tabVentas',
    usuario: 'tabUsuario',
    inventario: 'tabInventario',
    existencias: 'tabExistencias',
    servicios: 'tabServicios'
  };
  const activeBtn = document.getElementById(tabMap[tipo]);
  if (activeBtn) {
    activeBtn.style.background = 'var(--primary)';
    activeBtn.style.color = 'white';
  }
  window.actualizarReporte();
};

// Actualizar el reporte según el tipo activo
window.actualizarReporte = async () => {
  const container = document.getElementById('reporteContenido');
  if (!container) return;

  switch (reporteActivo) {
    case 'corte':
      await window.generarCorteCaja(container);
      break;
    case 'ventas':
      await window.generarReporteVentas(container);
      break;
    case 'usuario':
      await window.generarReporteUsuario(container);
      break;
    case 'inventario':
      await window.generarReporteInventario(container);
      break;
    case 'existencias':
      await window.generarReporteExistencias(container);
      break;
    case 'servicios':
      await window.generarReporteServicios(container);
      break;
    default:
      container.innerHTML = '<p>Selecciona un reporte</p>';
  }
};

// ============================================
// 1. CORTE DE CAJA CON IMPRESIÓN
// ============================================

window.generarCorteCaja = async (container) => {
  const ventas = await window.DB.getVentas();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);

  const totalVentas = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
  const numVentas = ventasHoy.length;

  // Totales por método de pago
  const metodos = {};
  ventasHoy.forEach(v => {
    const metodo = v.metodo_pago || v.metodoPago || 'Efectivo';
    metodos[metodo] = (metodos[metodo] || 0) + (v.total || 0);
  });

  // Productos más vendidos hoy
  const productosVendidos = {};
  ventasHoy.forEach(v => {
    if (v.items) {
      v.items.forEach(item => {
        if (item.tipo !== 'rapida' && item.nombre) {
          productosVendidos[item.nombre] = (productosVendidos[item.nombre] || 0) + (item.cantidad || 0);
        }
      });
    }
  });
  const topProductos = Object.entries(productosVendidos).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Últimas ventas
  const ultimasVentas = ventasHoy.slice(-10).reverse();

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-dollar-sign"></i></div><div class="stat-value">$${totalVentas.toFixed(2)}</div><div class="stat-label">Total Ventas Hoy</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-receipt"></i></div><div class="stat-value">${numVentas}</div><div class="stat-label">Número de Ventas</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fas fa-ticket"></i></div><div class="stat-value">$${(numVentas > 0 ? (totalVentas / numVentas) : 0).toFixed(2)}</div><div class="stat-label">Ticket Promedio</div></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <div class="table-container">
        <h3>💳 Totales por Método de Pago</h3>
        <table>
          <thead><tr><th>Método</th><th>Total</th></tr></thead>
          <tbody>
            ${Object.entries(metodos).map(([metodo, total]) => `
              <tr><td>${metodo}</td><td><strong>$${total.toFixed(2)}</strong></td></tr>
            `).join('')}
            ${Object.keys(metodos).length === 0 ? '<tr><td colspan="2">Sin ventas hoy</td></tr>' : ''}
          </tbody>
        </table>
      </div>
      <div class="table-container">
        <h3>🏆 Top 5 Productos Más Vendidos</h3>
        <table>
          <thead><tr><th>Producto</th><th>Cantidad</th></tr></thead>
          <tbody>
            ${topProductos.map(([nombre, cantidad]) => `
              <tr><td>${nombre}</td><td><strong>${cantidad}</strong></td></tr>
            `).join('')}
            ${topProductos.length === 0 ? '<tr><td colspan="2">Sin ventas hoy</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>

    <div class="table-container">
      <h3>🕐 Últimas Ventas del Día</h3>
      <table>
        <thead><tr><th>ID</th><th>Fecha</th><th>Items</th><th>Total</th><th>Método</th><th>Vendedor</th></tr></thead>
        <tbody>
          ${ultimasVentas.map(v => `
            <tr>
              <td>#${v.id}</td>
              <td>${new Date(v.fecha).toLocaleTimeString()}</td>
              <td>${(v.items || []).length}</td>
              <td><strong>$${(v.total || 0).toFixed(2)}</strong></td>
              <td>${v.metodo_pago || v.metodoPago || 'Efectivo'}</td>
              <td>${v.usuario || 'Admin'}</td>
            </tr>
          `).join('')}
          ${ultimasVentas.length === 0 ? '<tr><td colspan="6">Sin ventas hoy</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
      <button class="btn btn-success" onclick="window.exportarCorteCSV()">📥 Exportar Corte de Caja</button>
      <button class="btn btn-primary" onclick="window.imprimirCorteMiniPrinter()" 
              style="background: #10b981; color: white; padding: 12px 24px; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: bold;">
        🖨️ Imprimir en Mini Printer
      </button>
    </div>
  `;
};

// ============================================
// EXPORTAR CORTE A CSV
// ============================================

window.exportarCorteCSV = async () => {
  const ventas = await window.DB.getVentas();
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
  if (ventasHoy.length === 0) return alert('No hay ventas hoy');
  const rows = ventasHoy.map(v => [v.id, new Date(v.fecha).toLocaleString(), v.total, v.metodo_pago || v.metodoPago, v.usuario || 'Admin']);
  const csv = [['ID','Fecha','Total','Método','Vendedor'], ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `corte_caja_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(blob);
};

// ============================================
// IMPRIMIR CORTE EN MINI PRINTER
// ============================================

window.imprimirCorteMiniPrinter = async () => {
  try {
    const ventas = await window.DB.getVentas();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
    
    if (ventasHoy.length === 0) {
      alert('📊 No hay ventas registradas hoy');
      return;
    }

    const totalVentas = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
    
    // Ventas por método de pago
    const metodoPago = {};
    ventasHoy.forEach(v => {
      const metodo = v.metodo_pago || v.metodoPago || 'Efectivo';
      metodoPago[metodo] = (metodoPago[metodo] || 0) + (v.total || 0);
    });

    // Abrir ventana de impresión
    const win = window.open('', '_blank', 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no,scrollbars=no');
    if (!win) {
      alert('❌ Permite ventanas emergentes para imprimir');
      return;
    }

    const fecha = new Date().toLocaleString();
    const fechaCorta = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();

    // Detalle de ventas (últimas 10)
    const detallesVentas = ventasHoy.slice(-10).reverse().map(v => {
      const horaVenta = new Date(v.fecha).toLocaleTimeString();
      return `<div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #ddd; font-size: 10px;">
        <span>${horaVenta}</span>
        <span>${v.usuario || 'Admin'}</span>
        <span style="font-weight: bold;">$${(v.total || 0).toFixed(2)}</span>
      </div>`;
    }).join('');

    // Métodos de pago
    const metodosHtml = Object.entries(metodoPago).map(([metodo, total]) => {
      return `<div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px;">
        <span>${metodo}</span>
        <span style="font-weight: bold;">$${total.toFixed(2)}</span>
      </div>`;
    }).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Corte de Caja</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 11px;
            padding: 5px;
            width: 80mm;
            min-height: 200mm;
            margin: 0 auto;
            background: #fff;
            line-height: 1.5;
          }
          .corte { text-align: center; }
          .corte .logo { 
            font-size: 20px; 
            font-weight: bold; 
            letter-spacing: 2px;
            color: #1e293b;
          }
          .corte .logo span { color: #10b981; }
          .corte .subtitle {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }
          .corte hr { 
            border: none; 
            border-top: 1px dashed #aaa; 
            margin: 6px 0; 
          }
          .corte .info-line {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            padding: 2px 0;
          }
          .corte .total-grande {
            font-size: 26px;
            font-weight: bold;
            color: #10b981;
            padding: 10px 0;
          }
          .corte .metodos {
            text-align: left;
            padding: 4px 0;
          }
          .corte .detalle-ventas {
            text-align: left;
            max-height: 200px;
            overflow-y: auto;
          }
          .corte .footer {
            font-size: 9px;
            color: #888;
            margin-top: 8px;
            border-top: 1px dashed #aaa;
            padding-top: 6px;
          }
          .corte .garantia {
            text-align: left;
            font-size: 9px;
            color: #555;
            padding: 6px 0;
            border-top: 1px dashed #ddd;
            margin-top: 6px;
            line-height: 1.4;
          }
          .corte .garantia strong { color: #222; }
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          @media print {
            body { padding: 3px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="corte">
          <div class="logo">LOTO <span>GAMES</span></div>
          <div class="subtitle">Sistema POS - Corte de Caja</div>
          <hr>
          
          <div class="info-line">
            <span>📅 Fecha:</span>
            <span>${fechaCorta}</span>
          </div>
          <div class="info-line">
            <span>🕐 Hora:</span>
            <span>${hora}</span>
          </div>
          <div class="info-line">
            <span>📋 Ventas:</span>
            <span>${ventasHoy.length}</span>
          </div>
          <hr>
          
          <div class="total-grande">
            $${totalVentas.toFixed(2)}
          </div>
          <hr>
          
          <div class="metodos">
            <strong>💳 Desglose por método:</strong>
            ${metodosHtml}
          </div>
          <hr>
          
          <div style="text-align: left;">
            <strong>📋 Últimas ventas:</strong>
            <div class="detalle-ventas">
              ${detallesVentas}
            </div>
          </div>
          <hr>
          
          <div class="garantia">
            <strong>⚠️ TÉRMINOS DE GARANTÍA</strong><br>
            • Garantía por reparación: 30 días<br>
            • No cubre daños por líquidos, golpes o mal uso<br>
            • Etiqueta de seguridad debe estar intacta<br>
            • Guarda este ticket como comprobante<br>
          </div>
          <hr>
          
          <div class="footer">
            ¡Gracias por tu preferencia!<br>
            LOTO GAMES - Sistema POS<br>
            ${new Date().getFullYear()}
          </div>
        </div>
        <script>
          setTimeout(function() { window.print(); }, 500);
        <\/script>
      </body>
      </html>
    `);
    win.document.close();

  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al imprimir: ' + error.message);
  }
};

// ============================================
// 2. REPORTE DE VENTAS POR PERÍODO
// ============================================

window.generarReporteVentas = async (container) => {
  container.innerHTML = `
    <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px; align-items: flex-end;">
      <div><label>Desde</label><input type="date" id="repFechaInicio" class="form-control" style="width:auto;"></div>
      <div><label>Hasta</label><input type="date" id="repFechaFin" class="form-control" style="width:auto;"></div>
      <div><button class="btn btn-primary" onclick="window.filtrarVentasPeriodo()">Filtrar</button></div>
      <div><button class="btn btn-success" onclick="window.exportarVentasCSV()">📥 Exportar CSV</button></div>
    </div>
    <div id="tablaVentasPeriodo" class="table-container"></div>
  `;
  // Cargar por defecto últimos 30 días
  const hoy = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  document.getElementById('repFechaInicio').value = inicio.toISOString().slice(0,10);
  document.getElementById('repFechaFin').value = hoy.toISOString().slice(0,10);
  window.filtrarVentasPeriodo();
};

window.filtrarVentasPeriodo = async () => {
  const inicio = document.getElementById('repFechaInicio').value;
  const fin = document.getElementById('repFechaFin').value;
  let ventas = await window.DB.getVentas();
  if (inicio) ventas = ventas.filter(v => new Date(v.fecha) >= new Date(inicio));
  if (fin) ventas = ventas.filter(v => new Date(v.fecha) <= new Date(fin + 'T23:59:59'));
  reporteVentasData = ventas;
  const total = ventas.reduce((s, v) => s + (v.total || 0), 0);
  const num = ventas.length;
  const container = document.getElementById('tablaVentasPeriodo');
  if (!container) return;
  container.innerHTML = `
    <div style="display: flex; gap: 20px; margin-bottom: 15px;">
      <span><strong>Total Ventas:</strong> $${total.toFixed(2)}</span>
      <span><strong>Número:</strong> ${num}</span>
      <span><strong>Promedio:</strong> $${(num > 0 ? total/num : 0).toFixed(2)}</span>
    </div>
    <table>
      <thead><tr><th>ID</th><th>Fecha</th><th>Items</th><th>Total</th><th>Método</th><th>Vendedor</th></tr></thead>
      <tbody>
        ${ventas.map(v => `
          <tr><td>#${v.id}</td><td>${new Date(v.fecha).toLocaleString()}</td><td>${(v.items||[]).length}</td><td><strong>$${(v.total||0).toFixed(2)}</strong></td><td>${v.metodo_pago||v.metodoPago||'Efectivo'}</td><td>${v.usuario||'Admin'}</td></tr>
        `).join('')}
        ${ventas.length === 0 ? '<tr><td colspan="6">Sin datos</td></tr>' : ''}
      </tbody>
    </table>
  `;
};

window.exportarVentasCSV = () => {
  if (reporteVentasData.length === 0) return alert('No hay datos para exportar');
  const rows = reporteVentasData.map(v => [v.id, new Date(v.fecha).toLocaleString(), v.total, v.metodo_pago||v.metodoPago, v.usuario||'Admin']);
  const csv = [['ID','Fecha','Total','Método','Vendedor'], ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ventas_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(blob);
};

// ============================================
// 3. VENTAS POR USUARIO
// ============================================

window.generarReporteUsuario = async (container) => {
  const ventas = await window.DB.getVentas();
  const usuarios = {};
  ventas.forEach(v => {
    const user = v.usuario || 'Admin';
    usuarios[user] = usuarios[user] || { count: 0, total: 0 };
    usuarios[user].count += 1;
    usuarios[user].total += (v.total || 0);
  });
  const data = Object.entries(usuarios).map(([user, stats]) => ({ user, ...stats }));
  container.innerHTML = `
    <div class="table-container">
      <h3>👤 Ventas por Usuario</h3>
      <table>
        <thead><tr><th>Usuario</th><th>Ventas</th><th>Total Vendido</th><th>Ticket Promedio</th></tr></thead>
        <tbody>
          ${data.map(u => `
            <tr><td><strong>${u.user}</strong></td><td>${u.count}</td><td>$${u.total.toFixed(2)}</td><td>$${(u.count > 0 ? u.total/u.count : 0).toFixed(2)}</td></tr>
          `).join('')}
          ${data.length === 0 ? '<tr><td colspan="4">Sin datos</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
};

// ============================================
// 4. MOVIMIENTOS DE INVENTARIO (TRASPASOS)
// ============================================

window.generarReporteInventario = async (container) => {
  const traspasos = await window.DB.getTraspasos();
  container.innerHTML = `
    <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px; align-items: flex-end;">
      <div><label>Desde</label><input type="date" id="invFechaInicio" class="form-control" style="width:auto;"></div>
      <div><label>Hasta</label><input type="date" id="invFechaFin" class="form-control" style="width:auto;"></div>
      <div><button class="btn btn-primary" onclick="window.filtrarInventarioMovimientos()">Filtrar</button></div>
    </div>
    <div id="tablaInventarioMov" class="table-container"></div>
  `;
  const hoy = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  document.getElementById('invFechaInicio').value = inicio.toISOString().slice(0,10);
  document.getElementById('invFechaFin').value = hoy.toISOString().slice(0,10);
  window.filtrarInventarioMovimientos();
};

window.filtrarInventarioMovimientos = async () => {
  const inicio = document.getElementById('invFechaInicio').value;
  const fin = document.getElementById('invFechaFin').value;
  let traspasos = await window.DB.getTraspasos();
  if (inicio) traspasos = traspasos.filter(t => new Date(t.fecha) >= new Date(inicio));
  if (fin) traspasos = traspasos.filter(t => new Date(t.fecha) <= new Date(fin + 'T23:59:59'));
  reporteTraspasosData = traspasos;
  const container = document.getElementById('tablaInventarioMov');
  if (!container) return;
  container.innerHTML = `
    <table>
      <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead>
      <tbody>
        ${traspasos.map(t => `
          <tr>
            <td>${new Date(t.fecha).toLocaleString()}</td>
            <td>${t.producto_nombre}</td>
            <td style="color: ${t.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)'}">${t.tipo === 'entrada' ? '✅ Entrada' : '❌ Salida'}</td>
            <td>${t.cantidad}</td>
            <td>${t.motivo || '-'}</td>
            <td>${t.usuario || 'Admin'}</td>
          </tr>
        `).join('')}
        ${traspasos.length === 0 ? '<tr><td colspan="6">Sin movimientos</td></tr>' : ''}
      </tbody>
    </table>
  `;
};

// ============================================
// 5. EXISTENCIAS ACTUALES
// ============================================

window.generarReporteExistencias = async (container) => {
  const productos = await window.DB.getProductos();
  const totalValor = productos.reduce((s, p) => s + (p.precio * p.stock), 0);
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="stat-card"><div class="stat-value">${productos.length}</div><div class="stat-label">Total Productos</div></div>
      <div class="stat-card"><div class="stat-value">${productos.filter(p => p.stock < 5).length}</div><div class="stat-label">Stock Bajo</div></div>
      <div class="stat-card"><div class="stat-value">$${totalValor.toFixed(2)}</div><div class="stat-label">Valor Inventario</div></div>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Precio</th><th>Valor Total</th></tr></thead>
        <tbody>
          ${productos.map(p => `
            <tr>
              <td>${p.sku}</td>
              <td>${p.nombre}</td>
              <td>${p.categoria}</td>
              <td style="${p.stock < 5 ? 'color:var(--danger)' : ''}">${p.stock}</td>
              <td>$${p.precio}</td>
              <td>$${(p.precio * p.stock).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ============================================
// 6. SERVICIOS TÉCNICOS
// ============================================

window.generarReporteServicios = async (container) => {
  const servicios = await window.DB.getServicios();
  const pendientes = servicios.filter(s => s.estado === 'pendiente').length;
  const completados = servicios.filter(s => s.estado === 'completado' || s.estado === 'entregado').length;
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="stat-card"><div class="stat-value">${servicios.length}</div><div class="stat-label">Total Servicios</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--warning)">${pendientes}</div><div class="stat-label">Pendientes</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--success)">${completados}</div><div class="stat-label">Completados</div></div>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Equipo</th><th>Estado</th><th>Precio</th></tr></thead>
        <tbody>
          ${servicios.map(s => `
            <tr>
              <td>#${s.id}</td>
              <td>${new Date(s.created_at || s.createdAt).toLocaleDateString()}</td>
              <td>${s.cliente_nombre || '-'}</td>
              <td>${s.equipo}</td>
              <td>${s.estado}</td>
              <td>$${(s.precio || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          ${servicios.length === 0 ? '<tr><td colspan="6">Sin servicios</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
};

// ============================================
// INICIALIZACIÓN
// ============================================

setTimeout(() => {
  if (document.getElementById('reporteContenido')) {
    window.cambiarReporte('corte');
  }
}, 100);
