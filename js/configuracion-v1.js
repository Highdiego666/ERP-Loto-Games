// ============================================
// LOTO GAMES - CONFIGURACIÓN V1
// Hardware y diagnóstico para la candidata de empleados.
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const key = {
    ticketPrinter: 'loto_ticket_printer',
    ticketWidth: 'loto_ticket_width_mm',
    ticketSilent: 'loto_ticket_silent',
    ticketCopies: 'loto_ticket_copies',
    labelPrinter: 'loto_label_printer',
    labelSilent: 'loto_label_silent',
    labelCopies: 'loto_label_copies'
  };

  const get = (name, fallback = '') => localStorage.getItem(name) ?? fallback;
  const set = (name, value) => localStorage.setItem(name, String(value));

  window.configuracionModule = () => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;">
      <div><h2 style="margin:0;">⚙️ Configuración</h2><p style="color:var(--text-muted);margin:4px 0 0;">Impresoras, lector y diagnóstico de esta estación</p></div>
      <button class="btn" onclick="window.refrescarConfiguracionLoto()">↻ Actualizar dispositivos</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start;">
      <section class="table-container">
        <h3 style="margin-top:0;">🧾 Miniprinter / tickets</h3>
        <div class="form-group"><label>Impresora de tickets</label><select id="cfgTicketPrinter" class="form-control"><option value="">Cargando...</option></select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group"><label>Ancho</label><select id="cfgTicketWidth" class="form-control"><option value="80">80 mm</option><option value="58">58 mm</option></select></div>
          <div class="form-group"><label>Copias</label><input id="cfgTicketCopies" type="number" min="1" max="20" class="form-control" value="1"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin:8px 0 14px;"><input id="cfgTicketSilent" type="checkbox"> Imprimir directamente sin mostrar diálogo</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="window.guardarConfiguracionLoto()">Guardar</button><button class="btn btn-success" onclick="window.probarTicketConfiguracion()">Imprimir ticket de prueba</button></div>
        <small style="display:block;color:var(--text-muted);margin-top:10px;">Si no activas impresión directa, Windows mostrará el diálogo de impresión como respaldo.</small>
      </section>

      <section class="table-container">
        <h3 style="margin-top:0;">🏷️ Impresora de etiquetas</h3>
        <div class="form-group"><label>Impresora</label><select id="cfgLabelPrinter" class="form-control"><option value="">Cargando...</option></select></div>
        <div class="form-group"><label>Copias</label><input id="cfgLabelCopies" type="number" min="1" max="20" class="form-control" value="1"></div>
        <label style="display:flex;gap:8px;align-items:center;margin:8px 0 14px;"><input id="cfgLabelSilent" type="checkbox"> Imprimir directamente sin mostrar diálogo</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="window.guardarConfiguracionLoto()">Guardar</button><button class="btn btn-success" onclick="window.probarEtiquetaConfiguracion()">Imprimir etiqueta de prueba</button></div>
        <small style="display:block;color:var(--text-muted);margin-top:10px;">Prueba actual: etiqueta 40 × 30 mm, CODE128.</small>
      </section>

      <section class="table-container">
        <h3 style="margin-top:0;">🔫 Lector de códigos</h3>
        <p style="color:var(--text-muted);font-size:13px;">Los lectores USB/HID se comportan como teclado. Escanea aquí para verificar que Windows y el POS reciben el código completo.</p>
        <div class="form-group"><label>Prueba de escaneo</label><input id="cfgScannerTest" class="form-control" autocomplete="off" placeholder="Haz clic aquí y escanea" onkeydown="window.pruebaScannerConfig(event)"></div>
        <div id="cfgScannerResult" style="padding:10px;border-radius:10px;background:var(--bg-dark);color:var(--text-muted);">Esperando lectura…</div>
      </section>

      <section class="table-container">
        <h3 style="margin-top:0;">🩺 Diagnóstico</h3>
        <div id="cfgDiagnostics" style="font-size:13px;line-height:1.65;color:var(--text-muted);">Cargando diagnóstico...</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn" onclick="window.refrescarDiagnosticoConfiguracion()">Actualizar diagnóstico</button>
          <button class="btn" onclick="window.crearRespaldoConfiguracion()">Crear respaldo SQLite</button>
        </div>
      </section>
    </div>
    <div id="cfgMessage" style="display:none;margin-top:14px;padding:12px;border-radius:10px;"></div>`;

  function showMessage(text, ok = true) {
    const el = document.getElementById('cfgMessage');
    if (!el) return;
    el.style.display = 'block';
    el.style.background = ok ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)';
    el.style.color = ok ? '#34d399' : '#f87171';
    el.textContent = text;
  }

  function optionHtml(printer, selected) {
    const name = String(printer.name || '');
    const label = printer.displayName || name || 'Impresora';
    const suffix = printer.isDefault ? ' · predeterminada' : '';
    return `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(label + suffix)}</option>`;
  }

  async function loadPrinters() {
    const ticket = document.getElementById('cfgTicketPrinter');
    const label = document.getElementById('cfgLabelPrinter');
    if (!ticket || !label) return [];

    try {
      const printers = await window.LotoNativePrint?.listPrinters?.() || [];
      const ticketSaved = get(key.ticketPrinter, '');
      const labelSaved = get(key.labelPrinter, '');
      const build = selected => {
        const selectedExists = !selected || printers.some(p => p.name === selected);
        const unavailable = selected && !selectedExists
          ? `<option value="${esc(selected)}" selected>${esc(selected)} · no disponible</option>`
          : '';
        return '<option value="">Usar diálogo / impresora predeterminada</option>' + unavailable + printers.map(p => optionHtml(p, selected)).join('');
      };
      ticket.innerHTML = build(ticketSaved);
      label.innerHTML = build(labelSaved);
      return printers;
    } catch (error) {
      ticket.innerHTML = '<option value="">No se pudieron listar impresoras</option>';
      label.innerHTML = '<option value="">No se pudieron listar impresoras</option>';
      showMessage('No se pudieron consultar las impresoras: ' + (error?.message || error), false);
      return [];
    }
  }

  function loadSavedSettings() {
    const width = document.getElementById('cfgTicketWidth');
    const ticketCopies = document.getElementById('cfgTicketCopies');
    const labelCopies = document.getElementById('cfgLabelCopies');
    const ticketSilent = document.getElementById('cfgTicketSilent');
    const labelSilent = document.getElementById('cfgLabelSilent');
    if (width) width.value = get(key.ticketWidth, '80') === '58' ? '58' : '80';
    if (ticketCopies) ticketCopies.value = get(key.ticketCopies, '1');
    if (labelCopies) labelCopies.value = get(key.labelCopies, '1');
    if (ticketSilent) ticketSilent.checked = get(key.ticketSilent, '0') === '1';
    if (labelSilent) labelSilent.checked = get(key.labelSilent, '0') === '1';
  }

  window.guardarConfiguracionLoto = () => {
    const ticketPrinter = document.getElementById('cfgTicketPrinter')?.value || '';
    const labelPrinter = document.getElementById('cfgLabelPrinter')?.value || '';
    const width = document.getElementById('cfgTicketWidth')?.value === '58' ? '58' : '80';
    const ticketCopies = Math.max(1, Math.min(Number(document.getElementById('cfgTicketCopies')?.value) || 1, 20));
    const labelCopies = Math.max(1, Math.min(Number(document.getElementById('cfgLabelCopies')?.value) || 1, 20));
    const ticketSilent = !!document.getElementById('cfgTicketSilent')?.checked;
    const labelSilent = !!document.getElementById('cfgLabelSilent')?.checked;

    if (ticketSilent && !ticketPrinter) {
      showMessage('Selecciona una impresora de tickets antes de activar impresión directa.', false);
      return false;
    }
    if (labelSilent && !labelPrinter) {
      showMessage('Selecciona una impresora de etiquetas antes de activar impresión directa.', false);
      return false;
    }

    set(key.ticketPrinter, ticketPrinter);
    set(key.ticketWidth, width);
    set(key.ticketCopies, ticketCopies);
    set(key.ticketSilent, ticketSilent ? '1' : '0');
    set(key.labelPrinter, labelPrinter);
    set(key.labelCopies, labelCopies);
    set(key.labelSilent, labelSilent ? '1' : '0');
    showMessage('Configuración guardada en esta estación.');
    return true;
  };

  window.probarTicketConfiguracion = async () => {
    try {
      if (!window.guardarConfiguracionLoto()) return;
      const width = Number(get(key.ticketWidth, '80')) === 58 ? 58 : 80;
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Prueba</title><style>html,body{margin:0;padding:0;background:white;color:black;font-family:Arial}body{width:${width}mm;padding:3mm;text-align:center;font-size:11px}.big{font-size:18px;font-weight:800}.sep{border-top:1px dashed #000;margin:3mm 0}@page{margin:0}</style></head><body><div class="big">LOTO GAMES</div><div>PRUEBA DE MINIPRINTER</div><div class="sep"></div><div>${esc(new Date().toLocaleString('es-MX'))}</div><div>Si puedes leer esto, la ruta de impresión está funcionando.</div></body></html>`;
      await window.LotoNativePrint.printHtml(html, width, { kind: 'ticket' });
      showMessage('Trabajo de prueba enviado a la impresora.');
    } catch (error) {
      showMessage('Error de impresión: ' + (error?.message || error), false);
    }
  };

  window.probarEtiquetaConfiguracion = async () => {
    try {
      if (!window.guardarConfiguracionLoto()) return;
      if (typeof window.JsBarcode !== 'function') throw new Error('JsBarcode no está disponible.');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      window.JsBarcode(svg, 'LOTO-TEST-123', { format:'CODE128', width:1.2, height:42, displayValue:true, fontSize:10, margin:0 });
      const barcode = new XMLSerializer().serializeToString(svg);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta prueba</title><style>html,body{margin:0;padding:0;background:white;color:black;font-family:Arial}body{width:40mm;height:30mm;padding:1.5mm;text-align:center;display:flex;flex-direction:column;justify-content:center}.name{font-size:10px;font-weight:800}svg{width:36mm;max-height:19mm}@page{size:40mm 30mm;margin:0}</style></head><body><div class="name">LOTO GAMES · PRUEBA</div>${barcode}</body></html>`;
      await window.LotoNativePrint.printHtml(html, 40, { kind:'label', widthMm:40, heightMm:30 });
      showMessage('Etiqueta de prueba enviada.');
    } catch (error) {
      showMessage('Error de etiqueta: ' + (error?.message || error), false);
    }
  };

  window.pruebaScannerConfig = event => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    const input = event.target;
    const value = String(input.value || '').trim();
    const out = document.getElementById('cfgScannerResult');
    if (!out) return;
    if (!value) {
      out.textContent = 'La lectura terminó sin código.';
      out.style.color = '#f87171';
      return;
    }
    out.textContent = `✅ Lectura recibida: ${value} · terminador ${event.key}`;
    out.style.color = '#34d399';
    input.value = '';
  };

  window.refrescarDiagnosticoConfiguracion = async () => {
    const target = document.getElementById('cfgDiagnostics');
    if (!target) return;
    try {
      const [paths, pending] = await Promise.all([
        desktop?.app?.paths?.() || Promise.resolve({}),
        desktop?.sync?.pending?.(50) || Promise.resolve([])
      ]);
      const runtime = window.LotoRuntimeHealth?.snapshot?.() || {};
      const errors = window.LotoRuntimeHealth?.getErrors?.() || [];
      target.innerHTML = `
        <div><strong>Versión:</strong> ${esc(paths.version || 'n/d')}</div>
        <div><strong>SQLite:</strong> ${esc(paths.database || 'n/d')}</div>
        <div><strong>Respaldos:</strong> ${esc(paths.backups || 'n/d')}</div>
        <div><strong>Internet:</strong> ${navigator.onLine ? '✅ en línea' : '⚠️ offline'}</div>
        <div><strong>Supabase:</strong> ${window.cloudSupabase ? 'cliente disponible' : 'no disponible'}</div>
        <div><strong>Cola pendiente:</strong> ${Array.isArray(pending) ? pending.length : 0}${Array.isArray(pending) && pending.length >= 50 ? '+' : ''}</div>
        <div><strong>Módulo:</strong> ${esc(runtime.module || '-')}</div>
        <div><strong>Errores recientes:</strong> ${errors.length}</div>`;
    } catch (error) {
      target.textContent = 'Error leyendo diagnóstico: ' + (error?.message || error);
    }
  };

  window.crearRespaldoConfiguracion = async () => {
    try {
      await window.LotoDesktopStorage?.createBackup?.();
      showMessage('Respaldo local solicitado correctamente.');
      await window.refrescarDiagnosticoConfiguracion();
    } catch (error) {
      showMessage('No se pudo crear respaldo: ' + (error?.message || error), false);
    }
  };

  window.refrescarConfiguracionLoto = async () => {
    await loadPrinters();
    loadSavedSettings();
    await window.refrescarDiagnosticoConfiguracion();
  };

  window.cargarConfiguracion = window.refrescarConfiguracionLoto;

  console.log('✅ Configuración V1: módulo nativo de impresoras, escáner y diagnóstico');
})();