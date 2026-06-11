// Database Manager
const DB = {
    // Inicializar datos por defecto
    init() {
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
                },
                {
                    id: 4,
                    nombre: "PS5 Usada Completa",
                    sku: "LOT-PS5U-004",
                    codigoBarras: "750100000004",
                    categoria: "consolas",
                    tipo: "usada-completa",
                    precio: 9500,
                    stock: 2,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 5,
                    nombre: "Control PS4 Usado",
                    sku: "LOT-CTRU-005",
                    codigoBarras: "750100000005",
                    categoria: "accesorios",
                    tipo: "segunda-mano",
                    precio: 450,
                    stock: 8,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem('productos', JSON.stringify(productosIniciales));
        }
        
        if (!localStorage.getItem('ventas')) {
            localStorage.setItem('ventas', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('clientes')) {
            localStorage.setItem('clientes', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('servicios')) {
            localStorage.setItem('servicios', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('usuarios')) {
            const usuariosIniciales = [
                {
                    id: 1,
                    nombre: "Administrador",
                    email: "admin@lotogames.com",
                    rol: "admin",
                    estado: "activo",
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem('usuarios', JSON.stringify(usuariosIniciales));
        }
    },
    
    // Obtener todos los productos
    getProductos() {
        return JSON.parse(localStorage.getItem('productos') || '[]');
    },
    
    // Guardar producto
    saveProducto(producto) {
        const productos = this.getProductos();
        producto.id = Date.now();
        producto.createdAt = new Date().toISOString();
        productos.push(producto);
        localStorage.setItem('productos', JSON.stringify(productos));
        return producto;
    },
    
    // Actualizar producto
    updateProducto(id, data) {
        const productos = this.getProductos();
        const index = productos.findIndex(p => p.id == id);
        if (index !== -1) {
            productos[index] = { ...productos[index], ...data };
            localStorage.setItem('productos', JSON.stringify(productos));
            return productos[index];
        }
        return null;
    },
    
    // Eliminar producto
    deleteProducto(id) {
        const productos = this.getProductos();
        const filtered = productos.filter(p => p.id != id);
        localStorage.setItem('productos', JSON.stringify(filtered));
        return true;
    },
    
    // Registrar venta
   registrarVenta(venta) {
    const ventas = JSON.parse(localStorage.getItem('ventas') || '[]');
    venta.id = Date.now();
    venta.fecha = new Date().toISOString();
    ventas.push(venta);
    localStorage.setItem('ventas', JSON.stringify(ventas));
    
    // Actualizar stock solo para productos normales (no ventas rápidas)
    venta.items.forEach(item => {
        if (item.tipo !== 'rapida') {
            const p = this.getProductos().find(pr => pr.id == item.id);
            if (p) {
                p.stock -= item.cantidad;
                this.updateProducto(item.id, { stock: p.stock });
            }
        }
    });
    return venta;
},
    
    // Obtener ventas
    getVentas() {
        return JSON.parse(localStorage.getItem('ventas') || '[]');
    },
    
    // Obtener estadísticas
    getStats() {
        const productos = this.getProductos();
        const ventas = this.getVentas();
        const servicios = JSON.parse(localStorage.getItem('servicios') || '[]');
        
        const hoy = new Date().toDateString();
        const ventasHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
        const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
        
        return {
            totalProductos: productos.length,
            stockBajo: productos.filter(p => p.stock < 5).length,
            ventasHoy: ventasHoy.length,
            totalVentasHoy: totalVentasHoy,
            serviciosPendientes: servicios.filter(s => s.estado === 'pendiente').length
        };
    }
};

// Inicializar
DB.init();

// Exportar
window.DB = DB;
