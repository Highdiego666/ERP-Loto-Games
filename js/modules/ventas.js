// ============================================
// LOTO GAMES POS - MÓDULO DE VENTAS
// CON EDICIÓN DE PRECIO EN VENTA
// ============================================

let carritoVentas = [];
let descuentoActivo = false;

// ============================================
// CONFIGURACIÓN DEL LOGO
// ============================================
const LOGO_BASE64 = ''; // <--- PEGA TU LOGO AQUÍ

// ============================================
// MÓDULO PRINCIPAL
// ============================================

window.ventasModule = function() {
    return `
        <div style="display: grid; grid-template-columns: 1fr 400px; gap: 24px;">
            <!-- COLUMNA IZQUIERDA: BÚSQUEDA Y PRODUCTOS -->
            <div>
                <div class="table-container">
                    <h3 style="margin-bottom: 20px;">🔍 Buscar Producto</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <input type="text" id="buscadorProducto" class="form-control" placeholder="SKU, código de barras o nombre..." onkeydown="if(event.key === 'Enter') window.buscarProductoVenta()">
                        <button class="btn btn-primary" onclick="window.buscarProductoVenta()">
                            <i class="fas fa-search"></i> Buscar
                        </button>
                    </div>
                    <div id="resultadoBusqueda" style="min-height: 100px;"></div>
                </div>
                <div class="table-container" style="margin-top: 24px;">
                    <h3 style="margin-bottom: 20px;">📦 Productos Disponibles</h3>
                    <div id="listaProductosGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto;">
                        <p style="text-align: center; grid-column: 1/-1;">Cargando productos...</p>
                    </div>
                </div>
            </div>

            <!-- COLUMNA DERECHA: CARRITO -->
            <div>
                <div class="table-container">
                    <h3 style="margin-bottom: 20px;">🛒 Carrito de Venta</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 12px; color: var(--text-muted);">👤 Vendedor</label>
                        <select id="usuarioVenta" class="form-control">
                            <option value="">Cargando usuarios...</option>
                        </select>
                    </div>
                    <div id="carritoVentas" style="min-height: 200px; max-height: 300px; overflow-y: auto;">
                        <p style="text-align: center; color: var(--text-muted);">🛒 Carrito vacío</p>
                    </div>
                    <hr style="margin: 15px 0;">
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                            <span>TOTAL:</span>
                            <span id="totalCarrito" style="color: var(--success);">$0</span>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>🎯 Descuento 5%</strong></span>
                        <button id="btnDescuento" class="btn" style="background: var(--gray); color: white; padding: 8px 16px;" onclick="window.toggleDescuento()">
                            Activar
                        </button>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label>💳 Método de Pago:</label>
                        <select id="metodoPagoVenta" class="form-control" style="margin-top: 5px;">
                            <option value="Efectivo">💰 Efectivo</option>
                            <option value="Tarjeta">💳 Tarjeta</option>
                            <option value="Transferencia">🏦 Transferencia</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label>📝 Comentario:</label>
                        <textarea id="comentarioVenta" class="form-control" rows="2" placeholder="Observaciones..."></textarea>
                    </div>
                    <div style="margin-bottom: 15px; padding: 15px; background: rgba(99, 102, 241, 0.1); border-radius: 12px;">
                        <h4>⚡ Venta Rápida</h4>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <input type="text" id="ventaRapidaConcepto" class="form-control" placeholder="Concepto" style="flex: 2;">
                            <input type="number" id="ventaRapidaMonto" class="form-control" placeholder="Monto" style="flex: 1;">
                            <button class="btn btn-success" onclick="window.agregarVentaRapida()">➕</button>
                        </div>
                        <small style="color: var(--text-muted);">Para piezas sueltas, refacciones o servicios</small>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" style="flex: 1;" onclick="window.finalizarVenta()">
                            <i class="fas fa-check"></i> Finalizar
                        </button>
                        <button class="btn btn-danger" style="flex: 1;" onclick="window.limpiarCarrito()">
                            <i class="fas fa-trash"></i> Limpiar
                        </button>
                    </div>
                </div>

                <!-- TÉRMINOS Y CONDICIONES -->
                <div class="table-container" style="margin-top: 20px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2);">
                    <h4 style="color: #d32f2f; margin-bottom: 8px;">
                        <i class="fas fa-file-contract"></i> Términos y Condiciones
                    </h4>
                    <div style="font-size: 11px; color: var(--text-muted); line-height: 1.6; max-height: 150px; overflow-y: auto; white-space: pre-wrap; font-family: 'Arial', sans-serif; padding: 8px; background: var(--bg-dark); border-radius: 8px;">
                        ═══════════════════════════════════
                        📋 TÉRMINOS Y CONDICIONES
                        ═══════════════════════════════════

                        🔧 GARANTÍA POR REPARACIÓN: 30 DÍAS
                        La garantía cubre ÚNICAMENTE la falla
                        específica reportada y reparada.

                        ❌ LA GARANTÍA SE ANULA SI:
                        1. El equipo es abierto, manipulado o
                           reparado por personal ajeno.
                        2. Daños por líquidos, golpes, caídas
                           o mal uso.
                        3. Software/firmware no autorizado.
                        4. Etiqueta de seguridad rota o alterada.
                        5. El daño original es diferente al
                           reportado.

                        ⚠️ IMPORTANTE:
                        • Guarda este ticket como comprobante.
                        • Garantía personal e intransferible.
                        • Aplica solo en nuestra tienda física.
                        • No cubre piezas estéticas.

                        ✅ DERECHO DE REVISIÓN:
                        Ante cualquier anomalía, el equipo será
                        revisado por nuestro departamento técnico.

                        🕐 HORARIO DE GARANTÍAS:
                        Lun-Vie: 11:00 a 17:00
                        Sábado y Domingo: No atendemos garantías

                        ═══════════════════════════════════
                        ¡Gracias por confiar en LOTO GAMES!
                        📞 (55) 1234-5678
                        ═══════════════════════════════════
                    </div>
                </div>
            </div>
        </div>
    `;
};

// ============================================
// FUNCIONES DEL CARRITO
// ============================================

window.cargarUsuariosVenta = async function() {
    try {
        const usuarios = await window.DB.getUsuarios();
        const select = document.getElementById('usuarioVenta');
        if (select) {
            select.innerHTML = usuarios.map(u => `<option value="${u.nombre}">${u.nombre}</option>`).join('');
            if (window.usuarioActual) {
                select.value = window.usuarioActual.nombre;
            }
        }
    } catch (e) {
        console.warn('No se pudieron cargar usuarios', e);
    }
};

window.cargarProductosVenta = async function() {
    try {
        const productos = await window.DB.getProductos();
        const productosConStock = productos.filter(p => p.stock > 0);
        const container = document.getElementById('listaProductosGrid');
        if (!container) return;
        
        if (productosConStock.length === 0) {
            container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No hay productos disponibles</p>';
            return;
        }
        
        container.innerHTML = productosConStock.map(function(p) {
            const precioBase = parseFloat(p.precio);
            const precioConRecargo = precioBase * 1.05;
            return `
                <div style="background: var(--bg-dark); padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent;" 
                     onclick="window.agregarAlCarrito(${p.id})"
                     onmouseover="this.style.borderColor='var(--primary)'" 
                     onmouseout="this.style.borderColor='transparent'">
                    <div style="font-weight: bold; font-size: 14px;">${p.nombre}</div>
                    <div style="color: var(--success); font-size: 18px;">$${precioConRecargo.toFixed(2)}</div>
                    <small style="color: var(--text-muted);">SKU: ${p.sku}</small>
                    <div style="font-size: 11px;">Stock: ${p.stock}</div>
                </div>
            `;
        }).join('');
        window.cargarUsuariosVenta();
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
};

window.buscarProductoVenta = async function() {
    const busqueda = document.getElementById('buscadorProducto').value.trim().toLowerCase();
    const resultadoDiv = document.getElementById('resultadoBusqueda');
    
    if (!busqueda) {
        resultadoDiv.innerHTML = '<p style="color: var(--warning);">✏️ Escribe SKU, código o nombre</p>';
        return;
    }
    
    try {
        const productos = await window.DB.getProductos();
        const producto = productos.find(function(p) {
            return (p.sku && p.sku.toLowerCase() === busqueda) || 
                   (p.codigo_barras && p.codigo_barras === busqueda) ||
                   (p.nombre && p.nombre.toLowerCase().includes(busqueda));
        });
        
        if (producto && producto.stock > 0) {
            const precioBase = parseFloat(producto.precio);
            const precioConRecargo = precioBase * 1.05;
            resultadoDiv.innerHTML = `
                <div style="background: var(--bg-card); padding: 15px; border-radius: 10px; border-left: 4px solid var(--success);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <strong style="font-size: 16px;">${producto.nombre}</strong><br>
                            <small>SKU: ${producto.sku} | Código: ${producto.codigo_barras}</small><br>
                            <strong style="color: var(--success);">$${precioConRecargo.toFixed(2)}</strong>
                            <span style="color: var(--text-muted);"> | Stock: ${producto.stock}</span>
                        </div>
                        <button class="btn btn-success" onclick="window.agregarAlCarrito(${producto.id})" style="padding: 10px 20px;">
                            <i class="fas fa-cart-plus"></i> Agregar
                        </button>
                    </div>
                </div>
            `;
        } else if (producto && producto.stock === 0) {
            resultadoDiv.innerHTML = `<div style="background: var(--bg-card); padding: 15px; border-radius: 10px; border-left: 4px solid var(--danger); color: var(--danger);">
                ⚠️ ${producto.nombre} - Sin stock disponible
            </div>`;
        } else {
            resultadoDiv.innerHTML = `<div style="background: var(--bg-card); padding: 15px; border-radius: 10px;">
                ❌ No se encontró "${busqueda}"<br>
                <small>Usa "Venta Rápida" para montos personalizados</small>
            </div>`;
        }
    } catch (error) {
        console.error('Error buscando producto:', error);
        resultadoDiv.innerHTML = '<p style="color: var(--danger);">❌ Error al buscar producto</p>';
    }
};

// ============================================
// ✅ AGREGAR AL CARRITO CON EDICIÓN DE PRECIO
// ============================================

window.agregarAlCarrito = async function(id) {
    try {
        const productos = await window.DB.getProductos();
        const producto = productos.find(function(p) { return p.id == id; });
        if (!producto) {
            alert('❌ Producto no encontrado');
            return;
        }
        if (producto.stock < 1) {
            alert('❌ Producto sin stock');
            return;
        }
        
        // Precio base del producto
        const precioBase = parseFloat(producto.precio);
        const precioConRecargo = precioBase * 1.05;
        
        // ============================================
        // ✅ PERMITIR EDITAR EL PRECIO
        // ============================================
        let precioFinal = precioConRecargo;
        
        // Preguntar si quiere modificar el precio
        const modificarPrecio = confirm(
            '💰 ¿Modificar precio de "' + producto.nombre + '"?\n\n' +
            'Precio actual: $' + precioConRecargo.toFixed(2) + '\n\n' +
            '✅ "OK" para modificar\n' +
            '❌ "Cancelar" para usar el precio actual'
        );
        
        if (modificarPrecio) {
            const nuevoPrecio = prompt(
                '💲 Ingresa el nuevo precio para "' + producto.nombre + '":',
                precioConRecargo.toFixed(2)
            );
            
            if (nuevoPrecio !== null && nuevoPrecio !== '') {
                const precioIngresado = parseFloat(nuevoPrecio);
                if (!isNaN(precioIngresado) && precioIngresado > 0) {
                    precioFinal = precioIngresado;
                    alert('✅ Precio modificado: $' + precioFinal.toFixed(2));
                } else {
                    alert('❌ Precio inválido. Se usará el precio actual.');
                    precioFinal = precioConRecargo;
                }
            } else {
                // Si cancela el prompt, usa el precio actual
                precioFinal = precioConRecargo;
            }
        }
        
        // Verificar si el producto ya está en el carrito
        const existente = carritoVentas.find(function(item) {
            return item.id === id && item.tipo === 'producto';
        });
        
        if (existente) {
            // Verificar stock
            if (existente.cantidad + 1 > producto.stock) {
                alert('⚠️ Stock insuficiente. Solo hay ' + producto.stock);
                return;
            }
            // Actualizar precio y cantidad
            existente.precioPersonalizado = precioFinal;
            existente.precioBase = precioFinal / 1.05;
            existente.cantidad++;
        } else {
            // Agregar nuevo producto al carrito
            carritoVentas.push({
                id: producto.id,
                nombre: producto.nombre,
                sku: producto.sku,
                precioBase: precioFinal / 1.05,
                precioPersonalizado: precioFinal,
                cantidad: 1,
                tipo: 'producto'
            });
        }
        
        // Actualizar carrito
        window.renderCarritoVentas();
        
        // Limpiar búsqueda
        document.getElementById('buscadorProducto').value = '';
        document.getElementById('resultadoBusqueda').innerHTML = '';
        
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        alert('❌ Error al agregar producto');
    }
};

// ============================================
// VENTA RÁPIDA
// ============================================

window.agregarVentaRapida = function() {
    const concepto = document.getElementById('ventaRapidaConcepto').value.trim();
    const monto = parseFloat(document.getElementById('ventaRapidaMonto').value);
    
    if (!concepto) {
        alert('❌ Ingresa un concepto');
        return;
    }
    if (!monto || monto <= 0) {
        alert('❌ Ingresa un monto válido');
        return;
    }
    
    carritoVentas.push({
        id: Date.now(),
        nombre: '🔧 ' + concepto,
        precioBase: monto,
        precioPersonalizado: monto,
        cantidad: 1,
        sku: 'RAPIDA',
        tipo: 'rapida'
    });
    
    document.getElementById('ventaRapidaConcepto').value = '';
    document.getElementById('ventaRapidaMonto').value = '';
    window.renderCarritoVentas();
};

// ============================================
// RENDERIZAR CARRITO
// ============================================

window.renderCarritoVentas = function() {
    const container = document.getElementById('carritoVentas');
    if (!container) return;
    
    if (carritoVentas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">🛒 Carrito vacío</p>';
        document.getElementById('totalCarrito').innerHTML = '$0';
        return;
    }
    
    let totalBase = 0;
    let totalConRecargo = 0;
    
    container.innerHTML = carritoVentas.map(function(item, index) {
        // Precio a mostrar (personalizado o con recargo)
        const precioMostrar = item.precioPersonalizado || (item.precioBase * 1.05);
        const subtotal = precioMostrar * item.cantidad;
        totalBase += item.precioBase * item.cantidad;
        totalConRecargo += subtotal;
        
        // Indicador de precio modificado
        const precioModificado = item.precioPersonalizado ? ' ✏️' : '';
        const precioModificadoLabel = item.precioPersonalizado ? 
            '<small style="color: #f59e0b;"> (Precio modificado)</small>' : '';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border);">
                <div style="flex: 2;">
                    <strong>${item.nombre}${precioModificado}</strong><br>
                    <small>$${precioMostrar.toFixed(2)} c/u</small>
                    ${precioModificadoLabel}
                </div>
                <div style="flex: 1; text-align: center;">
                    ${item.tipo === 'producto' ? `
                        <button onclick="window.modificarCantidad(${index}, -1)" style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer; color: white;">-</button>
                        <span style="margin: 0 8px;">${item.cantidad}</span>
                        <button onclick="window.modificarCantidad(${index}, 1)" style="background: var(--gray); border: none; width: 25px; height: 25px; border-radius: 5px; cursor: pointer; color: white;">+</button>
                    ` : '<span>1</span>'}
                </div>
                <div style="flex: 1; text-align: right;">
                    $${subtotal.toFixed(2)}
                </div>
                <div style="display: flex; gap: 4px;">
                    ${item.tipo === 'producto' ? `
                        <button onclick="window.editarPrecioCarrito(${index})" style="background: #3b82f6; border: none; width: 30px; height: 30px; border-radius: 5px; cursor: pointer; color: white; font-size: 12px;" title="Editar precio">
                            ✏️
                        </button>
                    ` : ''}
                    <button onclick="window.eliminarDelCarrito(${index})" style="background: var(--danger); border: none; width: 30px; height: 30px; border-radius: 5px; cursor: pointer; color: white; font-size: 12px;" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Actualizar total
    let totalMostrar = descuentoActivo ? totalBase : totalConRecargo;
    document.getElementById('totalCarrito').innerHTML = '$' + totalMostrar.toFixed(2);
    window._totalesCarrito = { totalBase: totalBase, totalConRecargo: totalConRecargo };
};

// ============================================
// ✅ EDITAR PRECIO DESDE EL CARRITO
// ============================================

window.editarPrecioCarrito = function(index) {
    const item = carritoVentas[index];
    if (!item) return;
    if (item.tipo === 'rapida') {
        alert('❌ No se puede modificar el precio de una venta rápida');
        return;
    }
    
    const precioActual = item.precioPersonalizado || (item.precioBase * 1.05);
    const nuevoPrecio = prompt(
        '💲 Modificar precio de "' + item.nombre + '"\n\n' +
        'Precio actual: $' + precioActual.toFixed(2) + '\n\n' +
        'Ingresa el nuevo precio:',
        precioActual.toFixed(2)
    );
    
    if (nuevoPrecio !== null && nuevoPrecio !== '') {
        const precioIngresado = parseFloat(nuevoPrecio);
        if (!isNaN(precioIngresado) && precioIngresado > 0) {
            item.precioBase = precioIngresado / 1.05;
            item.precioPersonalizado = precioIngresado;
            window.renderCarritoVentas();
            alert('✅ Precio de "' + item.nombre + '" actualizado a $' + precioIngresado.toFixed(2));
        } else {
            alert('❌ Precio inválido. No se realizaron cambios.');
        }
    }
};

// ============================================
// OTRAS FUNCIONES DEL CARRITO
// ============================================

window.toggleDescuento = function() {
    descuentoActivo = !descuentoActivo;
    const btn = document.getElementById('btnDescuento');
    if (btn) {
        btn.style.background = descuentoActivo ? 'var(--success)' : 'var(--gray)';
        btn.innerText = descuentoActivo ? 'Activo ✅' : 'Activar';
    }
    window.renderCarritoVentas();
};

window.modificarCantidad = async function(index, delta) {
    const item = carritoVentas[index];
    if (!item) return;
    
    if (item.tipo === 'rapida') {
        if (delta < 1) {
            carritoVentas.splice(index, 1);
        }
        window.renderCarritoVentas();
        return;
    }
    
    try {
        const productos = await window.DB.getProductos();
        const producto = productos.find(function(p) { return p.id == item.id; });
        const nuevaCantidad = item.cantidad + delta;
        
        if (nuevaCantidad < 1) {
            carritoVentas.splice(index, 1);
        } else if (producto && nuevaCantidad <= producto.stock) {
            item.cantidad = nuevaCantidad;
        } else {
            alert('⚠️ Stock insuficiente. Solo hay ' + (producto?.stock || 0));
            return;
        }
        window.renderCarritoVentas();
    } catch (error) {
        console.error('Error modificando cantidad:', error);
        alert('❌ Error al modificar cantidad');
    }
};

window.eliminarDelCarrito = function(index) {
    carritoVentas.splice(index, 1);
    window.renderCarritoVentas();
};

window.limpiarCarrito = function() {
    if (carritoVentas.length === 0) return;
    if (confirm('¿Vaciar todo el carrito?')) {
        carritoVentas = [];
        descuentoActivo = false;
        const btn = document.getElementById('btnDescuento');
        if (btn) {
            btn.style.background = 'var(--gray)';
            btn.innerText = 'Activar';
        }
        window.renderCarritoVentas();
    }
};

// ============================================
// FINALIZAR VENTA
// ============================================

window.finalizarVenta = async function() {
    if (carritoVentas.length === 0) {
        alert('❌ El carrito está vacío');
        return;
    }

    const metodoPago = document.getElementById('metodoPagoVenta').value;
    const comentario = document.getElementById('comentarioVenta').value;
    const usuario = document.getElementById('usuarioVenta')?.value || 'Admin';

    const { totalBase, totalConRecargo } = window._totalesCarrito || { totalBase: 0, totalConRecargo: 0 };
    const totalFinal = descuentoActivo ? totalBase : totalConRecargo;

    const resumen = carritoVentas.map(function(item) {
        const precioConRecargo = item.precioPersonalizado || (item.precioBase * 1.05);
        const subtotal = descuentoActivo ? (item.precioBase * item.cantidad) : (precioConRecargo * item.cantidad);
        return item.nombre + ' x' + item.cantidad + ' = $' + subtotal.toFixed(2);
    }).join('\n');

    const mensaje = '📋 CONFIRMAR VENTA\n\n' + 
                    resumen + '\n\n' + 
                    '💰 TOTAL: $' + totalFinal.toFixed(2) + '\n' +
                    '💳 Método: ' + metodoPago + '\n' +
                    '👤 Vendedor: ' + usuario + 
                    (descuentoActivo ? '\n✅ Descuento 5% aplicado' : '') + 
                    '\n\n¿Confirmar venta?';

    if (!confirm(mensaje)) return;

    try {
        const venta = {
            items: carritoVentas.slice(),
            total: totalFinal,
            metodoPago: metodoPago,
            comentario: comentario,
            usuario: usuario,
            descuentoAplicado: descuentoActivo,
            fecha: new Date().toISOString()
        };

        await window.DB.registrarVenta(venta);

        const itemsVenta = carritoVentas.slice();
        const totalVenta = totalFinal;
        const metodoPagoVenta = metodoPago;
        const comentarioVenta = comentario;
        const usuarioVenta = usuario;
        const descuentoAplicado = descuentoActivo;

        // Limpiar carrito
        carritoVentas = [];
        descuentoActivo = false;
        const btn = document.getElementById('btnDescuento');
        if (btn) {
            btn.style.background = 'var(--gray)';
            btn.innerText = 'Activar';
        }
        window.renderCarritoVentas();
        await window.cargarProductosVenta();
        document.getElementById('comentarioVenta').value = '';

        alert('✅ Venta realizada con éxito\n\nTotal: $' + totalVenta.toFixed(2));

        if (confirm('🖨️ ¿Deseas imprimir el ticket de la venta?')) {
            window.imprimirTicketVenta({
                items: itemsVenta,
                total: totalVenta,
                metodoPago: metodoPagoVenta,
                comentario: comentarioVenta,
                usuario: usuarioVenta,
                descuentoAplicado: descuentoAplicado,
                fecha: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Error al finalizar venta:', error);
        alert('❌ Error al procesar la venta: ' + error.message);
    }
};

// ============================================
// IMPRIMIR TICKET
// ============================================

window.imprimirTicketVenta = function(ventaData) {
    if (!ventaData) {
        alert('❌ No hay datos de venta para imprimir');
        return;
    }

    const win = window.open('', '_blank', 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no,scrollbars=no');
    if (!win) {
        alert('❌ Permite ventanas emergentes para imprimir');
        return;
    }

    const fecha = new Date(ventaData.fecha).toLocaleString();
    const items = ventaData.items || [];
    const total = ventaData.total || 0;
    const metodo = ventaData.metodoPago || 'Efectivo';
    const usuario = ventaData.usuario || 'Admin';
    const comentario = ventaData.comentario || '';
    const descuento = ventaData.descuentoAplicado ? '✅ Descuento 5% aplicado' : '';

    let itemsHtml = items.map(function(item) {
        const precio = item.precioPersonalizado || (item.precioBase * 1.05);
        const subtotal = precio * item.cantidad;
        return '<div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; border-bottom: 1px dotted #ddd;"><span style="font-weight: bold;">' + item.nombre + '</span><span>' + item.cantidad + ' x $' + precio.toFixed(2) + '</span><span style="font-weight: bold; color: #10b981;">$' + subtotal.toFixed(2) + '</span></div>';
    }).join('');

    const logoHtml = LOGO_BASE64 ? '<img src="' + LOGO_BASE64 + '" alt="Logo" style="max-width: 120px; height: auto; margin-bottom: 4px;">' : '<div style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #1e293b;">LOTO <span style="color: #10b981;">GAMES</span></div>';

    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Ticket de Venta</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Arial', 'Helvetica', sans-serif; font-size: 11px; padding: 5px; width: 74mm; min-height: 200mm; margin: 0 auto; background: #fff; line-height: 1.5; }
                .ticket { text-align: center; }
                .ticket .logo { margin-bottom: 4px; }
                .ticket .subtitle { font-size: 11px; color: #666; margin-bottom: 4px; }
                .ticket hr { border: none; border-top: 1px dashed #aaa; margin: 4px 0; }
                .ticket .info-line { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
                .ticket .total-grande { font-size: 22px; font-weight: bold; color: #10b981; padding: 8px 0; }
                .ticket .items { text-align: left; margin: 4px 0; }
                .ticket .footer { font-size: 9px; color: #888; margin-top: 6px; border-top: 1px dashed #aaa; padding-top: 6px; }
                .ticket .garantia { text-align: left; font-size: 8px; color: #555; padding: 4px 0; border-top: 1px dashed #ddd; margin-top: 4px; line-height: 1.3; }
                .ticket .no-devolucion { font-size: 13px; font-weight: bold; color: #d32f2f; margin: 4px 0; }
                @page { size: 74mm auto; margin: 0; }
                @media print { body { padding: 3px; } }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="logo">${logoHtml}</div>
                <div class="subtitle">🎰 LOTO GAMES POS</div>
                <hr>
                <div class="info-line"><span>📅 Fecha:</span><span>${fecha}</span></div>
                <div class="info-line"><span>👤 Vendedor:</span><span>${usuario}</span></div>
                ${descuento ? '<div class="info-line"><span>Descuento:</span><span>5%</span></div>' : ''}
                <hr>
                <div class="items"><strong>📦 Productos:</strong>${itemsHtml}</div>
                <hr>
                <div class="info-line"><span>💳 Método de pago:</span><span>${metodo}</span></div>
                <div class="total-grande">TOTAL: $${total.toFixed(2)}</div>
                ${comentario ? '<div style="font-size:11px; margin-top:4px; color:#555;">📝 ' + comentario + '</div>' : ''}
                <hr>
                <div class="no-devolucion">❌ No Hay devoluciones de Efectivo</div>
                <hr>
                <div class="garantia"><strong>⚠️ TÉRMINOS DE GARANTÍA</strong><br>• Garantía por reparación: 30 días<br>• No cubre daños por líquidos, golpes o mal uso<br>• Etiqueta de seguridad debe estar intacta<br>• Guarda este ticket como comprobante</div>
                <hr>
                <div class="footer">¡Gracias por tu compra!<br>LOTO GAMES - ${new Date().getFullYear()}</div>
            </div>
            <script>
                setTimeout(function() { window.print(); }, 500);
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
};

// ============================================
// INICIALIZACION
// ============================================

setTimeout(function() {
    if (document.getElementById('listaProductosGrid')) {
        window.cargarProductosVenta();
    }
}, 100);

console.log('Modulo de ventas cargado correctamente');
