// ============================================
// LOTO GAMES POS - MÓDULO DE TRASPASOS (COMPLETO)
// ============================================

window.traspasosModule = () => {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2>🔄 Traspasos y Movimientos</h2>
        <p style="color: var(--text-muted);">Traspasos entre locales, salidas a locatarios y gestión de deudas</p>
      </div>
      <button class="btn btn-primary" onclick="window.mostrarModalTraspaso()">
        <i class="fas fa-plus"></i> Nuevo Movimiento
      </button>
    </div>

    <div class="cards-grid" style="margin-bottom: 24px;">
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-arrows-alt-h"></i></div>
        <div class="stat-value" id="totalTraspasos">0</div>
        <div class="stat-label">Traspasos entre locales</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-hand-holding-usd"></i></div>
        <div class="stat-value" id="totalDeudas">$0</div>
        <div class="stat-label">Deudas pendientes</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-users"></i></div>
        <div class="stat-value" id="totalLocatarios">0</div>
        <div class="stat-label">Locatarios con deuda</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
        <div class="stat-value" id="movimientosHoy">0</div>
        <div class="stat-label">Movimientos Hoy</div>
      </div>
    </div>

    <div class="table-container" style="margin-bottom: 24px;">
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
        <div style="flex: 1;">
          <label style="font-size: 12px; color: var(--text-muted);">Buscar</label>
          <input type="text" id="buscarTraspaso" class="form-control" placeholder="🔍 Producto, locatario o motivo..." onkeyup="window.filtrarTraspasos()">
        </div>
        <div style="width: 150px;">
          <label style="font-size: 12px; color: var(--text-muted);">Tipo</label>
          <select id="filtroTipo" class="form-control" onchange="window.filtrarTraspasos()">
            <option value="">Todos</option>
            <option value="traspaso_local">🔄 Traspaso entre locales</option>
            <option value="salida_locatario">👤 Salida a locatario</option>
            <option value="pago_locatario">💰 Pago de locatario</option>
          </select>
        </div>
        <div style="width: 150px;">
          <label style="font-size: 12px; color: var(--text-muted);">Estado de pago</label>
          <select id="filtroEstadoPago" class="form-control" onchange="window.filtrarTraspasos()">
            <option value="">Todos</option>
            <option value="pendiente">⏳ Pendiente</option>
            <option value="pagado">✅ Pagado</option>
            <option value="parcial">🔄 Parcial</option>
          </select>
        </div>
        <div style="width: 150px;">
          <label style="font-size: 12px; color: var(--text-muted);">Local</label>
          <select id="filtroLocal" class="form-control" onchange="window.filtrarTraspasos()">
            <option value="">Todos</option>
            <option value="14">🏪 Local 14</option>
            <option value="20">🏪 Local 20</option>
          </select>
        </div>
        <div style="width: 150px;">
          <label style="font-size: 12px; color: var(--text-muted);">Desde</label>
          <input type="date" id="filtroFechaInicio" class="form-control" onchange="window.filtrarTraspasos()">
        </div>
        <div style="width: 150px;">
          <label style="font-size: 12px; color: var(--text-muted);">Hasta</label>
          <input type="date" id="filtroFechaFin" class="form-control" onchange="window.filtrarTraspasos()">
        </div>
        <button class="btn btn-primary" onclick="window.filtrarTraspasos()">Filtrar</button>
        <button class="btn btn-success" onclick="window.exportarTraspasosCSV()">📥 CSV</button>
        <button class="btn btn-warning" onclick="window.generarReporteDeudas()">📊 Deudas</button>
      </div>
    </div>

    <div class="table-container">
      <div style="overflow-x: auto;">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Producto</th>
              <th>Cant</th>
              <th>Local Origen</th>
              <th>Local Destino</th>
              <th>Locatario</th>
              <th>Monto</th>
              <th>Estado Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tablaTraspasos">
            <tr><td colspan="11" style="text-align: center;">Cargando movimientos...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal para nuevo movimiento -->
    <div id="modalTraspaso" class="modal">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3 id="modalTraspasoTitulo">Nuevo Movimiento</h3>
          <span class="close-modal" onclick="window.cerrarModalTraspaso()">&times;</span>
        </div>
        <form id="formTraspaso">
          <input type="hidden" id="traspasoId">
          <div class="form-group">
            <label>Tipo de Movimiento *</label>
            <select id="traspasoTipo" class="form-control" required onchange="window.cambiarCamposTipo()">
              <option value="traspaso_local">🔄 Traspaso entre locales</option>
              <option value="salida_locatario">👤 Salida a locatario (crédito)</option>
              <option value="pago_locatario">💰 Pago de locatario</option>
            </select>
          </div>
          <div class="form-group">
            <label>Producto *</label>
            <select id="traspasoProducto" class="form-control" required>
              <option value="">Seleccionar producto</option>
            </select>
          </div>
          <div class="form-group">
            <label>Cantidad *</label>
            <input type="number" id="traspasoCantidad" class="form-control" min="1" required>
          </div>
          <div id="camposTraspasoLocal">
            <div class="form-group">
              <label>Local Origen *</label>
              <select id="traspasoLocalOrigen" class="form-control" required>
                <option value="14">🏪 Local 14</option>
                <option value="20">🏪 Local 20</option>
              </select>
            </div>
            <div class="form-group">
              <label>Local Destino *</label>
              <select id="traspasoLocalDestino" class="form-control" required>
                <option value="14">🏪 Local 14</option>
                <option value="20">🏪 Local 20</option>
              </select>
            </div>
          </div>
          <div id="camposLocatario" style="display: none;">
            <div class="form-group">
              <label>Nombre del Locatario *</label>
              <input type="text" id="traspasoLocatarioNombre" class="form-control" placeholder="Ej: Juan Pérez - Puesto 45" required>
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" id="traspasoLocatarioTelefono" class="form-control" placeholder="Teléfono de contacto">
            </div>
            <div class="form-group">
              <label>Monto (MXN) *</label>
              <input type="number" id="traspasoMonto" class="form-control" step="0.01" min="0" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label>Estado de Pago</label>
              <select id="traspasoEstadoPago" class="form-control">
                <option value="pendiente">⏳ Pendiente</option>
                <option value="pagado">✅ Pagado</option>
                <option value="parcial">🔄 Parcial</option>
              </select>
            </div>
          </div>
          <div id="camposPago" style="display: none;">
            <div class="form-group">
              <label>Locatario *</label>
              <select id="traspasoPagoLocatario" class="form-control" required>
                <option value="">Seleccionar locatario</option>
              </select>
            </div>
            <div class="form-group">
              <label>Monto Pagado *</label>
              <input type="number" id="traspasoMontoPagado" class="form-control" step="0.01" min="0" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label>Referencia / Comentario</label>
              <input type="text" id="traspasoMotivoPago" class="form-control" placeholder="Ej: Pago parcial, liquidación...">
            </div>
          </div>
          <div class="form-group">
            <label>Motivo / Comentario</label>
            <input type="text" id="traspasoMotivo" class="form-control" placeholder="Observaciones adicionales...">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Registrar Movimiento</button>
        </form>
      </div>
    </div>
  `;
};

// ============================================
// VARIABLES GLOBALES
// ============================================

let traspasosData = [];
let productosData = [];
let locatariosSet = new Set();

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

window.cargarTraspasos = async () => {
  try {
    traspasosData = await window.DB.getTraspasos();
    productosData = await window.DB.getProductos();
    window.actualizarEstadisticasTraspasos();
    window.renderizarTraspasos(traspasosData);
    window.actualizarLocatarios();
  } catch (e) {
    console.error('Error cargando traspasos:', e);
  }
};

window.actualizarEstadisticasTraspasos = () => {
  const traspasos = traspasosData.filter(t => t.tipo === 'traspaso_local');
  const deudas = traspasosData.filter(t => t.tipo === 'salida_locatario' && t.estado_pago === 'pendiente');
  const totalDeudas = deudas.reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0);
  const locatarios = new Set(traspasosData.filter(t => t.locatario_nombre).map(t => t.locatario_nombre));
  const hoy = new Date().toDateString();
  const hoyMovimientos = traspasosData.filter(t => new Date(t.fecha).toDateString() === hoy);

  document.getElementById('totalTraspasos').innerHTML = traspasos.length;
  document.getElementById('totalDeudas').innerHTML = `$${totalDeudas.toFixed(2)}`;
  document.getElementById('totalLocatarios').innerHTML = locatarios.size;
  document.getElementById('movimientosHoy').innerHTML = hoyMovimientos.length;
};

window.renderizarTraspasos = (data) => {
  const tbody = document.getElementById('tablaTraspasos');
  if (!tbody) return;
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;">No hay movimientos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(t => {
    const tipoLabel = {
      'traspaso_local': '🔄 Traspaso',
      'salida_locatario': '👤 A locatario',
      'pago_locatario': '💰 Pago'
    }[t.tipo] || t.tipo;

    const estadoPago = t.estado_pago ? 
      `<span style="color: ${t.estado_pago === 'pagado' ? '#10b981' : t.estado_pago === 'parcial' ? '#f59e0b' : '#ef4444'}; font-weight: bold;">
        ${t.estado_pago === 'pagado' ? '✅ Pagado' : t.estado_pago === 'parcial' ? '🔄 Parcial' : '⏳ Pendiente'}
      </span>` : '-';

    const localOrigen = t.local_origen ? `<span style="background: ${t.local_origen === '14' ? '#10b981' : '#f59e0b'}; padding: 2px 6px; border-radius: 6px; color: white;">${t.local_origen}</span>` : '-';
    const localDestino = t.local_destino ? `<span style="background: ${t.local_destino === '14' ? '#10b981' : '#f59e0b'}; padding: 2px 6px; border-radius: 6px; color: white;">${t.local_destino}</span>` : '-';

    return `
      <tr>
        <td>#${t.id}</td>
        <td>${new Date(t.fecha).toLocaleString()}</td>
        <td>${tipoLabel}</td>
        <td><strong>${t.producto_nombre}</strong></td>
        <td>${t.cantidad}</td>
        <td>${localOrigen}</td>
        <td>${localDestino}</td>
        <td>${t.locatario_nombre || '-'}</td>
        <td>${t.monto ? `$${parseFloat(t.monto).toFixed(2)}` : '-'}</td>
        <td>${estadoPago}</td>
        <td>
          ${t.estado_pago === 'pendiente' && t.tipo === 'salida_locatario' ? 
            `<button class="btn" style="background: var(--success); padding: 5px 10px; margin-bottom: 3px;" onclick="window.registrarPago(${t.id})">💰 Pagar</button>` : ''
          }
          <button class="btn" style="background: var(--danger); padding: 5px 10px;" onclick="window.eliminarTraspaso(${t.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

window.filtrarTraspasos = () => {
  const busqueda = document.getElementById('buscarTraspaso').value.toLowerCase();
  const tipo = document.getElementById('filtroTipo').value;
  const estadoPago = document.getElementById('filtroEstadoPago').value;
  const local = document.getElementById('filtroLocal').value;
  const fechaInicio = document.getElementById('filtroFechaInicio').value;
  const fechaFin = document.getElementById('filtroFechaFin').value;

  let filtrados = [...traspasosData];

  if (busqueda) {
    filtrados = filtrados.filter(t => 
      t.producto_nombre.toLowerCase().includes(busqueda) ||
      (t.locatario_nombre && t.locatario_nombre.toLowerCase().includes(busqueda)) ||
      (t.motivo && t.motivo.toLowerCase().includes(busqueda))
    );
  }
  if (tipo) filtrados = filtrados.filter(t => t.tipo === tipo);
  if (estadoPago) filtrados = filtrados.filter(t => t.estado_pago === estadoPago);
  if (local) filtrados = filtrados.filter(t => t.local_origen === local || t.local_destino === local);
  if (fechaInicio) {
    const inicio = new Date(fechaInicio);
    inicio.setHours(0,0,0,0);
    filtrados = filtrados.filter(t => new Date(t.fecha) >= inicio);
  }
  if (fechaFin) {
    const fin = new Date(fechaFin);
    fin.setHours(23,59,59,999);
    filtrados = filtrados.filter(t => new Date(t.fecha) <= fin);
  }

  window.renderizarTraspasos(filtrados);
};

window.cambiarCamposTipo = () => {
  const tipo = document.getElementById('traspasoTipo').value;
  document.getElementById('camposTraspasoLocal').style.display = tipo === 'traspaso_local' ? 'block' : 'none';
  document.getElementById('camposLocatario').style.display = tipo === 'salida_locatario' ? 'block' : 'none';
  document.getElementById('camposPago').style.display = tipo === 'pago_locatario' ? 'block' : 'none';
  
  if (tipo === 'pago_locatario') {
    window.cargarLocatariosSelect();
  }
};

window.cargarLocatariosSelect = () => {
  const select = document.getElementById('traspasoPagoLocatario');
  const locatarios = new Set(traspasosData.filter(t => t.locatario_nombre).map(t => t.locatario_nombre));
  select.innerHTML = '<option value="">Seleccionar locatario</option>' + 
    Array.from(locatarios).map(n => `<option value="${n}">${n}</option>`).join('');
};

window.actualizarLocatarios = () => {
  const locatarios = new Set(traspasosData.filter(t => t.locatario_nombre).map(t => t.locatario_nombre));
  locatariosSet = locatarios;
};

window.mostrarModalTraspaso = async () => {
  document.getElementById('modalTraspasoTitulo').innerText = 'Nuevo Movimiento';
  document.getElementById('traspasoId').value = '';
  document.getElementById('formTraspaso').reset();
  document.getElementById('camposTraspasoLocal').style.display = 'block';
  document.getElementById('camposLocatario').style.display = 'none';
  document.getElementById('camposPago').style.display = 'none';
  
  const productos = await window.DB.getProductos();
  const select = document.getElementById('traspasoProducto');
  select.innerHTML = '<option value="">Seleccionar producto</option>' + 
    productos.map(p => `<option value="${p.id}">${p.nombre} (Stock: ${p.stock})</option>`).join('');
  
  document.getElementById('modalTraspaso').style.display = 'flex';
};

window.cerrarModalTraspaso = () => {
  document.getElementById('modalTraspaso').style.display = 'none';
};

window.eliminarTraspaso = async (id) => {
  if (confirm('¿Eliminar este movimiento?')) {
    await window.DB.deleteTraspaso(id);
    await window.cargarTraspasos();
    if (window.cargarProductos) await window.cargarProductos();
    if (window.cargarInventario) await window.cargarInventario();
  }
};

window.registrarPago = async (id) => {
  const traspaso = traspasosData.find(t => t.id === id);
  if (!traspaso) return;
  
  const monto = prompt(`Monto a pagar para ${traspaso.locatario_nombre} (Total: $${parseFloat(traspaso.monto).toFixed(2)}):`, traspaso.monto);
  if (monto === null) return;
  const montoPagado = parseFloat(monto);
  if (isNaN(montoPagado) || montoPagado <= 0) {
    alert('Monto inválido');
    return;
  }
  
  if (montoPagado >= parseFloat(traspaso.monto)) {
    await window.DB.updateTraspaso(id, { estado_pago: 'pagado', fecha_pago: new Date().toISOString() });
  } else {
    await window.DB.updateTraspaso(id, { estado_pago: 'parcial', monto: parseFloat(traspaso.monto) - montoPagado });
  }
  await window.cargarTraspasos();
  alert('✅ Pago registrado');
};

window.exportarTraspasosCSV = () => {
  if (traspasosData.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  const headers = ['ID', 'Fecha', 'Tipo', 'Producto', 'Cantidad', 'Local Origen', 'Local Destino', 'Locatario', 'Monto', 'Estado Pago'];
  const rows = traspasosData.map(t => [
    t.id,
    new Date(t.fecha).toLocaleString(),
    t.tipo,
    t.producto_nombre,
    t.cantidad,
    t.local_origen || '',
    t.local_destino || '',
    t.locatario_nombre || '',
    t.monto || 0,
    t.estado_pago || ''
  ]);
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `traspasos_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(blob);
};

window.generarReporteDeudas = () => {
  const deudas = traspasosData.filter(t => t.tipo === 'salida_locatario' && t.estado_pago === 'pendiente');
  if (deudas.length === 0) {
    alert('✅ No hay deudas pendientes');
    return;
  }
  const total = deudas.reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0);
  let reporte = '📊 REPORTE DE DEUDAS PENDIENTES\n';
  reporte += '═════════════════════════════════════════\n\n';
  reporte += `Total de deudas: $${total.toFixed(2)}\n`;
  reporte += `Número de locatarios: ${new Set(deudas.map(t => t.locatario_nombre)).size}\n\n`;
  deudas.forEach(t => {
    reporte += `👤 ${t.locatario_nombre}\n`;
    reporte += `   📦 ${t.producto_nombre} x${t.cantidad}\n`;
    reporte += `   💰 $${parseFloat(t.monto).toFixed(2)}\n`;
    reporte += `   📅 ${new Date(t.fecha).toLocaleDateString()}\n\n`;
  });
  alert(reporte);
};

// ============================================
// GUARDAR TRASPASO
// ============================================

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'formTraspaso') {
    e.preventDefault();
    
    const tipo = document.getElementById('traspasoTipo').value;
    const productoId = document.getElementById('traspasoProducto').value;
    const cantidad = parseInt(document.getElementById('traspasoCantidad').value);
    const motivo = document.getElementById('traspasoMotivo').value.trim();

    if (!productoId) return alert('Selecciona un producto');
    if (!cantidad || cantidad < 1) return alert('Cantidad válida');

    const productos = await window.DB.getProductos();
    const producto = productos.find(p => p.id == parseInt(productoId));
    if (!producto) return alert('Producto no encontrado');

    let data = {
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      tipo: tipo,
      cantidad: cantidad,
      motivo: motivo || '',
      usuario: window.usuarioActual?.nombre || 'Admin'
    };

    if (tipo === 'traspaso_local') {
      const origen = document.getElementById('traspasoLocalOrigen').value;
      const destino = document.getElementById('traspasoLocalDestino').value;
      if (!origen || !destino) return alert('Selecciona origen y destino');
      if (origen === destino) return alert('Origen y destino no pueden ser iguales');
      if (producto.stock < cantidad) return alert(`Stock insuficiente en Local ${origen}`);
      data.local_origen = origen;
      data.local_destino = destino;
    } 
    else if (tipo === 'salida_locatario') {
      const nombre = document.getElementById('traspasoLocatarioNombre').value.trim();
      const telefono = document.getElementById('traspasoLocatarioTelefono').value.trim();
      const monto = parseFloat(document.getElementById('traspasoMonto').value);
      const estadoPago = document.getElementById('traspasoEstadoPago').value;
      if (!nombre) return alert('Ingresa el nombre del locatario');
      if (isNaN(monto) || monto < 0) return alert('Monto válido');
      if (producto.stock < cantidad) return alert(`Stock insuficiente`);
      data.locatario_nombre = nombre;
      data.locatario_telefono = telefono;
      data.monto = monto;
      data.estado_pago = estadoPago;
      data.local_origen = '14';
    } 
    else if (tipo === 'pago_locatario') {
      const locatario = document.getElementById('traspasoPagoLocatario').value;
      const montoPagado = parseFloat(document.getElementById('traspasoMontoPagado').value);
      if (!locatario) return alert('Selecciona un locatario');
      if (isNaN(montoPagado) || montoPagado <= 0) return alert('Monto válido');
      const deudas = traspasosData.filter(t => t.locatario_nombre === locatario && t.estado_pago === 'pendiente');
      if (deudas.length === 0) return alert('Este locatario no tiene deudas pendientes');
      let restante = montoPagado;
      for (const deuda of deudas) {
        if (restante <= 0) break;
        const montoDeuda = parseFloat(deuda.monto) || 0;
        if (restante >= montoDeuda) {
          await window.DB.updateTraspaso(deuda.id, { estado_pago: 'pagado', fecha_pago: new Date().toISOString() });
          restante -= montoDeuda;
        } else {
          await window.DB.updateTraspaso(deuda.id, { estado_pago: 'parcial', monto: montoDeuda - restante });
          restante = 0;
        }
      }
      data.locatario_nombre = locatario;
      data.monto = montoPagado;
      data.estado_pago = 'pagado';
      data.motivo = document.getElementById('traspasoMotivoPago').value || 'Pago registrado';
      await window.DB.saveTraspaso(data);
      window.cerrarModalTraspaso();
      await window.cargarTraspasos();
      alert(`✅ Pago de $${montoPagado.toFixed(2)} registrado para ${locatario}`);
      return;
    }

    await window.DB.saveTraspaso(data);
    window.cerrarModalTraspaso();
    await window.cargarTraspasos();
    if (window.cargarProductos) await window.cargarProductos();
    if (window.cargarInventario) await window.cargarInventario();
    if (window.cargarProductosVenta) await window.cargarProductosVenta();
    alert('✅ Movimiento registrado correctamente');
  }
});

// ============================================
// INICIALIZACIÓN
// ============================================

setTimeout(() => {
  if (document.getElementById('tablaTraspasos')) {
    window.cargarTraspasos();
  }
}, 100);
