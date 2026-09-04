// Diagnóstico ligero de carga para release.
setTimeout(() => {
  const modules = {
    dashboard: typeof window.dashboardModule,
    ventas: typeof window.ventasModule,
    productos: typeof window.productosModule,
    inventario: typeof window.inventarioModule,
    servicios: typeof window.serviciosModule,
    clientes: typeof window.clientesModule,
    usuarios: typeof window.usuariosModule,
    reportes: typeof window.reportesModule,
    traspasos: typeof window.traspasosModule,
    corte: typeof window.corteModule,
    login: typeof window.loginModule
  };
  const missing = Object.entries(modules)
    .filter(([, value]) => value !== 'function')
    .map(([key]) => key);

  if (missing.length) console.warn('⚠️ Módulos faltantes:', missing);
  else console.log('✅ LOTO GAMES ERP / POS V1 listo', modules);
}, 1000);
