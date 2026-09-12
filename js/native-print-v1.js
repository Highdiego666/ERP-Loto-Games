// ============================================
// LOTO GAMES - IMPRESIÓN NATIVA V1
// Usa Electron para listar/seleccionar impresoras y evita popups del navegador.
// ============================================

(function () {
  'use strict';

  const desktop = window.lotoDesktop;
  const fallbackPrint = window.LotoPilotPrint?.printInFrame?.bind(window.LotoPilotPrint);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function printerKind(widthMm) {
    return Number(widthMm) === 40 ? 'label' : 'ticket';
  }

  function getSetting(key, fallback = '') {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  }

  async function nativePrint(html, widthMm = 80, options = {}) {
    if (!desktop?.isDesktop || !desktop.printer?.printHtml) {
      if (!fallbackPrint) throw new Error('No hay motor de impresión disponible.');
      return fallbackPrint(html, widthMm);
    }

    const kind = options.kind || printerKind(widthMm);
    const deviceName = options.deviceName ?? getSetting(`loto_${kind}_printer`, '');
    const silentConfigured = getSetting(`loto_${kind}_silent`, '0') === '1';
    const silent = options.silent ?? (silentConfigured && !!deviceName);
    const copies = Math.max(1, Math.min(Number(options.copies ?? getSetting(`loto_${kind}_copies`, '1')) || 1, 20));

    const request = {
      html,
      deviceName,
      silent,
      copies
    };

    if (kind === 'label') {
      request.pageSize = {
        width: Math.round(Number(options.widthMm || 40) * 1000),
        height: Math.round(Number(options.heightMm || 30) * 1000)
      };
    }

    const result = await desktop.printer.printHtml(request);
    if (!result?.success) {
      throw new Error(result?.failureReason || 'La impresora rechazó el trabajo.');
    }
    return true;
  }

  async function printLabel(id) {
    const producto = await window.DB.getProductoById(id);
    if (!producto) throw new Error('Producto no encontrado.');
    const codigo = String(producto.codigo_barras || producto.sku || producto.id || '').trim();
    if (!codigo) throw new Error('El producto no tiene código para imprimir.');
    if (typeof window.JsBarcode !== 'function') throw new Error('JsBarcode no está disponible.');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    window.JsBarcode(svg, codigo, {
      format: 'CODE128', width: 1.2, height: 42, displayValue: true, fontSize: 10, margin: 0
    });
    const barcode = new XMLSerializer().serializeToString(svg);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta Loto Games</title>
      <style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,sans-serif}body{width:40mm;height:30mm;padding:1.5mm;text-align:center;display:flex;flex-direction:column;justify-content:center}.name{font-weight:800;font-size:10px;line-height:1.1;margin-bottom:1mm}svg{width:36mm;max-height:19mm}@page{size:40mm 30mm;margin:0}</style>
      </head><body><div class="name">${esc(producto.nombre || '')}</div>${barcode}</body></html>`;

    return nativePrint(html, 40, { kind: 'label', widthMm: 40, heightMm: 30 });
  }

  if (!window.LotoPilotPrint) window.LotoPilotPrint = {};
  window.LotoPilotPrint.printInFrame = nativePrint;
  window.LotoNativePrint = {
    printHtml: nativePrint,
    async listPrinters() {
      if (!desktop?.printer?.list) return [];
      return desktop.printer.list();
    }
  };

  const ticketHtml = window.LotoPilotPrint.ticketHtml;
  if (typeof ticketHtml === 'function') {
    window.imprimirTicketVenta = async ticket => {
      try {
        const width = Number(getSetting('loto_ticket_width_mm', '80')) === 58 ? 58 : 80;
        await nativePrint(ticketHtml(ticket), width, { kind: 'ticket' });
      } catch (error) {
        console.error('Error imprimiendo ticket:', error);
        alert('❌ No se pudo imprimir el ticket: ' + (error?.message || error));
      }
    };
  }

  window.imprimirEtiqueta = async id => {
    try {
      await printLabel(id);
    } catch (error) {
      console.error('Error imprimiendo etiqueta:', error);
      alert('❌ No se pudo imprimir la etiqueta: ' + (error?.message || error));
    }
  };

  console.log('✅ Impresión nativa V1: miniprinter/etiquetas conectadas por IPC');
})();
