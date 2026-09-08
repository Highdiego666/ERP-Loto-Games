// ============================================
// LOTO GAMES - ESTADO DE ACTUALIZACIONES WINDOWS
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  if (!desktop?.isDesktop || !desktop.update) return;

  let lastState = null;
  let unsubscribe = null;

  function ensureIndicator() {
    let el = document.getElementById('updateStatusTop');
    if (el) return el;

    const host = document.querySelector('.top-bar-actions');
    if (!host) return null;

    el = document.createElement('button');
    el.id = 'updateStatusTop';
    el.type = 'button';
    el.className = 'db-status db-status-checking';
    el.style.cssText = 'border:0;cursor:pointer;font:inherit;';
    el.title = 'Comprobar actualizaciones de Loto Games';
    el.innerHTML = '<span class="db-dot"></span><span>Versión…</span>';
    host.insertBefore(el, host.firstChild);
    el.addEventListener('click', handleClick);
    return el;
  }

  function render(state) {
    lastState = state || lastState || {};
    const el = ensureIndicator();
    if (!el) return;

    const status = lastState.status || 'idle';
    let css = 'db-status-checking';
    let text = `v${lastState.currentVersion || ''}`;

    if (status === 'disabled') {
      css = 'db-status-demo';
      text = `v${lastState.currentVersion || ''} · desarrollo`;
    } else if (status === 'checking') {
      css = 'db-status-checking';
      text = 'Buscando versión…';
    } else if (status === 'available' || status === 'downloading') {
      css = 'db-status-checking';
      text = status === 'downloading'
        ? `Actualizando ${Math.round(Number(lastState.percent || 0))}%`
        : `Nueva v${lastState.availableVersion || ''}`;
    } else if (status === 'downloaded') {
      css = 'db-status-ok';
      text = `v${lastState.availableVersion || ''} lista`;
    } else if (status === 'error') {
      css = 'db-status-demo';
      text = `v${lastState.currentVersion || ''} · offline`;
    } else if (status === 'current') {
      css = 'db-status-ok';
      text = `v${lastState.currentVersion || ''} · actualizada`;
    }

    el.className = `db-status ${css}`;
    el.innerHTML = `<span class="db-dot"></span><span>${text}</span>`;
    el.title = lastState.error
      ? `${lastState.message || 'Actualización pendiente'}\n${lastState.error}`
      : (lastState.message || 'Comprobar actualizaciones de Loto Games');
  }

  async function check() {
    if (!navigator.onLine) {
      render({
        ...(lastState || {}),
        status: 'error',
        message: 'Sin Internet; se comprobará de nuevo al recuperar conexión'
      });
      return;
    }

    try {
      render(await desktop.update.check());
    } catch (error) {
      console.warn('No se pudo comprobar la actualización:', error);
    }
  }

  async function handleClick() {
    if (lastState?.status === 'downloaded') {
      const version = lastState.availableVersion || 'nueva';
      if (!confirm(`La versión ${version} ya está descargada.\n\n¿Cerrar Loto Games e instalarla ahora?`)) return;
      try {
        await desktop.update.install();
      } catch (error) {
        alert('No se pudo iniciar la actualización: ' + (error?.message || error));
      }
      return;
    }

    await check();
  }

  async function init() {
    ensureIndicator();
    try {
      render(await desktop.update.status());
    } catch (error) {
      console.warn('No se pudo leer el estado del actualizador:', error);
    }

    unsubscribe = desktop.update.onStatus(render);
    window.addEventListener('online', () => setTimeout(check, 2500));
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('beforeunload', () => unsubscribe?.());
})();
