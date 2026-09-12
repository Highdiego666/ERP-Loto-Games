// ============================================
// LOTO GAMES - INVENTARIO UI V2
// CSV explícito y existencias separadas por Local 14 / Local 20.
// ============================================

(function () {
  'use strict';

  const originalModule = window.inventarioModule;

  if (typeof originalModule === 'function') {
    window.inventarioModule = () => originalModule()
      .replace(/Cargar Excel/g, 'Cargar CSV')
      .replace('accept=".xlsx, .xls, .csv"', 'accept=".csv,text/csv"');
  }

  window.descargarPlantillaInventario = () => {
    const headers = ['nombre', 'categoria', 'tipo', 'precio', 'stock', 'local', 'sku', 'codigo_barras'];
    const ejemplos = [
      ['PlayStation 5', 'consolas', 'nueva', '12500', '5', '14', 'LOT-PS5-001', 'LGCODE-000001'],
      ['Xbox Series X', 'consolas', 'nueva', '11800', '3', '20', 'LOT-XBX-002', 'LGCODE-000002'],
      ['Control DualSense', 'accesorios', 'nueva', '1500', '12', '14', 'LOT-CTR-003', 'LGCODE-000003'],
      ['Nintendo Switch', 'consolas', 'usada-completa', '4500', '2', '20', 'LOT-NSW-004', 'LGCODE-000004']
    ];
    const csv = [headers, ...ejemplos].map(row => row.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `plantilla_inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    alert('📥 Plantilla CSV descargada. La columna local debe ser 14 o 20.');
  };

  function parseCsvLine(line) {
    // Importador deliberadamente simple para el piloto. La plantilla no usa
    // comas internas. Rechazamos filas con columnas extra en vez de adivinarlas.
    return line.split(',').map(value => value.trim());
  }

  window.procesarExcelInventario = file => {
    if (!file) return;
    const name = String(file.name || '').toLowerCase();
    if (!name.endsWith('.csv')) {
      alert('El importador actual acepta archivos CSV. Guarda tu hoja como CSV antes de cargarla.');
      const input = document.getElementById('excelInputInv');
      if (input) input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async event => {
      const content = String(event.target?.result || '').replace(/^\uFEFF/, '');
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) return alert('El CSV no contiene productos.');

      const headers = parseCsvLine(lines[0]).map(value => value.toLowerCase());
      const required = ['nombre', 'precio', 'stock', 'local'];
      const missing = required.filter(field => !headers.includes(field));
      if (missing.length) return alert(`Faltan columnas obligatorias: ${missing.join(', ')}.`);

      let importados = 0;
      let actualizados = 0;
      const errores = [];
      let products = await window.DB.getProductos();

      for (let i = 1; i < lines.length; i += 1) {
        try {
          const values = parseCsvLine(lines[i]);
          if (values.length > headers.length) throw new Error('La fila contiene comas adicionales; corrige el CSV.');
          const row = {};
          headers.forEach((header, index) => { row[header] = values[index] || ''; });

          const nombre = String(row.nombre || '').trim();
          const local = String(row.local || '').trim();
          const precio = Number(row.precio);
          const stock = Number.parseInt(row.stock, 10);
          if (!nombre) throw new Error('Nombre requerido.');
          if (!['14', '20'].includes(local)) throw new Error('Local debe ser 14 o 20.');
          if (!Number.isFinite(precio) || precio < 0) throw new Error('Precio inválido.');
          if (!Number.isFinite(stock) || stock < 0) throw new Error('Stock inválido.');

          const sku = String(row.sku || '').trim() || `LOT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          const codigo = String(row.codigo_barras || '').trim() || `LGCODE-${Date.now()}-${i}`;
          const existing = products.find(product => String(product.sku || '').trim().toLowerCase() === sku.toLowerCase());

          if (existing) {
            if (typeof window.DB.getStocksByStore === 'function') {
              const split = window.DB.getStocksByStore(existing);
              if (Number(split?.unassigned || 0) > 0) {
                throw new Error('Tiene existencias sin asignar; corrígelo manualmente antes de importar.');
              }
            }

            await window.DB.updateProducto(existing.id, {
              nombre,
              categoria: row.categoria || existing.categoria || 'consolas',
              tipo: row.tipo || existing.tipo || 'nueva',
              precio
            });

            if (typeof window.DB.setStocksByStore === 'function') {
              const current = await window.DB.getProductoById(existing.id);
              const split = window.DB.getStocksByStore(current);
              const next14 = local === '14' ? stock : Number(split['14'] || 0);
              const next20 = local === '20' ? stock : Number(split['20'] || 0);
              await window.DB.setStocksByStore(existing.id, next14, next20, { keepUnassigned: false });
            } else {
              await window.DB.updateProducto(existing.id, { stock, local });
            }
            actualizados += 1;
          } else {
            await window.DB.saveProducto({
              nombre,
              categoria: row.categoria || 'consolas',
              tipo: row.tipo || 'nueva',
              precio,
              stock,
              local,
              sku,
              codigoBarras: codigo
            });
            importados += 1;
          }

          products = await window.DB.getProductos();
        } catch (error) {
          errores.push(`Línea ${i + 1}: ${error?.message || error}`);
        }
      }

      await window.cargarInventario?.();
      await window.cargarProductos?.();
      await window.cargarProductosVenta?.();

      let message = `✅ CARGA COMPLETADA\n\n📦 Nuevos: ${importados}\n🔄 Actualizados: ${actualizados}`;
      if (errores.length) message += `\n\n⚠️ Errores (${errores.length}):\n${errores.slice(0, 8).join('\n')}`;
      alert(message);
      const input = document.getElementById('excelInputInv');
      if (input) input.value = '';
    };
    reader.readAsText(file);
  };

  console.log('✅ Inventario UI V2: CSV por Local 14/20 + códigos internos');
})();
