// ============================================
// LOTO GAMES - SCANNER CONFIG V2
// Lector USB/HID con terminador y timeout configurables.
// ============================================

(function () {
  'use strict';

  const TIMEOUT_KEY = 'loto_scanner_timeout_ms';
  const SUFFIX_KEY = 'loto_scanner_suffix';
  let buffer = '';
  let timer = null;

  const timeoutMs = () => {
    const value = Number(localStorage.getItem(TIMEOUT_KEY) || 80);
    return Math.max(30, Math.min(Number.isFinite(value) ? value : 80, 500));
  };

  const suffix = () => {
    const value = localStorage.getItem(SUFFIX_KEY) || 'Enter';
    return ['Enter','Tab','Auto'].includes(value) ? value : 'Enter';
  };

  function isSuffix(key) {
    const configured = suffix();
    return configured === 'Auto' ? (key === 'Enter' || key === 'Tab') : key === configured;
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    const code = buffer;
    buffer = '';
    if (code.length > 2) window.procesarCodigoEscaneadoV2?.(code);
  }

  window.inicializarEscannerV2 = () => {
    if (window.__scannerV5Handler) {
      document.removeEventListener('keydown', window.__scannerV5Handler);
    }

    window.__scannerV5Handler = event => {
      if (window.getCurrentModule?.() !== 'ventas') return;
      const tag = String(event.target?.tagName || '').toLowerCase();
      if (['input','textarea','select'].includes(tag) || event.target?.isContentEditable) return;

      if (isSuffix(event.key)) {
        if (buffer) {
          event.preventDefault();
          flush();
        }
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        buffer += event.key;
        clearTimeout(timer);
        timer = setTimeout(flush, timeoutMs());
      }
    };

    document.addEventListener('keydown', window.__scannerV5Handler);
  };

  // Cuando la búsqueda está enfocada, el scanner escribe directamente en ese
  // input. Aceptamos Enter y Tab según configuración y procesamos el código exacto.
  const originalSearchKey = window.teclaBusquedaVentaV2;
  if (typeof originalSearchKey === 'function') {
    window.teclaBusquedaVentaV2 = event => {
      if (isSuffix(event.key)) {
        event.preventDefault();
        const code = String(event.target?.value || '').trim();
        if (code) window.procesarCodigoEscaneadoV2?.(code);
        return;
      }
      return originalSearchKey(event);
    };
  }

  const originalConfigModule = window.configuracionModule;
  if (typeof originalConfigModule === 'function') {
    window.configuracionModule = () => originalConfigModule() + `
      <section class="table-container" style="margin-top:16px;max-width:680px;">
        <h3 style="margin-top:0;">🔫 Configuración avanzada del lector</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Ajusta cómo termina una lectura HID. La mayoría de lectores usan Enter.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;">
          <div class="form-group" style="margin:0;">
            <label>Terminador</label>
            <select id="cfgScannerSuffix" class="form-control"><option value="Enter">Enter</option><option value="Tab">Tab</option><option value="Auto">Enter o Tab</option></select>
          </div>
          <div class="form-group" style="margin:0;">
            <label>Timeout de lectura (ms)</label>
            <input id="cfgScannerTimeout" type="number" min="30" max="500" step="10" class="form-control" value="80">
          </div>
          <button class="btn btn-primary" onclick="window.guardarScannerConfig()">Guardar lector</button>
        </div>
        <small style="display:block;color:var(--text-muted);margin-top:10px;">Rango permitido: 30–500 ms. Si un código llega cortado, aumenta ligeramente el timeout.</small>
      </section>`;
  }

  const originalLoadConfig = window.cargarConfiguracion;
  if (typeof originalLoadConfig === 'function') {
    window.cargarConfiguracion = async (...args) => {
      const result = await originalLoadConfig(...args);
      const suffixEl = document.getElementById('cfgScannerSuffix');
      const timeoutEl = document.getElementById('cfgScannerTimeout');
      if (suffixEl) suffixEl.value = suffix();
      if (timeoutEl) timeoutEl.value = timeoutMs();
      return result;
    };
  }

  window.guardarScannerConfig = () => {
    const suffixValue = document.getElementById('cfgScannerSuffix')?.value || 'Enter';
    const timeoutValue = Number(document.getElementById('cfgScannerTimeout')?.value || 80);
    if (!['Enter','Tab','Auto'].includes(suffixValue)) return alert('Terminador de scanner inválido.');
    if (!Number.isFinite(timeoutValue) || timeoutValue < 30 || timeoutValue > 500) return alert('El timeout debe estar entre 30 y 500 ms.');
    localStorage.setItem(SUFFIX_KEY, suffixValue);
    localStorage.setItem(TIMEOUT_KEY, String(Math.round(timeoutValue)));
    window.inicializarEscannerV2?.();
    alert(`✅ Lector configurado: ${suffixValue === 'Auto' ? 'Enter o Tab' : suffixValue}, ${Math.round(timeoutValue)} ms.`);
  };

  window.LotoScannerConfig = { timeoutMs, suffix };
  console.log('✅ Scanner V2: terminador Enter/Tab + timeout configurable');
})();
