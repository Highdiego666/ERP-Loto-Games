// ============================================
// LOTO GAMES POS - TECLADO V3
// Atajos físicos activos incluso con inputs enfocados
// ============================================

(function () {
  'use strict';

  const modulesByAlt = {
    '1': 'dashboard', '2': 'ventas', '3': 'productos', '4': 'inventario', '5': 'servicios',
    '6': 'clientes', '7': 'usuarios', '8': 'reportes', '9': 'traspasos'
  };

  function closeTopModal() {
    const modals = Array.from(document.querySelectorAll('.modal')).filter(m => {
      const s = getComputedStyle(m);
      return s.display !== 'none' && s.visibility !== 'hidden';
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

  document.addEventListener('keydown', e => {
    if (document.getElementById('loginRoot')) return;

    const current = window.getCurrentModule?.();
    const editing = isEditingTarget(e.target);

    // Atajos de operación: se procesan ANTES de ignorar inputs.
    // Así F4 funciona aunque el cursor esté en el buscador o en venta rápida.
    if (e.key === 'F2') {
      e.preventDefault();
      if (current !== 'ventas') {
        window.loadModule?.('ventas');
        setTimeout(() => window.focusVentaSearch?.(), 120);
      } else {
        window.focusVentaSearch?.();
      }
      return;
    }

    if (e.key === 'F3') {
      e.preventDefault();
      if (current !== 'ventas') {
        window.loadModule?.('ventas');
        setTimeout(() => window.focusVentaRapida?.(), 160);
      } else {
        window.focusVentaRapida?.();
      }
      return;
    }

    if (e.key === 'F4' && current === 'ventas') {
      e.preventDefault();
      window.finalizarVenta?.();
      return;
    }

    if (e.altKey && modulesByAlt[e.key]) {
      e.preventDefault();
      window.loadModule?.(modulesByAlt[e.key]);
      return;
    }

    if (e.key === 'Escape') {
      if (closeTopModal()) {
        e.preventDefault();
        return;
      }
      if (current === 'ventas' && ['ventaRapidaConcepto', 'ventaRapidaMonto'].includes(e.target?.id)) {
        e.preventDefault();
        window.focusVentaSearch?.();
      }
      return;
    }

    if (e.ctrlKey && e.key === 'Enter' && editing) {
      const form = e.target.closest('form');
      if (form) {
        e.preventDefault();
        form.requestSubmit();
      }
      return;
    }

    if (editing) return;
  });

  console.log('✅ Teclado V3: F2 buscar · F3 venta rápida · F4 cobrar · Esc volver/cerrar · Alt+1…9 módulos');
})();
