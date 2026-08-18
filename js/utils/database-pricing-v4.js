// ============================================
// LOTO GAMES POS - PRICING V4
// Precio capturado = precio base; precio público = base + 5%
// ============================================

(function () {
  'use strict';

  const db = window.DB;
  if (!db) {
    console.error('❌ database-pricing-v4.js requiere window.DB');
    return;
  }

  const MARKUP = 1.05;
  const round2 = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const numberOr = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const hasSupabase = () => !!window.supabase;
  const localGet = key => JSON.parse(localStorage.getItem(key) || '[]');
  const localSet = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const previousUpdateProducto = db.updateProducto?.bind(db);

  const fieldFor = (tipo, base = false) => {
    const suffix = ['cliente', 'mayorista', 'plaza'].includes(tipo) ? tipo : 'cliente';
    return base ? `precio_base_${suffix}` : `precio_${suffix}`;
  };

  db.getPrecioBaseProducto = function (producto, tipo = 'cliente') {
    if (!producto) return 0;
    const baseField = fieldFor(tipo, true);
    const publicField = fieldFor(tipo, false);
    const explicitBase = Number(producto[baseField]);
    if (Number.isFinite(explicitBase)) return round2(explicitBase);

    const publicPrice = numberOr(producto[publicField], numberOr(producto.precio, 0));
    if (producto.precio_markup_5_aplicado === true) return round2(publicPrice / MARKUP);
    return round2(publicPrice);
  };

  db.getPrecioPublicoDesdeBase = base => round2(numberOr(base, 0) * MARKUP);

  db.saveProducto = async function (producto) {
    const baseCliente = round2(producto.precio_base_cliente ?? producto.precio_cliente ?? producto.precioCliente ?? producto.precio);
    const baseMayorista = round2(producto.precio_base_mayorista ?? producto.precio_mayorista ?? producto.precioMayorista ?? baseCliente);
    const basePlaza = round2(producto.precio_base_plaza ?? producto.precio_plaza ?? producto.precioPlaza ?? baseCliente);

    const publicoCliente = db.getPrecioPublicoDesdeBase(baseCliente);
    const publicoMayorista = db.getPrecioPublicoDesdeBase(baseMayorista);
    const publicoPlaza = db.getPrecioPublicoDesdeBase(basePlaza);

    const payload = {
      nombre: producto.nombre,
      sku: producto.sku,
      codigo_barras: producto.codigo_barras ?? producto.codigoBarras ?? '',
      categoria: producto.categoria,
      tipo: producto.tipo,
      local: producto.local || '',
      stock: parseInt(producto.stock, 10) || 0,
      precio: publicoCliente,
      precio_cliente: publicoCliente,
      precio_mayorista: publicoMayorista,
      precio_plaza: publicoPlaza,
      precio_base_cliente: baseCliente,
      precio_base_mayorista: baseMayorista,
      precio_base_plaza: basePlaza,
      precio_markup_5_aplicado: true,
      created_at: new Date().toISOString()
    };

    if (hasSupabase()) {
      const { data, error } = await window.supabase.from('productos').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }

    const rows = localGet('productos');
    const row = { ...payload, id: Date.now(), createdAt: payload.created_at };
    rows.push(row);
    localSet('productos', rows);
    return row;
  };

  db.updateProducto = async function (id, data) {
    const hasAnyPrice = [
      'precio_base_cliente', 'precio_base_mayorista', 'precio_base_plaza',
      'precio_cliente', 'precio_mayorista', 'precio_plaza',
      'precioCliente', 'precioMayorista', 'precioPlaza', 'precio'
    ].some(key => Object.prototype.hasOwnProperty.call(data, key));

    if (!hasAnyPrice) {
      return previousUpdateProducto ? previousUpdateProducto(id, data) : false;
    }

    const payload = {};
    ['nombre', 'categoria', 'tipo', 'local', 'sku', 'codigo_barras'].forEach(key => {
      if (data[key] !== undefined) payload[key] = data[key];
    });
    if (data.codigoBarras !== undefined) payload.codigo_barras = data.codigoBarras;
    if (data.stock !== undefined) payload.stock = parseInt(data.stock, 10);

    const current = await db.getProductoById(id);
    const baseCliente = round2(
      data.precio_base_cliente ?? data.precio_cliente ?? data.precioCliente ?? data.precio ?? db.getPrecioBaseProducto(current, 'cliente')
    );
    const baseMayorista = round2(
      data.precio_base_mayorista ?? data.precio_mayorista ?? data.precioMayorista ?? db.getPrecioBaseProducto(current, 'mayorista')
    );
    const basePlaza = round2(
      data.precio_base_plaza ?? data.precio_plaza ?? data.precioPlaza ?? db.getPrecioBaseProducto(current, 'plaza')
    );

    payload.precio_base_cliente = baseCliente;
    payload.precio_base_mayorista = baseMayorista;
    payload.precio_base_plaza = basePlaza;
    payload.precio_cliente = db.getPrecioPublicoDesdeBase(baseCliente);
    payload.precio_mayorista = db.getPrecioPublicoDesdeBase(baseMayorista);
    payload.precio_plaza = db.getPrecioPublicoDesdeBase(basePlaza);
    payload.precio = payload.precio_cliente;
    payload.precio_markup_5_aplicado = true;

    if (hasSupabase()) {
      const { error } = await window.supabase.from('productos').update(payload).eq('id', id);
      if (error) throw error;
      return true;
    }

    const rows = localGet('productos');
    const index = rows.findIndex(row => String(row.id) === String(id));
    if (index < 0) return false;
    rows[index] = { ...rows[index], ...payload };
    localSet('productos', rows);
    return true;
  };

  console.log('✅ Pricing V4: captura base + 5% automático + precio base recuperable');
})();
