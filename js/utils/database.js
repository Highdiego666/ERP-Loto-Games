// ============================================
// LOTO GAMES POS - BASE DE DATOS CON SUPABASE
// ============================================

const DB = {
    // ========== PRODUCTOS ==========
    async getProductos() {
        const { data, error } = await window.supabase
            .from('productos')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) {
            console.error('Error al cargar productos:', error);
            return [];
        }
        return data || [];
    },

    async saveProducto(producto) {
        const { data, error } = await window.supabase
            .from('productos')
            .insert([{
                nombre: producto.nombre,
                sku: producto.sku,
                codigo_barras: producto.codigoBarras,
                categoria: producto.categoria,
                tipo: producto.tipo,
                precio: producto.precio,
                stock: producto.stock
            }])
            .select();
        
        if (error) {
            console.error('Error al guardar producto:', error);
            alert('Error: ' + error.message);
            return null;
        }
        console.log('✅ Producto guardado en Supabase');
        return data[0];
    },

    async updateProducto(id, data) {
        const { error } = await window.supabase
            .from('productos')
            .update(data)
            .eq('id', id);
        
        if (error) {
            console.error('Error al actualizar:', error);
            return false;
        }
        console.log('✅ Producto actualizado');
        return true;
    },

    async deleteProducto(id) {
        const { error } = await window.supabase
            .from('productos')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error al eliminar:', error);
            return false;
        }
        console.log('✅ Producto eliminado');
        return true;
    },

    // ========== VENTAS ==========
    async registrarVenta(venta) {
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
        
        if (error) {
            console.error('Error al registrar venta:', error);
            alert('Error al registrar venta: ' + error.message);
            return null;
        }
        
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
    },

    async getVentas() {
        const { data, error } = await window.supabase
            .from('ventas')
            .select('*')
            .order('fecha', { ascending: false });
        
        if (error) {
            console.error('Error al cargar ventas:', error);
            return [];
        }
        return data || [];
    },

    // ========== USUARIOS ==========
    async getUsuarios() {
        const { data, error } = await window.supabase
            .from('usuarios')
            .select('*');
        
        if (error) {
            console.error('Error al cargar usuarios:', error);
            return [];
        }
        return data || [];
    },

    async saveUsuario(usuario) {
        const { data, error } = await window.supabase
            .from('usuarios')
            .insert([{
                nombre: usuario.nombre,
                email: usuario.email,
                password: usuario.password,
                rol: usuario.rol,
                estado: usuario.estado,
                privilegios: usuario.privilegios || []
            }])
            .select();
        
        if (error) {
            console.error('Error al guardar usuario:', error);
            return null;
        }
        return data[0];
    },

    async updateUsuario(id, data) {
        const { error } = await window.supabase
            .from('usuarios')
            .update(data)
            .eq('id', id);
        
        if (error) console.error('Error al actualizar usuario:', error);
        return !error;
    },

    async deleteUsuario(id) {
        const { error } = await window.supabase
            .from('usuarios')
            .delete()
            .eq('id', id);
        
        if (error) console.error('Error al eliminar usuario:', error);
        return !error;
    },

    // ========== CLIENTES ==========
    async getClientes() {
        const { data, error } = await window.supabase
            .from('clientes')
            .select('*');
        
        if (error) return [];
        return data || [];
    },

    async saveCliente(cliente) {
        const { data, error } = await window.supabase
            .from('clientes')
            .insert([cliente])
            .select();
        
        if (error) return null;
        return data[0];
    },

    // ========== SERVICIOS ==========
    async getServicios() {
        const { data, error } = await window.supabase
            .from('servicios_tecnicos')
            .select('*');
        
        if (error) return [];
        return data || [];
    },

    async saveServicio(servicio) {
        const { data, error } = await window.supabase
            .from('servicios_tecnicos')
            .insert([servicio])
            .select();
        
        if (error) return null;
        return data[0];
    },

    async updateServicio(id, data) {
        const { error } = await window.supabase
            .from('servicios_tecnicos')
            .update(data)
            .eq('id', id);
        
        return !error;
    },

    async deleteServicio(id) {
        const { error } = await window.supabase
            .from('servicios_tecnicos')
            .delete()
            .eq('id', id);
        
        return !error;
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
    async sincronizar() {
        console.log('🔄 Sincronizando con Supabase...');
        const productos = await this.getProductos();
        const ventas = await this.getVentas();
        console.log(`📦 ${productos.length} productos, 🛒 ${ventas.length} ventas`);
        return { productos, ventas };
    }
};

// Inicializar y verificar conexión
(async () => {
    console.log('🗄️ Conectando a Supabase...');
    if (window.supabase) {
        const { data, error } = await window.supabase.from('productos').select('count');
        if (!error) {
            console.log('✅ Conexión con Supabase exitosa');
            const stats = await DB.getStats();
            console.log('📊 Estadísticas:', stats);
        } else {
            console.error('❌ Error de conexión con Supabase:', error);
        }
    } else {
        console.error('❌ Supabase no está disponible');
    }
})();

window.DB = DB;
