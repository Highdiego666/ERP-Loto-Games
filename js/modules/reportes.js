window.reportesModule = () => `
  <div style="margin-bottom: 24px;">
    <h2>📈 Reportes</h2>
    <p style="color: var(--text-muted);">Estadísticas y análisis de ventas</p>
  </div>
  
  <div class="table-container" style="margin-bottom: 24px;">
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      <div style="flex:1;"><label>Desde</label><input type="date" id="reporteFechaInicio" class="form-control"></div>
      <div style="flex:1;"><label>Hasta</label><input type="date" id="reporteFechaFin" class="form-control"></div>
      <div style="display:flex; align-items:flex-end;"><button class="btn btn-primary" onclick="window.actualizarReportes()">Filtrar</button></div>
      <div style="display:flex; align-items:flex-end;"><button class="btn btn-success" onclick="window.exportarReporteCSV()">Exportar CSV</button></div>
    </div>
  </div>
  
  <div class="cards-grid">
    <div class="stat-card"><div class="stat-value" id="reporteTotalVentas">$0</div><div class="stat-label">Total Ventas</div></div>
    <div class="stat-card"><div class="stat-value" id="reporteNumeroVentas">0</div><div class="stat-label">Ventas realizadas</div></div>
    <div class="stat-card"><div class="stat-value" id="reporteTicketPromedio">$0</div><div class="stat-label">Ticket promedio</div></div>
  </div>
  
  <div class="table-container">
    <h3>📋 Detalle de ventas</h3>
    <div style="overflow-x:auto;"><table style="width:100%"><thead><tr><th>ID</th><th>Fecha</th><th>Items</th><th>Total</th><th>Método</th></tr></thead><tbody id="reporteTablaVentas"></tbody></table></div>
  </div>
`;

let reporteVentasData = [];

window.actualizarReportes = async () => {
  let ventas = await window.DB.getVentas();
  const inicio = document.getElementById('reporteFechaInicio').value;
  const fin = document.getElementById('reporteFechaFin').value;
  if (inicio) ventas = ventas.filter(v => new Date(v.fecha) >= new Date(inicio));
  if (fin) ventas = ventas.filter(v => new Date(v.fecha) <= new Date(fin + 'T23:59:59'));
  reporteVentasData = ventas;
  const total = ventas.reduce((s, v) => s + (v.total || 0), 0);
  const num = ventas.length;
  document.getElementById('reporteTotalVentas').innerHTML = `$${total.toLocaleString()}`;
  document.getElementById('reporteNumeroVentas').innerHTML = num;
  document.getElementById('reporteTicketPromedio').innerHTML = `$${(num ? total / num : 0).toLocaleString()}`;
  const tbody = document.getElementById('reporteTablaVentas');
  if (tbody) {
    tbody.innerHTML = ventas.slice(-20).reverse().map(v => `
      <tr><td>#${v.id}</td><td>${new Date(v.fecha).toLocaleDateString()}</td><td>${(v.items || []).length} items</td><td><strong>$${(v.total || 0).toLocaleString()}</strong></td><td>${v.metodo_pago || v.metodoPago || '-'}</td></tr>
    `).join('');
  }
};

window.exportarReporteCSV = () => {
  if (!reporteVentasData.length) return alert('No hay datos');
  const csv = [['ID', 'Fecha', 'Total', 'IVA', 'Método'], ...reporteVentasData.map(v => [v.id, v.fecha, v.total, v.iva, v.metodo_pago || v.metodoPago])].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reporte_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(blob);
};

setTimeout(() => {
  if (document.getElementById('reporteTablaVentas')) {
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    document.getElementById('reporteFechaInicio').value = inicio.toISOString().slice(0, 10);
    document.getElementById('reporteFechaFin').value = hoy.toISOString().slice(0, 10);
    window.actualizarReportes();
  }
}, 100);
