// ============================================
// LOTO GAMES POS - TECLADO V4
// Atajos físicos de operación de caja
// ============================================

(function () {
  'use strict';

  const modulesByAlt = {
    '1': 'dashboard', '2': 'ventas', '3': 'productos', '4': 'inventario', '5': 'servicios',
    '6': 'clientes', '7': 'usuarios', '8': 'reportes', '9': 'traspasos'
  };

  function closeTopModal() {
    const modals = Array.from(document.querySelectorAll('.modal')).filter(modal => {
      const style = getComputedStyle(modal);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const top = modals[modals.length - 1];
    if (!top) return false;
    top.style.display = 'none';
    return true;
  }

  function isEditingTarget(target) {
    const tag = String(target?.tagName || '').toLowerCase();
    return ['input', 'textarea', 'select'].includes(tag) || target?.isContentEditable;
  }

  document.addEventListener('keydown', event => {
    if (document.getElementById('loginRoot')) return;

    const current = window.getCurrentModule?.();
    const editing = isEditingTarget(event.target);

    // Atajos de caja se atienden primero para que funcionen aunque haya un input enfocado.
    if (event.key === 'F2') {
      event.preventDefault();
      if (current !== 'ventas') {
        window.loadModule?.('ventas');
        setTimeout(() => window.focusVentaSearch?.(), 120);
      } else {
        window.focusVentaSearch?.();
      }
      return;
    }

    if (event.key === 'F3') {
      event.preventDefault();
      if (current !== 'ventas') {
        window.loadModule?.('ventas');
        setTimeout(() => window.focusVentaRapida?.(), 160);
      } else {
        window.focusVentaRapida?.();
      }
      return;
    }

    if (event.key === 'F4' && current === 'ventas') {
      event.preventDefault();
      window.finalizarVenta?.();
      return;
    }

    if (event.key === 'F6' && current === 'ventas') {
      event.preventDefault();
      window.toggleDescuento?.();
      return;
    }

    if (event.altKey && modulesByAlt[event.key]) {
      event.preventDefault();
      window.loadModule?.(modulesByAlt[event.key]);
      return;
    }

    if (event.key === 'Escape') {
      if (closeTopModal()) {
        event.preventDefault();
        return;
      }
      if (current === 'ventas' && ['ventaRapidaConcepto', 'ventaRapidaMonto'].includes(event.target?.id)) {
        event.preventDefault();
        window.focusVentaSearch?.();
      }
      return;
    }

    if (event.ctrlKey && event.key === 'Enter' && editing) {
      const form = event.target.closest('form');
      if (form) {
        event.preventDefault();
        form.requestSubmit();
      }
      return;
    }

    if (editing) return;
  });

  console.log('✅ Teclado V4: F2 buscar · F3 venta rápida · F4 cobrar · F6 descuento 5% · Esc volver/cerrar · Alt+1…9 módulos');
})();
