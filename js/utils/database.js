// ============================================
// LOTO GAMES POS - BASE DE DATOS LOCAL
// ============================================

const DB = {
    // Inicializar datos por defecto
    init() {
        // Productos iniciales
        if (!localStorage.getItem('productos')) {
            const productosIniciales = [
                {
                    id: 1,
                    nombre: "PlayStation 5",
                    sku: "LOT-PS5-001",
                    codigoBarras: "750100000001",
                    categoria: "consolas",
                    tipo: "nueva",
                    precio: 12500,
                    stock: 5,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    nombre: "Xbox Series X",
                    sku: "LOT-XBX-002",
                    codigoBarras: "750100000002",
                    categoria: "consolas",
                    tipo: "nueva",
                    precio: 11800,
                    stock: 3,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 3,
                    nombre: "Control DualSense",
                    sku: "LOT-CTR-003",
                    codigoBarras: "750100000003",
                    categoria: "accesorios",
                    tipo: "nueva",
                    precio: 1500,
                    stock: 12,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem('productos', JSON.stringify(productosIniciales));
        }

        // Ventas iniciales
        if (!localStorage.getItem('ventas')) {
            localStorage.setItem('ventas', JSON.stringify([]));
        }

        // Usuarios iniciales
        if (!localStorage.getItem('usuarios')) {
            const usuariosIniciales = [
                {
                    id: 1,
                    nombre: "Administrador",
                    email: "admin@lotogames.com",
                    password: "admin123",
                    rol: "admin",
                    estado: "activo",
                    privilegios: [],
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem('usuarios', JSON.stringify(usuariosIniciales));
        }

        // Clientes iniciales
        if (!localStorage.getItem('clientes')) {
            localStorage.setItem('clientes', JSON.stringify([]));
        }

        // Servicios iniciales
        if (!localStorage.getItem('servicios')) {
            localStorage.setItem('servicios', JSON.stringify([]));
        }

        console.log('✅ Base de datos inicializada correctamente');
    },

    // ========== PRODUCTOS ==========
    getProductos() {
        return JSON.parse(localStorage.getItem('productos') || '[]');
    },

    saveProducto(producto) {
        const productos = this.getProductos();
        producto.id = Date.now();
        producto.createdAt = new Date().toISOString();
        productos.push(producto);
        localStorage.setItem('productos', JSON.stringify(productos));
        console.log('✅ Producto guardado:', producto.nombre);
        return producto;
    },

    updateProducto(id, data) {
        const productos = this.getProductos();
        const index = productos.findIndex(p => p.id == id);
        if (index !== -1) {
            productos[index] = { ...productos[index], ...data };
            localStorage.setItem('productos', JSON.stringify(productos));
            console.log('✅ Producto actualizado:', productos[index].nombre);
            return productos[index];
        }
        return null;
    },

    deleteProducto(id) {
        const productos = this.getProductos();
        const productoEliminado = productos.find(p => p.id == id);
        const nuevosProductos = productos.filter(p => p.id != id);
        localStorage.setItem('productos', JSON.stringify(nuevosProductos));
        console.log('✅ Producto eliminado:', productoEliminado?.nombre);
        return true;
    },

    // ========== VENTAS ==========
    registrarVenta(venta) {
        const ventas = this.getVentas();
        venta.id = Date.now();
        venta.fecha = new Date().toISOString();
        ventas.push(venta);
        localStorage.setItem('ventas', JSON.stringify(ventas));
        
        // Actualizar stock de productos
        venta.items.forEach(item => {
            if (item.tipo !== 'rapida') {
                const producto = this.getProductos().find(p => p.id == item.id);
                if (producto) {
                    const nuevoStock = producto.stock - item.cantidad;
                    this.updateProducto(item.id, { stock: nuevoStock });
                    console.log(`📦 Stock actualizado: ${producto.nombre} (${producto.stock} → ${nuevoStock})`);
                }
            }
        });
        
        console.log('✅ Venta registrada:', venta.id, 'Total: $' + venta.total);
        return venta;
    },

    getVentas() {
        return JSON.parse(localStorage.getItem('ventas') || '[]');
    },

    // ========== USUARIOS ==========
    getUsuarios() {
        return JSON.parse(localStorage.getItem('usuarios') || '[]');
    },

    saveUsuario(usuario) {
        const usuarios = this.getUsuarios();
        usuario.id = Date.now();
        usuario.createdAt = new Date().toISOString();
        usuarios.push(usuario);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        return usuario;
    },

    updateUsuario(id, data) {
        const usuarios = this.getUsuarios();
        const index = usuarios.findIndex(u => u.id == id);
        if (index !== -1) {
            usuarios[index] = { ...usuarios[index], ...data };
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            return usuarios[index];
        }
        return null;
    },

    deleteUsuario(id) {
        const usuarios = this.getUsuarios();
        const nuevosUsuarios = usuarios.filter(u => u.id != id);
        localStorage.setItem('usuarios', JSON.stringify(nuevosUsuarios));
        return true;
    },

    // ========== ESTADÍSTICAS ==========
    getStats() {
        const productos = this.getProductos();
        const ventas = this.getVentas();
        
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

    // ========== CLIENTES ==========
    getClientes() {
        return JSON.parse(localStorage.getItem('clientes') || '[]');
    },

    saveCliente(cliente) {
        const clientes = this.getClientes();
        cliente.id = Date.now();
        cliente.createdAt = new Date().toISOString();
        clientes.push(cliente);
        localStorage.setItem('clientes', JSON.stringify(clientes));
        return cliente;
    },

    // ========== SERVICIOS TÉCNICOS ==========
    getServicios() {
        return JSON.parse(localStorage.getItem('servicios') || '[]');
    },

    saveServicio(servicio) {
        const servicios = this.getServicios();
        servicio.id = Date.now();
        servicio.createdAt = new Date().toISOString();
        servicio.estado = servicio.estado || 'pendiente';
        servicios.push(servicio);
        localStorage.setItem('servicios', JSON.stringify(servicios));
        return servicio;
    },

    updateServicio(id, data) {
        const servicios = this.getServicios();
        const index = servicios.findIndex(s => s.id == id);
        if (index !== -1) {
            servicios[index] = { ...servicios[index], ...data };
            localStorage.setItem('servicios', JSON.stringify(servicios));
            return servicios[index];
        }
        return null;
    },

    deleteServicio(id) {
        const servicios = this.getServicios();
        const nuevosServicios = servicios.filter(s => s.id != id);
        localStorage.setItem('servicios', JSON.stringify(nuevosServicios));
        return true;
    }
};

// Inicializar la base de datos
DB.init();

// Exponer DB globalmente
window.DB = DB;

console.log('🗄️ Base de datos lista', {
    productos: DB.getProductos().length,
    ventas: DB.getVentas().length,
    usuarios: DB.getUsuarios().length
});
