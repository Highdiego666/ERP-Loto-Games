// ============================================
// LOTO GAMES POS - DATABASE V2
// Capa de compatibilidad y correcciones finales
// ============================================

(function () {
  'use strict';

  const db = window.DB;
  if (!db) {
    console.error('❌ database-v2.js requiere window.DB');
    return;
  }

  const hasSupabase = () => !!window.supabase;
  const localGet = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const localSet = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const numberOr = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  // ------------------------------------------------------------
  // PRODUCTOS
  // ------------------------------------------------------------
  db.getPrecioProducto = function (producto, tipo = 'cliente') {
    if (!producto) return 0;
    const fallback = numberOr(producto.precio, 0);
    const campos = {
      cliente: 'precio_cliente',
      mayorista: 'precio_mayorista',
      plaza: 'precio_plaza'
    };
    return numberOr(producto[campos[tipo] || 'precio_cliente'], fallback);
  };

  db.saveProducto = async function (producto) {
    const precioCliente = numberOr(producto.precio_cliente ?? producto.precioCliente ?? producto.precio, 0);
    const payload = {
      nombre: producto.nombre,
      sku: producto.sku,
      codigo_barras: producto.codigo_barras ?? producto.codigoBarras ?? '',
      categoria: producto.categoria,
      tipo: producto.tipo,
      local: producto.local || '',
      precio: precioCliente, // compatibilidad con módulos antiguos
      precio_cliente: precioCliente,
      precio_mayorista: numberOr(producto.precio_mayorista ?? producto.precioMayorista, precioCliente),
      precio_plaza: numberOr(producto.precio_plaza ?? producto.precioPlaza, precioCliente),
      stock: parseInt(producto.stock, 10) || 0,
      created_at: new Date().toISOString()
    };

    if (hasSupabase()) {
      const { data, error } = await window.supabase.from('productos').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }

    const productos = localGet('productos');
    const row = { ...payload, id: Date.now(), createdAt: payload.created_at };
    productos.push(row);
    localSet('productos', productos);
    return row;
  };

  // IMPORTANTE: actualización PARCIAL. La versión anterior sobrescribía
  // nombre/categoría/precio con undefined al actualizar únicamente el stock.
  db.updateProducto = async function (id, data) {
    const payload = {};
    const copy = (source, target = source) => {
      if (Object.prototype.hasOwnProperty.call(data, source) && data[source] !== undefined) {
        payload[target] = data[source];
      }
    };

    copy('nombre');
    copy('categoria');
    copy('tipo');
    copy('local');
    copy('sku');
    copy('codigo_barras');
    if (data.codigoBarras !== undefined) payload.codigo_barras = data.codigoBarras;
    if (data.stock !== undefined) payload.stock = parseInt(data.stock, 10);

    if (data.precio_cliente !== undefined || data.precioCliente !== undefined) {
      const v = numberOr(data.precio_cliente ?? data.precioCliente, 0);
      payload.precio_cliente = v;
      payload.precio = v;
    } else if (data.precio !== undefined) {
      const v = numberOr(data.precio, 0);
      payload.precio = v;
      payload.precio_cliente = v;
    }
    if (data.precio_mayorista !== undefined || data.precioMayorista !== undefined) {
      payload.precio_mayorista = numberOr(data.precio_mayorista ?? data.precioMayorista, 0);
    }
    if (data.precio_plaza !== undefined || data.precioPlaza !== undefined) {
      payload.precio_plaza = numberOr(data.precio_plaza ?? data.precioPlaza, 0);
    }

    if (Object.keys(payload).length === 0) return true;

    if (hasSupabase()) {
      const { error } = await window.supabase.from('productos').update(payload).eq('id', id);
      if (error) throw error;
      return true;
    }

    const productos = localGet('productos');
    const index = productos.findIndex(p => String(p.id) === String(id));
    if (index < 0) return false;
    productos[index] = { ...productos[index], ...payload };
    localSet('productos', productos);
    return true;
  };

  // Alias de compatibilidad para código antiguo de traspasos.
  db.actualizarProductoLocal = async function (id, data) {
    return db.updateProducto(id, data);
  };

  // ------------------------------------------------------------
  // CLIENTES
  // ------------------------------------------------------------
  db.saveCliente = async function (cliente) {
    const payload = {
      nombre: cliente.nombre,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      tipo_cliente: cliente.tipo_cliente || 'cliente',
      credito_habilitado: !!cliente.credito_habilitado,
      notas: cliente.notas || '',
      created_at: new Date().toISOString()
    };
    if (hasSupabase()) {
      const { data, error } = await window.supabase.from('clientes').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }
    const clientes = localGet('clientes');
    const row = { ...payload, id: Date.now(), createdAt: payload.created_at };
    clientes.push(row);
    localSet('clientes', clientes);
    return row;
  };

  db.updateCliente = async function (id, data) {
    const allowed = ['nombre', 'email', 'telefono', 'direccion', 'tipo_cliente', 'credito_habilitado', 'notas'];
    const payload = {};
    allowed.forEach(k => {
      if (data[k] !== undefined) payload[k] = data[k];
    });
    if (hasSupabase()) {
      const { error } = await window.supabase.from('clientes').update(payload).eq('id', id);
      if (error) throw error;
      return true;
    }
    const clientes = localGet('clientes');
    const index = clientes.findIndex(c => String(c.id) === String(id));
    if (index < 0) return false;
    clientes[index] = { ...clientes[index], ...payload };
    localSet('clientes', clientes);
    return true;
  };

  // ------------------------------------------------------------
  // USUARIOS
  // ------------------------------------------------------------
  db.getUsuarios = async function () {
    if (hasSupabase()) {
      const { data, error } = await window.supabase.from('usuarios').select('*').order('nombre');
      if (error) throw error;
      return data || [];
    }
    return localGet('usuarios');
  };

  db.saveUsuario = async function (usuario) {
    const payload = {
      nombre: usuario.nombre,
      email: (usuario.email || '').trim().toLowerCase(),
      rol: usuario.rol || 'vendedor',
      estado: usuario.estado || 'activo',
      privilegios: Array.isArray(usuario.privilegios) ? usuario.privilegios : [],
      password_hash: usuario.password_hash || null,
      password_salt: usuario.password_salt || null,
      pin_hash: usuario.pin_hash || null,
      pin_salt: usuario.pin_salt || null,
      created_at: new Date().toISOString()
    };
    if (hasSupabase()) {
      const { data, error } = await window.supabase.from('usuarios').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }
    const usuarios = localGet('usuarios');
    const row = { ...payload, id: Date.now() };
    usuarios.push(row);
    localSet('usuarios', usuarios);
    return row;
  };

  db.updateUsuario = async function (id, data) {
    const allowed = [
      'nombre', 'email', 'rol', 'estado', 'privilegios',
      'password_hash', 'password_salt', 'pin_hash', 'pin_salt'
    ];
    const payload = {};
    allowed.forEach(k => {
      if (data[k] !== undefined) payload[k] = data[k];
    });
    if (payload.email) payload.email = payload.email.trim().toLowerCase();

    if (hasSupabase()) {
      const { error } = await window.supabase.from('usuarios').update(payload).eq('id', id);
      if (error) throw error;
      return true;
    }
    const usuarios = localGet('usuarios');
    const index = usuarios.findIndex(u => String(u.id) === String(id));
    if (index < 0) return false;
    usuarios[index] = { ...usuarios[index], ...payload };
    localSet('usuarios', usuarios);
    return true;
  };

  db.deleteUsuario = async function (id) {
    if (hasSupabase()) {
      const { error } = await window.supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    localSet('usuarios', localGet('usuarios').filter(u => String(u.id) !== String(id)));
    return true;
  };

  // ------------------------------------------------------------
  // CUENTA DE PLAZA / LOCATARIOS
  // ------------------------------------------------------------
  db.getMovimientosPlaza = async function (clienteId) {
    if (hasSupabase()) {
      let query = window.supabase
        .from('cuentas_plaza_movimientos')
        .select('*')
        .order('fecha', { ascending: false });
      if (clienteId !== undefined && clienteId !== null) query = query.eq('cliente_id', clienteId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    const rows = localGet('cuentas_plaza_movimientos');
    return clienteId === undefined || clienteId === null
      ? rows.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      : rows.filter(r => String(r.cliente_id) === String(clienteId)).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  db.registrarMovimientoPlaza = async function (mov) {
    const payload = {
      cliente_id: mov.cliente_id,
      cliente_nombre: mov.cliente_nombre,
      tipo: mov.tipo,
      monto: numberOr(mov.monto, 0),
      items: mov.items || [],
      venta_id: mov.venta_id || null,
      nota: mov.nota || '',
      usuario: mov.usuario || 'Sistema',
      fecha: mov.fecha || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    if (hasSupabase()) {
      const { data, error } = await window.supabase
        .from('cuentas_plaza_movimientos')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const rows = localGet('cuentas_plaza_movimientos');
    const row = { ...payload, id: Date.now() };
    rows.push(row);
    localSet('cuentas_plaza_movimientos', rows);
    return row;
  };

  db.getSaldoPlaza = async function (clienteId) {
    const movimientos = await db.getMovimientosPlaza(clienteId);
    return movimientos.reduce((saldo, m) => {
      const monto = numberOr(m.monto, 0);
      if (m.tipo === 'cargo') return saldo + monto;
      if (m.tipo === 'abono') return saldo - monto;
      return saldo + monto; // ajuste positivo/negativo si se usa manualmente
    }, 0);
  };

  // ------------------------------------------------------------
  // VENTAS V2
  // ------------------------------------------------------------
  db.registrarVenta = async function (venta) {
    const payload = {
      items: venta.items || [],
      total: numberOr(venta.total, 0),
      metodo_pago: venta.metodoPago || 'Efectivo',
      comentario: venta.comentario || '',
      descuento_aplicado: !!venta.descuentoAplicado,
      usuario: venta.usuario || 'Admin',
      cliente_id: venta.clienteId || null,
      cliente_nombre: venta.clienteNombre || null,
      tipo_precio: venta.tipoPrecio || 'cliente',
      es_credito_plaza: !!venta.esCreditoPlaza,
      fecha: venta.fecha || new Date().toISOString()
    };

    let row;
    if (hasSupabase()) {
      const { data, error } = await window.supabase.from('ventas').insert([payload]).select().single();
      if (error) throw error;
      row = data;
    } else {
      const ventas = localGet('ventas');
      row = { ...payload, id: Date.now() };
      ventas.push(row);
      localSet('ventas', ventas);
    }

    // Descontar stock con actualización PARCIAL para no corromper el producto.
    for (const item of payload.items) {
      if (item.tipo === 'rapida') continue;
      const producto = await db.getProductoById(item.id);
      if (!producto) continue;
      const nuevoStock = Math.max(0, numberOr(producto.stock, 0) - numberOr(item.cantidad, 0));
      await db.updateProducto(item.id, { stock: nuevoStock });
    }

    // Una venta a cuenta de plaza genera automáticamente un cargo.
    if (payload.es_credito_plaza && payload.cliente_id) {
      await db.registrarMovimientoPlaza({
        cliente_id: payload.cliente_id,
        cliente_nombre: payload.cliente_nombre || 'Locatario',
        tipo: 'cargo',
        monto: payload.total,
        items: payload.items,
        venta_id: row?.id || null,
        nota: payload.comentario || 'Venta a cuenta de plaza',
        usuario: payload.usuario,
        fecha: payload.fecha
      });
    }

    return row;
  };

  // ------------------------------------------------------------
  // TRASPASOS NORMALIZADOS
  // ------------------------------------------------------------
  db.saveTraspasoV2 = async function (traspaso) {
    const payload = {
      producto_id: traspaso.producto_id,
      producto_nombre: traspaso.producto_nombre,
      producto_sku: traspaso.producto_sku || '',
      tipo: 'traspaso',
      origen: traspaso.origen,
      destino: traspaso.destino,
      local_origen: traspaso.origen,
      local_destino: traspaso.destino,
      cantidad: parseInt(traspaso.cantidad, 10),
      motivo: traspaso.motivo || 'Transferencia entre almacenes',
      usuario: traspaso.usuario || 'Admin',
      estado: 'completado',
      fecha: traspaso.fecha || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (hasSupabase()) {
      const { data, error } = await window.supabase.from('traspasos').insert([payload]).select().single();
      if (error) throw error;
      return data;
    }
    const rows = localGet('traspasos');
    const row = { ...payload, id: Date.now() };
    rows.push(row);
    localSet('traspasos', rows);
    return row;
  };

  console.log('✅ Database V2 activo: precios, usuarios, plaza y actualizaciones parciales');
})();
