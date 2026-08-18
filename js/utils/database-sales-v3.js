// ============================================
// LOTO GAMES POS - VENTAS / DATABASE V3
// Persiste subtotal y descuento + diagnóstico seguro de Supabase
// ============================================

(function () {
  'use strict';

  const db = window.DB;
  if (!db) {
    console.error('❌ database-sales-v3.js requiere window.DB');
    return;
  }

  const hasSupabase = () => !!window.supabase;
  const localGet = key => JSON.parse(localStorage.getItem(key) || '[]');
  const localSet = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  const round2 = value => Math.round((numberOr(value) + Number.EPSILON) * 100) / 100;

  // Verificación de sólo lectura. No inserta, actualiza ni elimina datos.
  // Sirve para validar la migración antes de registrar una venta real.
  db.verificarConexionFinal = async function () {
    if (!hasSupabase()) {
      return {
        ok: false,
        modo: 'demo/local',
        mensaje: 'Supabase no está activo. Abre el POS sin ?demo=1 para verificar la base real.'
      };
    }

    const pruebas = [
      ['productos', 'id,nombre,stock,precio_cliente,precio_mayorista,precio_plaza'],
      ['clientes', 'id,nombre,tipo_cliente,credito_habilitado'],
      ['usuarios', 'id,nombre,email,rol,estado,privilegios'],
      ['ventas', 'id,total,subtotal,descuento_aplicado,descuento_porcentaje,descuento_monto,fecha'],
      ['traspasos', 'id,producto_id,origen,destino,estado,fecha'],
      ['cuentas_plaza_movimientos', 'id,cliente_id,tipo,monto,fecha']
    ];

    const resultado = {
      ok: true,
      modo: 'supabase',
      tablas: {}
    };

    for (const [tabla, columnas] of pruebas) {
      const { data, error, count } = await window.supabase
        .from(tabla)
        .select(columnas, { count: 'exact' })
        .limit(1);

      if (error) {
        resultado.ok = false;
        resultado.tablas[tabla] = {
          ok: false,
          error: error.message,
          code: error.code || null
        };
      } else {
        resultado.tablas[tabla] = {
          ok: true,
          count: Number.isFinite(count) ? count : null,
          muestra: data?.[0] || null
        };
      }
    }

    return resultado;
  };

  db.registrarVenta = async function (venta) {
    const total = round2(venta.total);
    const subtotal = round2(venta.subtotal ?? total);
    const descuentoMonto = round2(venta.descuentoMonto ?? Math.max(0, subtotal - total));
    const descuentoPorcentaje = numberOr(venta.descuentoPorcentaje, venta.descuentoAplicado ? 5 : 0);

    const payload = {
      items: venta.items || [],
      subtotal,
      descuento_porcentaje: descuentoPorcentaje,
      descuento_monto: descuentoMonto,
      total,
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
      const { data, error } = await window.supabase
        .from('ventas')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      row = data;
    } else {
      const ventas = localGet('ventas');
      row = { ...payload, id: Date.now() };
      ventas.push(row);
      localSet('ventas', ventas);
    }

    // Inventario: sólo productos registrados; una venta rápida no descuenta stock.
    for (const item of payload.items) {
      if (item.tipo === 'rapida') continue;
      const producto = await db.getProductoById(item.id);
      if (!producto) continue;
      const nuevoStock = Math.max(
        0,
        numberOr(producto.stock, 0) - numberOr(item.cantidad, 0)
      );
      await db.updateProducto(item.id, { stock: nuevoStock });
    }

    // Cuenta Plaza usa el TOTAL ya descontado, que es el importe realmente adeudado.
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

  console.log('✅ Database Sales V3: descuento persistente + diagnóstico de conexión');
})();
