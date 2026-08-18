// ============================================
// LOTO GAMES POS - PRODUCTOS V2
// Tres listas de precio: cliente / mayorista / plaza
// ============================================

(function () {
  'use strict';

  let productosDataV2 = [];

  const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  window.productosModule = () => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div><h2 style="margin:0;">📦 Productos</h2><p style="color:var(--text-muted);margin:4px 0 0;">Catálogo, stock y listas de precio</p></div>
      <button class="btn btn-primary" onclick="window.mostrarModalProducto()"><i class="fas fa-plus"></i> Nuevo producto</button>
    </div>

    <div class="table-container">
      <div style="display:grid;grid-template-columns:minmax(220px,1fr) 180px 150px;gap:10px;margin-bottom:16px;">
        <input id="buscarProductoInput" class="form-control" placeholder="🔍 Nombre, SKU o código de barras" oninput="window.filtrarProductos()">
        <select id="filtroCategoria" class="form-control" onchange="window.filtrarProductos()">
          <option value="">Todas las categorías</option>
          <option value="consolas">Consolas</option><option value="accesorios">Accesorios</option><option value="videojuegos">Videojuegos</option><option value="refacciones">Refacciones</option><option value="servicios">Servicios</option>
        </select>
        <select id="filtroLocal" class="form-control" onchange="window.filtrarProductos()">
          <option value="">Todos los locales</option><option value="14">Local 14</option><option value="20">Local 20</option>
        </select>
      </div>
      <div style="overflow:auto;">
        <table style="width:100%;">
          <thead><tr><th>SKU</th><th>Producto</th><th>Local</th><th>Cliente</th><th>Mayorista</th><th>Plaza</th><th>Stock</th><th>Acciones</th></tr></thead>
          <tbody id="tablaProductos"><tr><td colspan="8" style="text-align:center;">Cargando...</td></tr></tbody>
        </table>
      </div>
    </div>

    <div id="modalProducto" class="modal">
      <div class="modal-content" style="max-width:760px;">
        <div class="modal-header"><h3 id="modalProductoTitulo">Nuevo Producto</h3><span class="close-modal" onclick="window.cerrarModalProducto()">&times;</span></div>
        <form id="formProducto">
          <input type="hidden" id="productoId">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div class="form-group" style="grid-column:1/-1;"><label>Nombre *</label><input id="prodNombre" class="form-control" required></div>
            <div class="form-group"><label>Categoría *</label><select id="prodCategoria" class="form-control" required><option value="consolas">Consolas</option><option value="accesorios">Accesorios</option><option value="videojuegos">Videojuegos</option><option value="refacciones">Refacciones</option><option value="servicios">Servicios</option></select></div>
            <div class="form-group"><label>Tipo *</label><select id="prodTipo" class="form-control" required><option value="nueva">Nueva</option><option value="usada-completa">Usada completa</option><option value="segunda-mano">Segunda mano</option><option value="pieza">Pieza / Refacción</option></select></div>
            <div class="form-group"><label>Local *</label><select id="prodLocal" class="form-control" required><option value="">Seleccionar</option><option value="14">Local 14</option><option value="20">Local 20</option></select></div>
            <div class="form-group"><label>Stock *</label><input type="number" min="0" id="prodStock" class="form-control" required></div>
          </div>

          <div style="margin:8px 0 14px;padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg-dark);">
            <strong>💲 Listas de precio</strong>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:10px;">
              <div class="form-group"><label>Cliente *</label><input type="number" min="0" step="0.01" id="prodPrecioCliente" class="form-control" required></div>
              <div class="form-group"><label>Mayorista *</label><input type="number" min="0" step="0.01" id="prodPrecioMayorista" class="form-control" required></div>
              <div class="form-group"><label>Venta a plaza *</label><input type="number" min="0" step="0.01" id="prodPrecioPlaza" class="form-control" required></div>
            </div>
            <small style="color:var(--text-muted);">El precio Cliente se mantiene también como precio base para compatibilidad con módulos antiguos.</small>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;">Guardar producto</button>
        </form>
      </div>
    </div>
  `;

  window.cargarProductos = async () => {
    productosDataV2 = await window.DB.getProductos();
    window.renderizarTablaProductos(productosDataV2);
  };

  window.renderizarTablaProductos = productos => {
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;
    if (!productos.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px;">No hay productos registrados</td></tr>';
      return;
    }
    tbody.innerHTML = productos.map(p => `
      <tr>
        <td><strong>${p.sku || 'N/A'}</strong><br><small>${p.codigo_barras || ''}</small></td>
        <td><strong>${p.nombre}</strong><br><small>${p.categoria || ''}</small></td>
        <td>${p.local ? `Local ${p.local}` : '-'}</td>
        <td>${money(window.DB.getPrecioProducto(p,'cliente'))}</td>
        <td>${money(window.DB.getPrecioProducto(p,'mayorista'))}</td>
        <td>${money(window.DB.getPrecioProducto(p,'plaza'))}</td>
        <td style="${Number(p.stock)<5?'color:var(--warning);font-weight:bold;':''}">${p.stock || 0}</td>
        <td style="white-space:nowrap;">
          <button class="btn" style="background:var(--warning);padding:6px 10px;" onclick="window.editarProducto(${p.id})" title="Editar">✏️</button>
          <button class="btn" style="background:var(--success);padding:6px 10px;" onclick="window.imprimirEtiqueta?.(${p.id})" title="Etiqueta">🖨️</button>
          <button class="btn" style="background:var(--danger);padding:6px 10px;" onclick="window.eliminarProducto(${p.id})" title="Eliminar">🗑️</button>
        </td>
      </tr>`).join('');
  };

  window.filtrarProductos = () => {
    const q = (document.getElementById('buscarProductoInput')?.value || '').trim().toLowerCase();
    const cat = document.getElementById('filtroCategoria')?.value || '';
    const local = document.getElementById('filtroLocal')?.value || '';
    const result = productosDataV2.filter(p =>
      (!q || String(p.nombre||'').toLowerCase().includes(q) || String(p.sku||'').toLowerCase().includes(q) || String(p.codigo_barras||'').toLowerCase().includes(q)) &&
      (!cat || p.categoria === cat) && (!local || String(p.local) === String(local))
    );
    window.renderizarTablaProductos(result);
  };

  window.mostrarModalProducto = () => {
    document.getElementById('modalProductoTitulo').textContent = 'Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('modalProducto').style.display = 'flex';
    setTimeout(() => document.getElementById('prodNombre')?.focus(), 0);
  };

  window.cerrarModalProducto = () => { document.getElementById('modalProducto').style.display = 'none'; };

  window.editarProducto = id => {
    const p = productosDataV2.find(x => String(x.id) === String(id));
    if (!p) return;
    document.getElementById('modalProductoTitulo').textContent = 'Editar Producto';
    document.getElementById('productoId').value = p.id;
    document.getElementById('prodNombre').value = p.nombre || '';
    document.getElementById('prodCategoria').value = p.categoria || 'consolas';
    document.getElementById('prodTipo').value = p.tipo || 'nueva';
    document.getElementById('prodLocal').value = p.local || '';
    document.getElementById('prodStock').value = p.stock || 0;
    document.getElementById('prodPrecioCliente').value = window.DB.getPrecioProducto(p,'cliente');
    document.getElementById('prodPrecioMayorista').value = window.DB.getPrecioProducto(p,'mayorista');
    document.getElementById('prodPrecioPlaza').value = window.DB.getPrecioProducto(p,'plaza');
    document.getElementById('modalProducto').style.display = 'flex';
  };

  window.eliminarProducto = async id => {
    const p = productosDataV2.find(x => String(x.id) === String(id));
    if (!p || !confirm(`¿Eliminar ${p.nombre}?`)) return;
    try {
      await window.DB.deleteProducto(id);
      await window.cargarProductos();
      await window.cargarProductosVenta?.();
    } catch (error) { alert('❌ No se pudo eliminar: ' + error.message); }
  };

  document.addEventListener('submit', async e => {
    if (e.target.id !== 'formProducto') return;
    e.preventDefault();
    const id = document.getElementById('productoId').value;
    const data = {
      nombre: document.getElementById('prodNombre').value.trim(),
      categoria: document.getElementById('prodCategoria').value,
      tipo: document.getElementById('prodTipo').value,
      local: document.getElementById('prodLocal').value,
      stock: parseInt(document.getElementById('prodStock').value,10),
      precio_cliente: Number(document.getElementById('prodPrecioCliente').value),
      precio_mayorista: Number(document.getElementById('prodPrecioMayorista').value),
      precio_plaza: Number(document.getElementById('prodPrecioPlaza').value)
    };
    if (!data.local) return alert('Selecciona un local.');
    if ([data.precio_cliente,data.precio_mayorista,data.precio_plaza].some(v => !Number.isFinite(v) || v < 0)) return alert('Revisa los tres precios.');

    try {
      if (id) await window.DB.updateProducto(id, data);
      else {
        const sku = `LOT-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
        await window.DB.saveProducto({ ...data, sku, codigoBarras: sku });
      }
      window.cerrarModalProducto();
      await window.cargarProductos();
      await window.cargarProductosVenta?.();
    } catch (error) {
      console.error(error);
      alert('❌ Error guardando producto: ' + error.message);
    }
  });

  console.log('✅ Productos V2 activo: Cliente / Mayorista / Plaza');
})();
