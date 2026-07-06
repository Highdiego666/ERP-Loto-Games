// ============================================
// LOTO GAMES POS - MÓDULO DE TRASPASOS V2
// MOVIMIENTOS DE INVENTARIO ENTRE ALMACENES
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
const ALMACENES = {
    'principal': { nombre: '🏪 Almacén Principal', color: '#3b82f6' },
    'secundario': { nombre: '📦 Almacén Secundario', color: '#8b5cf6' },
    'taller': { nombre: '🔧 Taller', color: '#f59e0b' },
    'tienda': { nombre: '🏬 Tienda', color: '#10b981' }
};

// ============================================
// MÓDULO PRINCIPAL
// ============================================

window.traspasosModule = () => {
    return `
        <div class="page-header">
            <h2><i class="fas fa-exchange-alt" style="color: #8b5cf6;"></i> Traspasos de Inventario</h2>
            <p>Gestión de movimientos entre almacenes y registro de transferencias</p>
        </div>

        <!-- ============================================ -->
        <!-- SECCIÓN: RESUMEN RÁPIDO                       -->
        <!-- ============================================ -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div class="stat-card" style="background: var(--bg-card); padding: 16px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 12px; color: var(--text-muted);">Total Traspasos</div>
                <div id="totalTraspasos" style="font-size: 28px; font-weight: bold; color: #3b82f6;">0</div>
            </div>
            <div class="stat-card" style="background: var(--bg-card); padding: 16px; border-radius: 12px; border-left: 4px solid #10b981;">
                <div style="font-size: 12px; color: var(--text-muted);">Productos Trasladados</div>
                <div id="totalProductosTrasladados" style="font-size: 28px; font-weight: bold; color: #10b981;">0</div>
            </div>
            <div class="stat-card" style="background: var(--bg-card); padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 12px; color: var(--text-muted);">Último Traspaso</div>
                <div id="ultimoTraspaso" style="font-size: 14px; font-weight: bold; color: #f59e0b;">-</div>
            </div>
        </div>

        <!-- ============================================ -->
        <!-- SECCIÓN: NUEVO TRASPASO                       -->
        <!-- ============================================ -->
        <div class="card" style="margin-bottom: 24px; padding: 24px;">
            <h3 style="margin-bottom: 16px;">➕ Nuevo Traspaso</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <!-- Producto -->
                <div style="grid-column: 1 / -1;">
                    <label style="font-weight: 600;">📦 Producto</label>
                    <div style="display: flex; gap: 10px;">
                        <select id="selectProductoTraspaso" class="form-control" style="flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text);">
                            <option value="">🔍 Buscar producto...</option>
                        </select>
                        <button class="btn btn-secondary" onclick="window.recargarProductosTraspaso()" style="padding: 12px 20px; background: var(--bg-dark); border: 1px solid var(--border); border-radius: 10px; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div id="infoProductoSeleccionado" style="margin-top: 8px; font-size: 14px; color: var(--text-muted); display: none; padding: 10px; background: var(--bg-dark); border-radius: 8px;">
                        <span id="infoProductoNombre"></span> | 
                        Stock: <strong id="infoProductoStock">0</strong> | 
                        SKU: <span id="infoProductoSKU">-</span>
                    </div>
                </div>

                <!-- Origen -->
                <div>
                    <label style="font-weight: 600;">🏪 Almacén Origen</label>
                    <select id="selectOrigenTraspaso" class="form-control" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text);" onchange="window.actualizarStockDisponible()">
                        ${Object.entries(ALMACENES).map(([key, val]) => `
                            <option value="${key}">${val.nombre}</option>
                        `).join('')}
                    </select>
                </div>

                <!-- Destino -->
                <div>
                    <label style="font-weight: 600;">🏪 Almacén Destino</label>
                    <select id="selectDestinoTraspaso" class="form-control" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text);">
                        ${Object.entries(ALMACENES).map(([key, val]) => `
                            <option value="${key}">${val.nombre}</option>
                        `).join('')}
                    </select>
                </div>

                <!-- Cantidad -->
                <div>
                    <label style="font-weight: 600;">🔢 Cantidad</label>
                    <input type="number" id="inputCantidadTraspaso" class="form-control" placeholder="Cantidad a trasladar" min="1" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text);" oninput="window.validarCantidadTraspaso()">
                    <div id="stockDisponibleLabel" style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Stock disponible: <span id="stockDisponibleValor">0</span></div>
                </div>

                <!-- Motivo -->
                <div>
                    <label style="font-weight: 600;">📝 Motivo</label>
                    <select id="selectMotivoTraspaso" class="form-control" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text);">
                        <option value="Reposición de stock">📦 Reposición de stock</option>
                        <option value="Devolución">🔄 Devolución</option>
                        <option value="Transferencia entre tiendas">🏬 Transferencia entre tiendas</option>
                        <option value="Ajuste de inventario">📊 Ajuste de inventario</option>
                        <option value="Préstamo">🤝 Préstamo</option>
                        <option value="Otro">📝 Otro</option>
                    </select>
                </div>

                <!-- Botones -->
                <div style="grid-column: 1 / -1; display: flex; gap: 10px; margin-top: 8px;">
                    <button class="btn btn-success" onclick="window.registrarTraspaso()" style="flex: 1; padding: 14px; font-size: 16px; font-weight: bold; border: none; border-radius: 10px; background: #10b981; color: white; cursor: pointer;">
                        <i class="fas fa-check-circle"></i> Registrar Traspaso
                    </button>
                    <button class="btn btn-secondary" onclick="window.limpiarFormularioTraspaso()" style="padding: 14px 28px; font-size: 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-dark); cursor: pointer;">
                        <i class="fas fa-undo"></i> Limpiar
                    </button>
                </div>
            </div>
        </div>

        <!-- ============================================ -->
        <!-- SECCIÓN: LISTA DE TRASPASOS                   -->
        <!-- ============================================ -->
        <div class="card" style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <h3 style="margin: 0;">📋 Historial de Traspasos</h3>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="filtroTraspasos" class="form-control" placeholder="🔍 Filtrar por producto..." style="padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text); width: 200px;" oninput="window.filtrarTraspasos()">
                    <button class="btn btn-secondary" onclick="window.cargarTraspasos()" style="padding: 8px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-dark); cursor: pointer;">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div id="tablaTraspasosContainer" style="overflow-x: auto;">
                <table class="table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg-dark); border-bottom: 2px solid var(--border);">
                            <th style="padding: 12px; text-align: left;">ID</th>
                            <th style="padding: 12px; text-align: left;">Fecha</th>
                            <th style="padding: 12px; text-align: left;">Producto</th>
                            <th style="padding: 12px; text-align: left;">Origen</th>
                            <th style="padding: 12px; text-align: left;">Destino</th>
                            <th style="padding: 12px; text-align: center;">Cantidad</th>
                            <th style="padding: 12px; text-align: left;">Motivo</th>
                            <th style="padding: 12px; text-align: left;">Usuario</th>
                        </tr>
                    </thead>
                    <tbody id="tablaTraspasos">
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                                <i class="fas fa-spinner fa-pulse fa-2x"></i>
                                <p style="margin-top: 10px;">Cargando traspasos...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Paginación -->
            <div id="paginacionTraspasos" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                <span id="infoPaginacion" style="color: var(--text-muted); font-size: 14px;">Mostrando 0 traspasos</span>
                <div style="display: flex; gap: 8px;">
                    <button id="btnAnteriorTraspasos" class="btn btn-secondary" onclick="window.cambiarPaginaTraspasos(-1)" style="padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-dark); cursor: pointer;">◀ Anterior</button>
                    <span id="paginaActualTraspasos" style="padding: 6px 14px; background: var(--primary); color: white; border-radius: 6px;">1</span>
                    <button id="btnSiguienteTraspasos" class="btn btn-secondary" onclick="window.cambiarPaginaTraspasos(1)" style="padding: 6px 14px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-dark); cursor: pointer;">Siguiente ▶</button>
                </div>
            </div>
        </div>
    `;
};

// ============================================
// VARIABLES GLOBALES
// ============================================

let traspasosCache = [];
let productosCache = [];
let paginaActualTraspasos = 1;
const ITEMS_POR_PAGINA = 10;

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

// ============================================
// CARGAR PRODUCTOS
// ============================================

window.cargarProductosTraspaso = async () => {
    try {
        const productos = await window.DB.getProductos();
        productosCache = productos || [];
        const select = document.getElementById('selectProductoTraspaso');
        if (!select) return;
        
        const productosConStock = productos.filter(p => p.stock > 0);
        
        select.innerHTML = `
            <option value="">🔍 Seleccionar producto...</option>
            ${productosConStock.map(p => `
                <option value="${p.id}" data-stock="${p.stock}" data-sku="${p.sku}" data-nombre="${p.nombre}">
                    ${p.nombre} (${p.sku}) - Stock: ${p.stock}
                </option>
            `).join('')}
            ${productosConStock.length === 0 ? '<option value="" disabled>⚠️ No hay productos con stock disponible</option>' : ''}
        `;

        // Evento para mostrar info del producto seleccionado
        select.onchange = function() {
            const selected = this.options[this.selectedIndex];
            const infoDiv = document.getElementById('infoProductoSeleccionado');
            if (this.value) {
                const stock = selected.dataset.stock || 0;
                const sku = selected.dataset.sku || '-';
                const nombre = selected.dataset.nombre || '';
                document.getElementById('infoProductoNombre').textContent = nombre;
                document.getElementById('infoProductoStock').textContent = stock;
                document.getElementById('infoProductoSKU').textContent = sku;
                infoDiv.style.display = 'block';
                document.getElementById('stockDisponibleValor').textContent = stock;
            } else {
                infoDiv.style.display = 'none';
            }
            window.actualizarStockDisponible();
        };

        // Actualizar stock disponible
        window.actualizarStockDisponible();

    } catch (error) {
        console.error('Error cargando productos:', error);
    }
};

window.recargarProductosTraspaso = () => {
    window.cargarProductosTraspaso();
};

// ============================================
// ACTUALIZAR STOCK DISPONIBLE
// ============================================

window.actualizarStockDisponible = () => {
    const select = document.getElementById('selectProductoTraspaso');
    const stockSpan = document.getElementById('stockDisponibleValor');
    if (!select || !stockSpan) return;
    
    const selected = select.options[select.selectedIndex];
    if (select.value && selected) {
        const stock = parseInt(selected.dataset.stock) || 0;
        stockSpan.textContent = stock;
    } else {
        stockSpan.textContent = '0';
    }
};

// ============================================
// VALIDAR CANTIDAD
// ============================================

window.validarCantidadTraspaso = () => {
    const input = document.getElementById('inputCantidadTraspaso');
    const stockSpan = document.getElementById('stockDisponibleValor');
    if (!input || !stockSpan) return;
    
    const cantidad = parseInt(input.value) || 0;
    const stock = parseInt(stockSpan.textContent) || 0;
    
    if (cantidad > stock) {
        input.style.borderColor = '#ef4444';
        input.style.borderWidth = '2px';
    } else {
        input.style.borderColor = 'var(--border)';
        input.style.borderWidth = '1px';
    }
};

// ============================================
// REGISTRAR TRASPASO
// ============================================

window.registrarTraspaso = async () => {
    const productoId = document.getElementById('selectProductoTraspaso').value;
    const origen = document.getElementById('selectOrigenTraspaso').value;
    const destino = document.getElementById('selectDestinoTraspaso').value;
    const cantidad = parseInt(document.getElementById('inputCantidadTraspaso').value);
    const motivo = document.getElementById('selectMotivoTraspaso').value;
    const usuario = window.usuarioActual?.nombre || 'Admin';

    // Validaciones
    if (!productoId) {
        alert('❌ Por favor, selecciona un producto');
        return;
    }
    if (!cantidad || cantidad < 1) {
        alert('❌ Ingresa una cantidad válida (mínimo 1)');
        return;
    }
    if (origen === destino) {
        alert('❌ El origen y destino no pueden ser el mismo almacén');
        return;
    }

    // Confirmación
    const producto = productosCache.find(p => p.id == productoId);
    if (!producto) {
        alert('❌ Producto no encontrado');
        return;
    }

    const confirmar = confirm(`
📋 CONFIRMAR TRASPASO

Producto: ${producto.nombre}
Cantidad: ${cantidad}
Origen: ${ALMACENES[origen]?.nombre || origen}
Destino: ${ALMACENES[destino]?.nombre || destino}
Motivo: ${motivo}
Usuario: ${usuario}

⚠️ El stock se reducirá en ${origen} y aumentará en ${destino}

¿Confirmar traspaso?
    `);

    if (!confirmar) return;

    try {
        // Verificar stock actual
        const stockOrigen = producto.stock || 0;
        if (cantidad > stockOrigen) {
            alert(`❌ Stock insuficiente. Disponible: ${stockOrigen}`);
            return;
        }

        // 1. Registrar traspaso en Supabase
        const traspasoData = {
            producto_id: producto.id,
            producto_nombre: producto.nombre,
            producto_sku: producto.sku,
            origen: origen,
            destino: destino,
            cantidad: cantidad,
            motivo: motivo || 'Traspaso de inventario',
            usuario: usuario,
            estado: 'completado',
            fecha: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        const { data, error } = await window.supabase
            .from('traspasos')
            .insert([traspasoData])
            .select();

        if (error) throw error;

        // 2. Actualizar stock del producto
        const nuevoStock = stockOrigen - cantidad;
        const { error: updateError } = await window.supabase
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', producto.id);

        if (updateError) throw updateError;

        // 3. Actualizar caché local
        await window.DB.actualizarProductoLocal(producto.id, { stock: nuevoStock });
        productosCache = await window.DB.getProductos();

        // 4. Mostrar éxito
        alert(`✅ Traspaso registrado con éxito!\n\n📦 ${producto.nombre}\n🔢 ${cantidad} unidades\n📍 ${ALMACENES[origen]?.nombre || origen} → ${ALMACENES[destino]?.nombre || destino}\n📊 Stock restante: ${nuevoStock}`);

        // 5. Limpiar formulario y recargar
        window.limpiarFormularioTraspaso();
        await window.cargarTraspasos();
        await window.cargarProductosTraspaso();
        window.actualizarEstadisticas();

        // 6. Actualizar dashboard si está visible
        if (typeof window.cargarDashboard === 'function') {
            window.cargarDashboard();
        }

    } catch (error) {
        console.error('Error registrando traspaso:', error);
        alert(`❌ Error al registrar traspaso: ${error.message}`);
    }
};

// ============================================
// LIMPIAR FORMULARIO
// ============================================

window.limpiarFormularioTraspaso = () => {
    document.getElementById('selectProductoTraspaso').value = '';
    document.getElementById('selectOrigenTraspaso').value = 'principal';
    document.getElementById('selectDestinoTraspaso').value = 'principal';
    document.getElementById('inputCantidadTraspaso').value = '';
    document.getElementById('selectMotivoTraspaso').value = 'Reposición de stock';
    document.getElementById('infoProductoSeleccionado').style.display = 'none';
    document.getElementById('stockDisponibleValor').textContent = '0';
    document.getElementById('inputCantidadTraspaso').style.borderColor = 'var(--border)';
};

// ============================================
// CARGAR TRASPASOS DESDE SUPABASE
// ============================================

window.cargarTraspasos = async () => {
    const tbody = document.getElementById('tablaTraspasos');
    if (!tbody) return;
    
    try {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-spinner fa-pulse fa-2x"></i>
                    <p style="margin-top: 10px;">Cargando traspasos...</p>
                </td>
            </tr>
        `;

        // Obtener traspasos de Supabase
        const { data, error } = await window.supabase
            .from('traspasos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        traspasosCache = data || [];
        window.actualizarEstadisticas();
        window.renderizarTablaTraspasos();

    } catch (error) {
        console.error('Error cargando traspasos:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--danger);">
                    <i class="fas fa-exclamation-triangle fa-2x"></i>
                    <p style="margin-top: 10px;">Error al cargar traspasos: ${error.message}</p>
                </td>
            </tr>
        `;
    }
};

// ============================================
// RENDERIZAR TABLA DE TRASPASOS
// ============================================

window.renderizarTablaTraspasos = () => {
    const tbody = document.getElementById('tablaTraspasos');
    if (!tbody) return;

    const inicio = (paginaActualTraspasos - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const paginaData = traspasosCache.slice(inicio, fin);

    if (paginaData.length === 0 && traspasosCache.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-inbox fa-2x"></i>
                    <p style="margin-top: 10px;">No hay traspasos registrados</p>
                    <p style="font-size: 14px;">Registra tu primer traspaso usando el formulario de arriba</p>
                </td>
            </tr>
        `;
        document.getElementById('infoPaginacion').textContent = 'Mostrando 0 traspasos';
        return;
    }

    if (paginaData.length === 0) {
        paginaActualTraspasos = Math.max(1, paginaActualTraspasos - 1);
        window.renderizarTablaTraspasos();
        return;
    }

    tbody.innerHTML = paginaData.map(t => {
        const origenNombre = ALMACENES[t.origen]?.nombre || t.origen || 'N/A';
        const destinoNombre = ALMACENES[t.destino]?.nombre || t.destino || 'N/A';
        const fecha = t.created_at || t.fecha;
        
        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px;"><strong>#${t.id}</strong></td>
                <td style="padding: 12px;">${fecha ? new Date(fecha).toLocaleString() : 'N/A'}</td>
                <td style="padding: 12px; font-weight: 500;">${t.producto_nombre || t.producto || 'N/A'}</td>
                <td style="padding: 12px;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                        ${origenNombre}
                    </span>
                </td>
                <td style="padding: 12px;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(16, 185, 129, 0.15); color: #10b981;">
                        ${destinoNombre}
                    </span>
                </td>
                <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 16px;">${t.cantidad}</td>
                <td style="padding: 12px; font-size: 13px;">${t.motivo || '-'}</td>
                <td style="padding: 12px;">${t.usuario || 'Admin'}</td>
            </tr>
        `;
    }).join('');

    // Actualizar paginación
    const totalPaginas = Math.ceil(traspasosCache.length / ITEMS_POR_PAGINA);
    document.getElementById('paginaActualTraspasos').textContent = paginaActualTraspasos;
    document.getElementById('btnAnteriorTraspasos').style.visibility = paginaActualTraspasos > 1 ? 'visible' : 'hidden';
    document.getElementById('btnSiguienteTraspasos').style.visibility = paginaActualTraspasos < totalPaginas ? 'visible' : 'hidden';
    document.getElementById('infoPaginacion').textContent = `Mostrando ${Math.min(traspasosCache.length, inicio + ITEMS_POR_PAGINA)} de ${traspasosCache.length} traspasos`;
};

// ============================================
// PAGINACIÓN
// ============================================

window.cambiarPaginaTraspasos = (direccion) => {
    const totalPaginas = Math.ceil(traspasosCache.length / ITEMS_POR_PAGINA);
    const nuevaPagina = paginaActualTraspasos + direccion;
    
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    
    paginaActualTraspasos = nuevaPagina;
    window.renderizarTablaTraspasos();
};

// ============================================
// FILTRAR TRASPASOS
// ============================================

window.filtrarTraspasos = () => {
    const filtro = document.getElementById('filtroTraspasos').value.toLowerCase().trim();
    if (!filtro) {
        window.renderizarTablaTraspasos();
        return;
    }
    
    const filtrados = traspasosCache.filter(t => 
        (t.producto_nombre || '').toLowerCase().includes(filtro) ||
        (t.producto || '').toLowerCase().includes(filtro) ||
        (t.producto_sku || '').toLowerCase().includes(filtro)
    );
    
    const tbody = document.getElementById('tablaTraspasos');
    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fas fa-search"></i> No se encontraron traspasos con "${filtro}"
                </td>
            </tr>
        `;
        return;
    }
    
    // Mostrar filtrados sin paginación
    tbody.innerHTML = filtrados.map(t => {
        const origenNombre = ALMACENES[t.origen]?.nombre || t.origen || 'N/A';
        const destinoNombre = ALMACENES[t.destino]?.nombre || t.destino || 'N/A';
        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px;"><strong>#${t.id}</strong></td>
                <td style="padding: 12px;">${t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'}</td>
                <td style="padding: 12px; font-weight: 500;">${t.producto_nombre || t.producto || 'N/A'}</td>
                <td style="padding: 12px;"><span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(59, 130, 246, 0.15); color: #3b82f6;">${origenNombre}</span></td>
                <td style="padding: 12px;"><span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(16, 185, 129, 0.15); color: #10b981;">${destinoNombre}</span></td>
                <td style="padding: 12px; text-align: center; font-weight: bold; font-size: 16px;">${t.cantidad}</td>
                <td style="padding: 12px;">${t.motivo || '-'}</td>
                <td style="padding: 12px;">${t.usuario || 'Admin'}</td>
            </tr>
        `;
    }).join('');
};

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================

window.actualizarEstadisticas = () => {
    const total = traspasosCache.length;
    const totalProductos = traspasosCache.reduce((sum, t) => sum + (t.cantidad || 0), 0);
    const ultimo = traspasosCache.length > 0 ? traspasosCache[0] : null;
    
    document.getElementById('totalTraspasos').textContent = total;
    document.getElementById('totalProductosTrasladados').textContent = totalProductos;
    document.getElementById('ultimoTraspaso').textContent = ultimo ? 
        `${ultimo.producto_nombre || ultimo.producto} (${ultimo.cantidad} unid.)` : '-';
};

// ============================================
// INICIALIZACIÓN DEL MÓDULO
// ============================================

setTimeout(async () => {
    if (document.getElementById('selectProductoTraspaso')) {
        await window.cargarProductosTraspaso();
        await window.cargarTraspasos();
        window.actualizarEstadisticas();
    }
}, 300);
