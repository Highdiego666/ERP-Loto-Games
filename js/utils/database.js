// ============================================
// LOTO GAMES POS - BASE DE DATOS (SUPABASE + LOCALSTORAGE)
// ============================================

const DB = {
    // ========== INICIALIZACIÓN ==========
    async init() {
        console.log('🗄️ Inicializando DB...');
        if (!window.supabase) {
            console.warn('⚠️ Supabase no disponible, usando localStorage');
        }
    },

    // ========== PRODUCTOS (con LOCAL) ==========
    async getProductos() {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('productos')
                    .select('*')
                    .order('id', { ascending: false });
                if (error) throw error;
                return data || [];
            }
        } catch (e) { console.warn('Supabase error, usando localStorage', e); }
        return JSON.parse(localStorage.getItem('productos') || '[]');
    },

    async getProductoById(id) {
        const productos = await this.getProductos();
        return productos.find(p => p.id == id);
    },

    async saveProducto(producto) {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('productos')
                    .insert([{
                        nombre: producto.nombre,
                        sku: producto.sku,
                        codigo_barras: producto.codigoBarras,
                        categoria: producto.categoria,
                        tipo: producto.tipo,
                        local: producto.local || '',
                        precio: parseFloat(producto.precio),
                        stock: parseInt(producto.stock),
                        created_at: new Date().toISOString()
                    }])
                    .select();
                if (error) throw error;
                console.log('✅ Producto guardado en Supabase');
                return data[0];
            }
        } catch (e) { console.warn('Supabase error, guardando local', e); }
        const productos = await this.getProductos();
        producto.id = Date.now();
        producto.createdAt = new Date().toISOString();
        producto.local = producto.local || '';
        productos.push(producto);
        localStorage.setItem('productos', JSON.stringify(productos));
        return producto;
    },

    async updateProducto(id, data) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('productos')
                    .update({
                        nombre: data.nombre,
                        categoria: data.categoria,
                        tipo: data.tipo,
                        local: data.local || '',
                        precio: parseFloat(data.precio),
                        stock: parseInt(data.stock)
                    })
                    .eq('id', id);
                if (error) throw error;
                console.log('✅ Producto actualizado');
                return true;
            }
        } catch (e) { console.warn('Supabase error, actualizando local', e); }
        let productos = JSON.parse(localStorage.getItem('productos') || '[]');
        const index = productos.findIndex(p => p.id == id);
        if (index !== -1) {
            productos[index] = { ...productos[index], ...data };
            localStorage.setItem('productos', JSON.stringify(productos));
            return true;
        }
        return false;
    },

    async deleteProducto(id) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('productos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                console.log('✅ Producto eliminado');
                return true;
            }
        } catch (e) { console.warn('Supabase error, eliminando local', e); }
        let productos = JSON.parse(localStorage.getItem('productos') || '[]');
        productos = productos.filter(p => p.id != id);
        localStorage.setItem('productos', JSON.stringify(productos));
        return true;
    },

    // ========== VENTAS ==========
    async registrarVenta(venta) {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('ventas')
                    .insert([{
                        items: venta.items,
                        total: venta.total,
                        metodo_pago: venta.metodoPago,
                        comentario: venta.comentario || '',
                        descuento_aplicado: venta.descuentoAplicado || false,
                        usuario: venta.usuario || 'Admin',
                        fecha: new Date().toISOString()
                    }])
                    .select();
                if (error) throw error;

                // Actualizar stock de productos
                if (venta.items) {
                    for (const item of venta.items) {
                        if (item.tipo !== 'rapida') {
                            const { data: prod } = await window.supabase
                                .from('productos')
                                .select('stock')
                                .eq('id', item.id)
                                .single();
                            if (prod) {
                                await this.updateProducto(item.id, { stock: prod.stock - item.cantidad });
                            }
                        }
                    }
                }
                console.log('✅ Venta registrada en Supabase');
                return data[0];
            }
        } catch (e) { console.warn('Supabase error, guardando venta local', e); }
        const ventas = JSON.parse(localStorage.getItem('ventas') || '[]');
        venta.id = Date.now();
        venta.fecha = new Date().toISOString();
        ventas.push(venta);
        localStorage.setItem('ventas', JSON.stringify(ventas));
        // Actualizar stock local
        if (venta.items) {
            for (const item of venta.items) {
                if (item.tipo !== 'rapida') {
                    const p = (await this.getProductos()).find(pr => pr.id == item.id);
                    if (p) await this.updateProducto(item.id, { stock: p.stock - item.cantidad });
                }
            }
        }
        return venta;
    },

    async getVentas() {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('ventas')
                    .select('*')
                    .order('fecha', { ascending: false });
                if (error) throw error;
                return data || [];
            }
        } catch (e) { console.warn('Supabase error, usando localStorage', e); }
        return JSON.parse(localStorage.getItem('ventas') || '[]');
    },

    // ========== USUARIOS (con PIN) ==========
    async getUsuarios() {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('usuarios')
                    .select('*');
                if (error) throw error;
                return data || [];
            }
        } catch (e) { console.warn('Supabase error, usando localStorage', e); }
        return JSON.parse(localStorage.getItem('usuarios') || '[]');
    },

    async saveUsuario(usuario) {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('usuarios')
                    .insert([{
                        nombre: usuario.nombre,
                        email: usuario.email,
                        password: usuario.password,
                        pin: usuario.pin || '',
                        rol: usuario.rol,
                        estado: usuario.estado,
                        privilegios: usuario.privilegios || [],
                        created_at: new Date().toISOString()
                    }])
                    .select();
                if (error) throw error;
                return data[0];
            }
        } catch (e) { console.warn('Supabase error, guardando local', e); }
        const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        usuario.id = Date.now();
        usuarios.push(usuario);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        return usuario;
    },

    async updateUsuario(id, data) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('usuarios')
                    .update(data)
                    .eq('id', id);
                if (error) throw error;
                return true;
            }
        } catch (e) { console.warn('Supabase error, actualizando local', e); }
        let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        const index = usuarios.findIndex(u => u.id == id);
        if (index !== -1) {
            usuarios[index] = { ...usuarios[index], ...data };
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            return true;
        }
        return false;
    },

    async deleteUsuario(id) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('usuarios')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return true;
            }
        } catch (e) { console.warn('Supabase error, eliminando local', e); }
        let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        usuarios = usuarios.filter(u => u.id != id);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        return true;
    },

    // ========== CLIENTES ==========
    async getClientes() {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('clientes')
                    .select('*');
                if (error) throw error;
                return data || [];
            }
        } catch (e) { console.warn('Supabase error, usando localStorage', e); }
        return JSON.parse(localStorage.getItem('clientes') || '[]');
    },

    async saveCliente(cliente) {
        try {
            if (window.supabase) {
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
                return data[0];
            }
        } catch (e) { console.warn('Supabase error, guardando local', e); }
        const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
        cliente.id = Date.now();
        clientes.push(cliente);
        localStorage.setItem('clientes', JSON.stringify(clientes));
        return cliente;
    },

    async updateCliente(id, data) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('clientes')
                    .update(data)
                    .eq('id', id);
                if (error) throw error;
                return true;
            }
        } catch (e) { console.warn('Supabase error, actualizando local', e); }
        let clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
        const index = clientes.findIndex(c => c.id == id);
        if (index !== -1) {
            clientes[index] = { ...clientes[index], ...data };
            localStorage.setItem('clientes', JSON.stringify(clientes));
            return true;
        }
        return false;
    },

    async deleteCliente(id) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('clientes')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                return true;
            }
        } catch (e) { console.warn('Supabase error, eliminando local', e); }
        let clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
        clientes = clientes.filter(c => c.id != id);
        localStorage.setItem('clientes', JSON.stringify(clientes));
        return true;
    },

    // ========== SERVICIOS TÉCNICOS ==========
    async getServicios() {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('servicios_tecnicos')
                    .select('*')
                    .order('id', { ascending: false });
                if (error) throw error;
                return data || [];
            }
        } catch (e) { console.warn('Supabase error, usando localStorage', e); }
        return JSON.parse(localStorage.getItem('servicios') || '[]');
    },

    async saveServicio(servicio) {
        try {
            if (window.supabase) {
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
                        tecnico_asignado: servicio.tecnico_asignado || '',
                        entregado_por: servicio.entregado_por || '',
                        created_at: new Date().toISOString()
                    }])
                    .select();
                if (error) throw error;
                console.log('✅ Servicio guardado en Supabase');
                return data[0];
            }
        } catch (e) { console.warn('Supabase error, guardando local', e); }
        const servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
        servicio.id = Date.now();
        servicio.createdAt = new Date().toISOString();
        servicios.push(servicio);
        localStorage.setItem('servicios', JSON.stringify(servicios));
        return servicio;
    },

    async updateServicio(id, data) {
        try {
            if (window.supabase) {
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
                        garantia_dias: data.garantia_dias || 30,
                        tecnico_asignado: data.tecnico_asignado || '',
                        entregado_por: data.entregado_por || ''
                    })
                    .eq('id', id);
                if (error) throw error;
                console.log('✅ Servicio actualizado');
                return true;
            }
        } catch (e) { console.warn('Supabase error, actualizando local', e); }
        let servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
        const index = servicios.findIndex(s => s.id == id);
        if (index !== -1) {
            servicios[index] = { ...servicios[index], ...data };
            localStorage.setItem('servicios', JSON.stringify(servicios));
            return true;
        }
        return false;
    },

    async deleteServicio(id) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('servicios_tecnicos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                console.log('✅ Servicio eliminado');
                return true;
            }
        } catch (e) { console.warn('Supabase error, eliminando local', e); }
        let servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
        servicios = servicios.filter(s => s.id != id);
        localStorage.setItem('servicios', JSON.stringify(servicios));
        return true;
    },

    // ========== TRASPASOS (COMPLETO) ==========
    async getTraspasos() {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('traspasos')
                    .select('*')
                    .order('fecha', { ascending: false });
                if (error) throw error;
                return data || [];
            }
        } catch (e) { console.warn('Supabase error, usando localStorage', e); }
        return JSON.parse(localStorage.getItem('traspasos') || '[]');
    },

    async saveTraspaso(traspaso) {
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('traspasos')
                    .insert([{
                        producto_id: traspaso.producto_id,
                        producto_nombre: traspaso.producto_nombre,
                        tipo: traspaso.tipo,
                        cantidad: parseInt(traspaso.cantidad),
                        motivo: traspaso.motivo || '',
                        usuario: traspaso.usuario || 'Admin',
                        local_origen: traspaso.local_origen || '',
                        local_destino: traspaso.local_destino || '',
                        locatario_nombre: traspaso.locatario_nombre || '',
                        locatario_telefono: traspaso.locatario_telefono || '',
                        monto: parseFloat(traspaso.monto) || 0,
                        estado_pago: traspaso.estado_pago || 'pendiente',
                        fecha_pago: traspaso.fecha_pago || null,
                        fecha: new Date().toISOString()
                    }])
                    .select();
                if (error) throw error;

                // Actualizar stock (solo para traspasos locales y salidas a locatarios)
                if (traspaso.tipo === 'traspaso_local' || traspaso.tipo === 'salida_locatario') {
                    const producto = await this.getProductoById(traspaso.producto_id);
                    if (producto) {
                        const nuevoStock = producto.stock - parseInt(traspaso.cantidad);
                        await this.updateProducto(traspaso.producto_id, { stock: nuevoStock });
                        console.log(`📦 Stock actualizado: ${producto.nombre} → ${nuevoStock}`);
                    }
                }
                console.log('✅ Traspaso registrado en Supabase');
                return data[0];
            }
        } catch (e) { console.warn('Supabase error, guardando local', e); }
        const traspasos = JSON.parse(localStorage.getItem('traspasos') || '[]');
        traspaso.id = Date.now();
        traspaso.createdAt = new Date().toISOString();
        traspasos.push(traspaso);
        localStorage.setItem('traspasos', JSON.stringify(traspasos));
        // Actualizar stock local
        if (traspaso.tipo === 'traspaso_local' || traspaso.tipo === 'salida_locatario') {
            const productos = JSON.parse(localStorage.getItem('productos') || '[]');
            const idx = productos.findIndex(p => p.id == traspaso.producto_id);
            if (idx !== -1) {
                productos[idx].stock -= parseInt(traspaso.cantidad);
                localStorage.setItem('productos', JSON.stringify(productos));
            }
        }
        return traspaso;
    },

    async updateTraspaso(id, data) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('traspasos')
                    .update({
                        motivo: data.motivo,
                        estado_pago: data.estado_pago,
                        monto: parseFloat(data.monto) || 0,
                        fecha_pago: data.fecha_pago || null
                    })
                    .eq('id', id);
                if (error) throw error;
                console.log('✅ Traspaso actualizado');
                return true;
            }
        } catch (e) { console.warn('Supabase error, actualizando local', e); }
        let traspasos = JSON.parse(localStorage.getItem('traspasos') || '[]');
        const index = traspasos.findIndex(t => t.id == id);
        if (index !== -1) {
            traspasos[index] = { ...traspasos[index], ...data };
            localStorage.setItem('traspasos', JSON.stringify(traspasos));
            return true;
        }
        return false;
    },

    async deleteTraspaso(id) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('traspasos')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                console.log('✅ Traspaso eliminado de Supabase');
                return true;
            }
        } catch (e) { console.warn('Supabase error, eliminando local', e); }
        let traspasos = JSON.parse(localStorage.getItem('traspasos') || '[]');
        traspasos = traspasos.filter(t => t.id != id);
        localStorage.setItem('traspasos', JSON.stringify(traspasos));
        return true;
    },

    // ========== ESTADÍSTICAS ==========
    async getStats() {
        const productos = await this.getProductos();
        const ventas = await this.getVentas();
        const servicios = await this.getServicios();
        const clientes = await this.getClientes();

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const ventasHoy = ventas.filter(v => new Date(v.fecha) >= hoy);
        const totalVentasHoy = ventasHoy.reduce((s, v) => s + (v.total || 0), 0);

        return {
            totalProductos: productos.length,
            stockBajo: productos.filter(p => p.stock < 5).length,
            ventasHoy: ventasHoy.length,
            totalVentasHoy: totalVentasHoy,
            serviciosPendientes: servicios.filter(s => s.estado === 'pendiente').length,
            clientesTotales: clientes.length
        };
    },

    // ========== RESET (seguridad) ==========
    async resetDatabase() {
        if (!confirm('⚠️ ¿Estás seguro? Esto eliminará TODOS los datos locales y de Supabase.')) return;
        try {
            if (window.supabase) {
                // Opcional: eliminar datos de Supabase
                // await window.supabase.from('productos').delete().neq('id', 0);
            }
        } catch (e) {}
        localStorage.clear();
        alert('Datos eliminados');
        location.reload();
    }
};

// ============================================
// INICIALIZAR
// ============================================

DB.init();
window.DB = DB;
console.log("✅ DB module loaded");
