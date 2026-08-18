// ============================================
// LOTO GAMES POS - TECLADO V2
// Atajos físicos consistentes en toda la aplicación
// ============================================

(function () {
  'use strict';

  const modulesByAlt = {
    '1':'dashboard','2':'ventas','3':'productos','4':'inventario','5':'servicios',
    '6':'clientes','7':'usuarios','8':'reportes','9':'traspasos'
  };

  function closeTopModal() {
    const modals = Array.from(document.querySelectorAll('.modal')).filter(m => {
      const s = getComputedStyle(m);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });
    const top = modals[modals.length - 1];
    if (top) {
      top.style.display = 'none';
      return true;
    }
    return false;
  }

  document.addEventListener('keydown', e => {
    if (document.getElementById('loginRoot')) return; // login-v2 maneja su propio teclado

    const tag = String(e.target?.tagName || '').toLowerCase();
    const editing = ['input','textarea','select'].includes(tag) || e.target?.isContentEditable;

    if (e.key === 'Escape') {
      if (closeTopModal()) e.preventDefault();
      return;
    }

    if (e.ctrlKey && e.key === 'Enter' && editing) {
      const form = e.target.closest('form');
      if (form) { e.preventDefault(); form.requestSubmit(); }
      return;
    }

    if (editing) return;

    if (e.key === 'F2') {
      e.preventDefault();
      if (window.getCurrentModule?.() !== 'ventas') {
        window.loadModule?.('ventas');
        setTimeout(() => window.focusVentaSearch?.(), 120);
      } else window.focusVentaSearch?.();
      return;
    }

    if (e.key === 'F4' && window.getCurrentModule?.() === 'ventas') {
      e.preventDefault();
      window.finalizarVenta?.();
      return;
    }

    if (e.altKey && modulesByAlt[e.key]) {
      e.preventDefault();
      window.loadModule?.(modulesByAlt[e.key]);
    }
  });

  console.log('✅ Teclado V2: F2 buscar/vender · F4 cobrar · Esc cerrar modal · Alt+1…9 módulos · Ctrl+Enter guardar formularios');
})();
