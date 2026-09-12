// ============================================
// LOTO GAMES - INVENTARIO UI V1
// El importador actual es CSV; no anuncia XLS/XLSX que todavía no sabe leer.
// ============================================

(function () {
  'use strict';

  const originalModule = window.inventarioModule;
  const originalProcess = window.procesarExcelInventario;

  if (typeof originalModule === 'function') {
    window.inventarioModule = () => originalModule()
      .replace(/Cargar Excel/g, 'Cargar CSV')
      .replace('accept=".xlsx, .xls, .csv"', 'accept=".csv,text/csv"');
  }

  if (typeof originalProcess === 'function') {
    window.procesarExcelInventario = file => {
      if (!file) return;
      const name = String(file.name || '').toLowerCase();
      if (!name.endsWith('.csv')) {
        alert('El importador actual acepta archivos CSV. Guarda tu hoja como CSV antes de cargarla.');
        const input = document.getElementById('excelInputInv');
        if (input) input.value = '';
        return;
      }
      return originalProcess(file);
    };
  }

  window.descargarPlantillaInventario = () => {
    const headers = ['nombre', 'categoria', 'tipo', 'precio', 'stock', 'sku', 'codigo_barras'];
    const ejemplos = [
      ['PlayStation 5', 'consolas', 'nueva', '12500', '5', 'LOT-PS5-001', 'LGCODE-000001'],
      ['Xbox Series X', 'consolas', 'nueva', '11800', '3', 'LOT-XBX-002', 'LGCODE-000002'],
      ['Control DualSense', 'accesorios', 'nueva', '1500', '12', 'LOT-CTR-003', 'LGCODE-000003'],
      ['Nintendo Switch', 'consolas', 'usada-completa', '4500', '2', 'LOT-NSW-004', 'LGCODE-000004']
    ];
    // El parser heredado aún es simple y no interpreta comas dentro de campos.
    // La plantilla evita comas internas para seguir siendo compatible.
    const csv = [headers, ...ejemplos].map(row => row.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `plantilla_inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    alert('📥 Plantilla CSV descargada. Complétala y cárgala desde Inventario.');
  };

  console.log('✅ Inventario UI V1: importación anunciada correctamente como CSV');
})();
