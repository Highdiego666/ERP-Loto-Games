// ============================================
// LOTO GAMES POS - BASE DE DATOS CON SUPABASE
// ============================================

const DB = {
    // ========== INICIALIZACIÓN ==========
    async init() {
        console.log('🗄️ Conectando a Supabase...');
        
        // Verificar si hay datos locales para migrar
        const productosLocal = localStorage.getItem('productos');
        if (productosLocal && !localStorage.getItem('migrado_supabase')) {
            console.log('🔄 Migrando datos locales a Supabase...');
            const productos = JSON.parse(productosLocal);
            for (const p of productos) {
                await this.saveProducto(p);
            }
            localStorage.setItem('migrado_supabase', 'true');
            console.log('✅ Migración completada');
        }
    },

    // ========== PRODUCTOS ==========
    async getProductos() {
        try {
            const { data, error } = await window.supabase
                .from('productos')
                .select('*')
                .order('id', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error al cargar productos:', error);
            return [];
        }
    },

    async saveProducto(producto) {
        try {
            const { data, error } = await window.supabase
                .from('productos')
                .insert([{
                    nombre: producto.nombre,
                    sku: producto.sku,
                    codigo_barras: producto.codigoBarras,
                    categoria: producto.categoria,
                    tipo: producto.tipo,
                    precio: parseFloat(producto.precio),
                    stock: parseInt(producto.stock),
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            console.log('✅ Producto guardado en Supabase:', producto.nombre);
            return data[0];
        } catch (error) {
            console.error('Error al guardar producto:', error);
            alert('Error al guardar: ' + error.message);
            return null;
        }
    },

    async updateProducto(id, data) {
        try {
            const { error } = await window.supabase
                .from('productos')
                .update({
                    nombre: data.nombre,
                    categoria: data.categoria,
                    tipo: data.tipo,
                    precio: parseFloat(data.precio),
                    stock: parseInt(data.stock)
                })
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Producto actualizado en Supabase');
            return true;
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            return false;
        }
    },

    async deleteProducto(id) {
        try {
            const { error } = await window.supabase
                .from('productos')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Producto eliminado de Supabase');
            return true;
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            return false;
        }
    },

    // ========== VENTAS ==========
    async registrarVenta(venta) {
        try {
            const { data, error } = await window.supabase
                .from('ventas')
                .insert([{
                    items: venta.items,
                    subtotal: venta.subtotal,
                    iva: venta.iva,
                    total: venta.total,
                    metodo_pago: venta.metodoPago,
                    comentario: venta.comentario || '',
                    fecha: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            
            // Actualizar stock de productos
            if (venta.items) {
                for (const item of venta.items) {
                    if (item.tipo !== 'rapida') {
                        const { data: producto } = await window.supabase
                            .from('productos')
                            .select('stock')
                            .eq('id', item.id)
                            .single();
                        
                        if (producto) {
                            await this.updateProducto(item.id, { 
                                stock: producto.stock - item.cantidad 
                            });
                        }
                    }
                }
            }
            
            console.log('✅ Venta registrada en Supabase');
            return data[0];
        } catch (error) {
            console.error('Error al registrar venta:', error);
            alert('Error al registrar venta: ' + error.message);
            return null;
        }
    },

    async getVentas() {
        try {
            const { data, error } = await window.supabase
                .from('ventas')
                .select('*')
                .order('fecha', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error al cargar ventas:', error);
            return [];
        }
    },

    // ========== USUARIOS ==========
    async getUsuarios() {
        try {
            const { data, error } = await window.supabase
                .from('usuarios')
                .select('*')
                .order('id', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            return [];
        }
    },

    async saveUsuario(usuario) {
        try {
            const { data, error } = await window.supabase
                .from('usuarios')
                .insert([{
                    nombre: usuario.nombre,
                    email: usuario.email,
                    password: usuario.password,
                    rol: usuario.rol,
                    estado: usuario.estado,
                    privilegios: usuario.privilegios || [],
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            console.log('✅ Usuario guardado en Supabase');
            return data[0];
        } catch (error) {
            console.error('Error al guardar usuario:', error);
            return null;
        }
    },

    async updateUsuario(id, data) {
        try {
            const { error } = await window.supabase
                .from('usuarios')
                .update({
                    nombre: data.nombre,
                    email: data.email,
                    rol: data.rol,
                    estado: data.estado,
                    privilegios: data.privilegios || []
                })
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Usuario actualizado en Supabase');
            return true;
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            return false;
        }
    },

    async deleteUsuario(id) {
        try {
            const { error } = await window.supabase
                .from('usuarios')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Usuario eliminado de Supabase');
            return true;
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            return false;
        }
    },

    // ========== CLIENTES ==========
    async getClientes() {
        try {
            const { data, error } = await window.supabase
                .from('clientes')
                .select('*')
                .order('id', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            return [];
        }
    },

    async saveCliente(cliente) {
        try {
            const { data, error } = await window.supabase
                .from('clientes')
                .insert([{
                    nombre: cliente.nombre,
                    email: cliente.email || '',
                    telefono: cliente.telefono || '',
                    direccion: cliente.direccion || '',
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            console.log('✅ Cliente guardado en Supabase');
            return data[0];
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            return null;
        }
    },

    async updateCliente(id, data) {
        try {
            const { error } = await window.supabase
                .from('clientes')
                .update({
                    nombre: data.nombre,
                    email: data.email,
                    telefono: data.telefono,
                    direccion: data.direccion
                })
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Cliente actualizado en Supabase');
            return true;
        } catch (error) {
            console.error('Error al actualizar cliente:', error);
            return false;
        }
    },

    async deleteCliente(id) {
        try {
            const { error } = await window.supabase
                .from('clientes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Cliente eliminado de Supabase');
            return true;
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            return false;
        }
    },

    // ========== SERVICIOS TÉCNICOS ==========
    async getServicios() {
        try {
            const { data, error } = await window.supabase
                .from('servicios_tecnicos')
                .select('*')
                .order('id', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error al cargar servicios:', error);
            return [];
        }
    },

    async saveServicio(servicio) {
        try {
            const { data, error } = await window.supabase
                .from('servicios_tecnicos')
                .insert([{
                    cliente_id: servicio.cliente_id,
                    cliente_nombre: servicio.cliente_nombre,
                    equipo: servicio.equipo,
                    problema: servicio.problema,
                    diagnostico: servicio.diagnostico || '',
                    estado: servicio.estado || 'pendiente',
                    precio: parseFloat(servicio.precio) || 0,
                    garantia_dias: servicio.garantia_dias || 30,
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            console.log('✅ Servicio guardado en Supabase');
            return data[0];
        } catch (error) {
            console.error('Error al guardar servicio:', error);
            return null;
        }
    },

    async updateServicio(id, data) {
        try {
            const { error } = await window.supabase
                .from('servicios_tecnicos')
                .update({
                    cliente_id: data.cliente_id,
                    cliente_nombre: data.cliente_nombre,
                    equipo: data.equipo,
                    problema: data.problema,
                    diagnostico: data.diagnostico,
                    estado: data.estado,
                    precio: parseFloat(data.precio) || 0,
                    garantia_dias: data.garantia_dias || 30
                })
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Servicio actualizado en Supabase');
            return true;
        } catch (error) {
            console.error('Error al actualizar servicio:', error);
            return false;
        }
    },

    async deleteServicio(id) {
        try {
            const { error } = await window.supabase
                .from('servicios_tecnicos')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('✅ Servicio eliminado de Supabase');
            return true;
        } catch (error) {
            console.error('Error al eliminar servicio:', error);
            return false;
        }
    },

    // ========== ESTADÍSTICAS ==========
    async getStats() {
        const productos = await this.getProductos();
        const ventas = await this.getVentas();
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const ventasHoy = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta >= hoy;
        });
        
        const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + (v.total || 0), 0);
        const numeroVentasHoy = ventasHoy.length;
        
        return {
            totalProductos: productos.length,
            stockBajo: productos.filter(p => p.stock < 5).length,
            ventasHoy: numeroVentasHoy,
            totalVentasHoy: totalVentasHoy
        };
    },

    // ========== SINCRONIZACIÓN ==========
    async sincronizarTodo() {
        console.log('🔄 Sincronizando con Supabase...');
        const productos = await this.getProductos();
        const ventas = await this.getVentas();
        const clientes = await this.getClientes();
        const servicios = await this.getServicios();
        
        console.log(`📊 Resumen:
        - Productos: ${productos.length}
        - Ventas: ${ventas.length}
        - Clientes: ${clientes.length}
        - Servicios: ${servicios.length}`);
        
        return { productos, ventas, clientes, servicios };
    }
};

// Inicializar la base de datos
(async () => {
    if (window.supabase) {
        await DB.init();
        const stats = await DB.getStats();
        console.log('🗄️ Base de datos con Supabase lista');
        console.log('📊 Estadísticas:', stats);
    } else {
        console.error('❌ Supabase no está disponible. Verifica supabase-client.js');
    }
})();

// Exponer DB globalmente
window.DB = DB;
