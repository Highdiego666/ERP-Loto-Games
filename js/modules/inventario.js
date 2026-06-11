window.inventarioModule = () => `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <div>
      <h2>📊 Gestión de Inventario</h2>
      <p style="color: var(--text-muted);">Control de stock, carga masiva y reportes</p>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary" onclick="window.descargarPlantillaInventario()">
        <i class="fas fa-download"></i> Plantilla
      </button>
      <button class="btn btn-success" onclick="document.getElementById('excelInputInv').click()">
        <i class="fas fa-upload"></i> Cargar Excel
      </button>
      <button class="btn btn-warning" onclick="window.generarReporteInventario()">
        <i class="fas fa-file-alt"></i> Reporte
      </button>
    </div>
  </div>
  
  <input type="file" id="excelInputInv" accept=".xlsx, .xls, .csv" style="display: none;" onchange="window.procesarExcelInventario(this.files[0])">
  
  <!-- Tarjetas de resumen -->
  <div class="cards-grid" style="margin-bottom: 24px;">
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-boxes"></i></div>
      <div class="stat-value" id="totalProductosInv">0</div>
      <div class="stat-label">Total Productos</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
      <div class="stat-value" id="stockBajoInv">0</div>
      <div class="stat-label">Stock Bajo (<5)</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
      <div class="stat-value" id="valorInventarioInv">$0</div>
      <div class="stat-label">Valor del Inventario</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><i class="fas fa-box"></i></div>
      <div class="stat-value" id="productosAgotadosInv">0</div>
      <div class="stat-label">Productos Agotados</div>
    </div>
  </div>
  
  <!-- Filtros -->
  <div class="table-container" style="margin-bottom: 24px;">
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <div style="flex: 2;">
        <input type="text" id="buscarProductoInv" class="form-control" placeholder="🔍 Buscar por nombre o SKU..." onkeyup="window.filtrarInventario()">
      </div>
      <div style="width: 200px;">
        <select id="filtroCategoriaInv" class="form-control" onchange="window.filtrarInventario()">
          <option value="">Todas las categorías</option>
          <option value="consolas">🎮 Consolas</option>
          <option value="accesorios">🎧 Accesorios</option>
          <option value="videojuegos">🎮 Videojuegos</option>
          <option value="refacciones">🔧 Refacciones</option>
          <option value="servicios">🛠️ Servicios</option>
        </select>
      </div>
      <div style="width: 150px;">
        <select id="filtroStockInv" class="form-control" onchange="window.filtrarInventario()">
          <option value="">Todo el stock</option>
          <option value="bajo">Stock bajo (<5)</option>
          <option value="critico">Agotados (0)</option>
          <option value="normal">Stock normal</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="window.filtrarInventario()">
        <i class="fas fa-search"></i> Filtrar
      </button>
    </div>
  </div>
  
  <!-- Tabla de inventario -->
  <div class="table-container">
    <div style="overflow-x: auto;">
      <table style="width: 100%;">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Código</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Tipo</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Valor Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaInventario">
          <tr><td colspan="9" style="text-align: center;">Cargando inventario...</td</tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- Modal para ajustar stock -->
  <div id="modalAjusteStock" class="modal">
    <div class="modal-content" style="max-width: 450px;">
      <div class="modal-header">
        <h3>📦 Ajustar Stock</h3>
        <span class="close-modal" onclick="window.cerrarModalAjusteStock()">&times;</span>
      </div>
      <div id="infoProductoStock" style="margin-bottom: 20px; padding: 10px; background: var(--bg-dark); border-radius: 10px;"></div>
      <div class="form-group">
        <label>Stock actual:</label>
        <input type="number" id="stockActual" class="form-control" readonly>
      </div>
      <div class="form-group">
        <label>Nuevo stock:</label>
        <input type="number" id="nuevoStockInv" class="form-control" min="0">
      </div>
      <div class="form-group">
        <label>Motivo del ajuste:</label>
        <select id="motivoAjusteInv" class="form-control">
          <option value="inventario">📋 Inventario físico</option>
          <option value="compra">🛒 Compra a proveedor</option>
          <option value="devolucion">🔄 Devolución</option>
          <option value="merma">⚠️ Merma / Daño</option>
          <option value="venta">💵 Venta</option>
        </select>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn btn-primary" style="flex: 1;" onclick="window.guardarAjusteStock()">
          <i class="fas fa-save"></i> Guardar Cambio
        </button>
        <button class="btn btn-danger" style="flex: 1;" onclick="window.cerrarModalAjusteStock()">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </div>
  </div>
`;

// Variables globales
let inventarioProductos = [];
let productoAjuste = null;

// Cargar inventario
window.cargarInventario = async () => {
  inventarioProductos = await window.DB.getProductos();
  window.actualizarEstadisticasInventario();
  window.renderizarTablaInventario(inventarioProductos);
};

// Actualizar estadísticas
window.actualizarEstadisticasInventario = () => {
  const total = inventarioProductos.length;
  const stockBajo = inventarioProductos.filter(p => p.stock < 5 && p.stock > 0).length;
  const agotados = inventarioProductos.filter(p => p.stock === 0).length;
  const valorTotal = inventarioProductos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
  
  document.getElementById('totalProductosInv').innerHTML = total;
  document.getElementById('stockBajoInv').innerHTML = stockBajo;
  document.getElementById('valorInventarioInv').innerHTML = `$${valorTotal.toLocaleString()}`;
  document.getElementById('productosAgotadosInv').innerHTML = agotados;
};

// Renderizar tabla
window.renderizarTablaInventario = (productos) => {
  const tbody = document.getElementById('tablaInventario');
  if (!tbody) return;
  
  if (productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay productos registrados</td</tr>';
    return;
  }
  
  tbody.innerHTML = productos.map(p => {
    let stockClass = '';
    if (p.stock === 0) stockClass = 'style="color: var(--danger); font-weight: bold;"';
    else if (p.stock < 5) stockClass = 'style="color: var(--warning); font-weight: bold;"';
    
    return `
      <tr>
        <td><strong>${p.sku || 'N/A'}</strong></td>
        <td><small>${p.codigo_barras || 'N/A'}</small></td>
        <td>${p.nombre}</td>
        <td><span style="background: var(--primary); padding: 4px 8px; border-radius: 8px; font-size: 11px;">${p.categoria}</span></td>
        <td>${p.tipo || 'N/A'}</td>
        <td><strong style="color: var(--success);">$${parseFloat(p.precio).toLocaleString()}</strong></td>
        <td ${stockClass}>${p.stock} unidades</td>
        <td><strong>$${(p.precio * p.stock).toLocaleString()}</strong></td>
        <td>
          <button class="btn" style="background: var(--warning); padding: 5px 10px;" onclick="window.abrirModalAjusteStock(${p.id})">
            <i class="fas fa-edit"></i> Ajustar
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

// Filtrar inventario
window.filtrarInventario = () => {
  const busqueda = document.getElementById('buscarProductoInv').value.toLowerCase();
  const categoria = document.getElementById('filtroCategoriaInv').value;
  const filtroStock = document.getElementById('filtroStockInv').value;
  
  let filtrados = [...inventarioProductos];
  
  if (busqueda) {
    filtrados = filtrados.filter(p => 
      p.nombre?.toLowerCase().includes(busqueda) ||
      p.sku?.toLowerCase().includes(busqueda)
    );
  }
  
  if (categoria) {
    filtrados = filtrados.filter(p => p.categoria === categoria);
  }
  
  if (filtroStock === 'bajo') {
    filtrados = filtrados.filter(p => p.stock < 5 && p.stock > 0);
  } else if (filtroStock === 'critico') {
    filtrados = filtrados.filter(p => p.stock === 0);
  } else if (filtroStock === 'normal') {
    filtrados = filtrados.filter(p => p.stock >= 5);
  }
  
  window.renderizarTablaInventario(filtrados);
};

// Abrir modal de ajuste de stock
window.abrirModalAjusteStock = (id) => {
  productoAjuste = inventarioProductos.find(p => p.id == id);
  if (productoAjuste) {
    document.getElementById('infoProductoStock').innerHTML = `
      <strong>${productoAjuste.nombre}</strong><br>
      <small>SKU: ${productoAjuste.sku}</small>
    `;
    document.getElementById('stockActual').value = productoAjuste.stock;
    document.getElementById('nuevoStockInv').value = productoAjuste.stock;
    document.getElementById('modalAjusteStock').style.display = 'flex';
  }
};

// Cerrar modal
window.cerrarModalAjusteStock = () => {
  document.getElementById('modalAjusteStock').style.display = 'none';
  productoAjuste = null;
};

// Guardar ajuste de stock
window.guardarAjusteStock = async () => {
  if (!productoAjuste) return;
  
  const nuevoStock = parseInt(document.getElementById('nuevoStockInv').value);
  const motivo = document.getElementById('motivoAjusteInv').value;
  
  if (isNaN(nuevoStock) || nuevoStock < 0) {
    alert('Ingresa un stock válido');
    return;
  }
  
  if (nuevoStock === productoAjuste.stock) {
    alert('El stock no ha cambiado');
    window.cerrarModalAjusteStock();
    return;
  }
  
  await window.DB.updateProducto(productoAjuste.id, { stock: nuevoStock });
  
  // Registrar movimiento en consola (para bitácora)
  const cambio = nuevoStock - productoAjuste.stock;
  console.log(`📊 [INVENTARIO] ${productoAjuste.nombre}: ${productoAjuste.stock} → ${nuevoStock} (${cambio > 0 ? '+' : ''}${cambio}) - Motivo: ${motivo}`);
  
  window.cerrarModalAjusteStock();
  await window.cargarInventario();
  
  // Actualizar también en otros módulos si es necesario
  if (window.cargarProductos) await window.cargarProductos();
  if (window.cargarProductosVenta) await window.cargarProductosVenta();
  
  alert(`✅ Stock actualizado: ${productoAjuste.nombre}\n${productoAjuste.stock} → ${nuevoStock}`);
};

// Descargar plantilla Excel/CSV
window.descargarPlantillaInventario = () => {
  const headers = ['nombre', 'categoria', 'tipo', 'precio', 'stock', 'sku', 'codigo_barras'];
  const ejemplos = [
    ['PlayStation 5', 'consolas', 'nueva', '12500', '5', 'LOT-PS5-001', '750100000001'],
    ['Xbox Series X', 'consolas', 'nueva', '11800', '3', 'LOT-XBX-002', '750100000002'],
    ['Control DualSense', 'accesorios', 'nueva', '1500', '12', 'LOT-CTR-003', '750100000003'],
    ['Nintendo Switch', 'consolas', 'usada-completa', '4500', '2', 'LOT-NSW-004', '750100000004']
  ];
  
  const csv = [headers, ...ejemplos].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantilla_inventario_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  alert('📥 Plantilla descargada. Completa los datos y súbela con "Cargar Excel"');
};

// Procesar archivo Excel/CSV
window.procesarExcelInventario = async (file) => {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target.result;
    const lines = content.split('\n');
    const headers = lines[0].toLowerCase().split(',');
    
    let importados = 0;
    let errores = [];
    let actualizados = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const producto = {};
      
      headers.forEach((header, idx) => {
        producto[header.trim()] = values[idx] ? values[idx].trim() : '';
      });
      
      if (!producto.nombre) {
        errores.push(`Línea ${i + 1}: Nombre requerido`);
        continue;
      }
      
      const sku = producto.sku || `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const codigoBarras = producto.codigo_barras || `750${Math.floor(Math.random() * 1000000000)}`;
      
      const existe = inventarioProductos.find(p => p.sku === sku);
      
      if (existe) {
        await window.DB.updateProducto(existe.id, {
          nombre: producto.nombre,
          categoria: producto.categoria || 'consolas',
          tipo: producto.tipo || 'nueva',
          precio: parseFloat(producto.precio) || 0,
          stock: parseInt(producto.stock) || 0
        });
        actualizados++;
      } else {
        await window.DB.saveProducto({
          nombre: producto.nombre,
          categoria: producto.categoria || 'consolas',
          tipo: producto.tipo || 'nueva',
          precio: parseFloat(producto.precio) || 0,
          stock: parseInt(producto.stock) || 0,
          sku: sku,
          codigoBarras: codigoBarras
        });
        importados++;
      }
    }
    
    await window.cargarInventario();
    if (window.cargarProductos) await window.cargarProductos();
    if (window.cargarProductosVenta) await window.cargarProductosVenta();
    
    let mensaje = `✅ CARGA COMPLETADA\n\n📦 Productos nuevos: ${importados}\n🔄 Productos actualizados: ${actualizados}`;
    if (errores.length > 0) {
      mensaje += `\n\n⚠️ Errores (${errores.length}):\n${errores.slice(0, 5).join('\n')}`;
    }
    alert(mensaje);
  };
  
  reader.readAsText(file);
};

// Generar reporte de inventario
window.generarReporteInventario = () => {
  const agotados = inventarioProductos.filter(p => p.stock === 0);
  const bajoStock = inventarioProductos.filter(p => p.stock < 5 && p.stock > 0);
  const stockNormal = inventarioProductos.filter(p => p.stock >= 5);
  const valorTotal = inventarioProductos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
  
  let reporte = '📊 REPORTE DE INVENTARIO\n';
  reporte += '═══════════════════════════\n\n';
  reporte += `📦 Total productos: ${inventarioProductos.length}\n`;
  reporte += `💰 Valor total inventario: $${valorTotal.toLocaleString()}\n`;
  reporte += `🔴 Agotados (stock 0): ${agotados.length}\n`;
  reporte += `🟡 Stock bajo (<5): ${bajoStock.length}\n`;
  reporte += `🟢 Stock normal: ${stockNormal.length}\n\n`;
  
  if (agotados.length > 0) {
    reporte += '🔴 PRODUCTOS AGOTADOS:\n';
    agotados.forEach(p => { reporte += `  - ${p.nombre} (SKU: ${p.sku})\n`; });
    reporte += '\n';
  }
  
  if (bajoStock.length > 0) {
    reporte += '🟡 PRODUCTOS CON STOCK BAJO:\n';
    bajoStock.forEach(p => { reporte += `  - ${p.nombre}: ${p.stock} unidades\n`; });
  }
  
  alert(reporte);
};

// Inicializar
setTimeout(() => {
  if (document.getElementById('tablaInventario')) {
    window.cargarInventario();
  }
}, 100);
