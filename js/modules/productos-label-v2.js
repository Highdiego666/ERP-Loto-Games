// ============================================
// LOTO GAMES POS - ETIQUETAS DE PRODUCTO V2
// ============================================

(function () {
  'use strict';

  window.imprimirEtiqueta = async function (id) {
    const producto = await window.DB.getProductoById(id);
    if (!producto) return alert('Producto no encontrado.');
    const codigo = producto.sku || producto.codigo_barras || String(producto.id);
    const win = window.open('', '_blank', 'width=320,height=260,menubar=no,toolbar=no,location=no,status=no');
    if (!win) return alert('Permite ventanas emergentes para imprimir etiquetas.');

    const nombreSeguro = String(producto.nombre || '').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
    const codigoSeguro = String(codigo).replace(/["\\]/g, '');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta ${codigoSeguro}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>*{box-sizing:border-box}body{margin:0;width:40mm;height:30mm;display:flex;align-items:center;justify-content:center;font-family:Arial;background:#fff}.e{width:40mm;height:30mm;padding:1mm;text-align:center;display:flex;flex-direction:column;justify-content:center}.n{font-size:10pt;font-weight:700;line-height:1.1}.s{font-size:7pt;margin:.8mm 0}svg{max-width:36mm}@page{size:40mm 30mm;margin:0}@media print{body{margin:0}}</style>
      </head><body><div class="e"><div class="n">${nombreSeguro}</div><div class="s">SKU: ${codigoSeguro}</div><svg id="barcode"></svg></div>
      <script>JsBarcode('#barcode','${codigoSeguro}',{format:'CODE128',width:1.1,height:38,displayValue:true,fontSize:9,margin:0});setTimeout(()=>window.print(),400);<\/script></body></html>`);
    win.document.close();
  };
})();
