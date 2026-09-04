'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { LocalStore } = require('../electron/local-db.cjs');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'loto-games-test-'));
  const dataDir = path.join(root, 'data');
  const backupDir = path.join(root, 'backups');
  await fsp.mkdir(dataDir, { recursive: true });

  const store = new LocalStore({
    dbPath: path.join(dataDir, 'loto-games.sqlite3'),
    backupDir
  });

  try {
    const product = store.insert('productos', {
      nombre: 'Control de prueba',
      sku: 'TEST-001',
      stock: 10,
      precio: 500,
      created_at: new Date().toISOString()
    });

    assert.ok(product.id, 'El producto debe recibir ID local.');
    assert.equal(store.get('productos', product.id).stock, 10);

    const saleId = store.newId();
    store.batch([
      {
        type: 'insert',
        entity: 'ventas',
        payload: {
          id: saleId,
          items: [{ id: product.id, nombre: product.nombre, cantidad: 2, precio: 500 }],
          subtotal: 1000,
          total: 1000,
          metodo_pago: 'Efectivo',
          fecha: new Date().toISOString()
        }
      },
      {
        type: 'update',
        entity: 'productos',
        id: product.id,
        patch: { stock: 8 }
      }
    ]);

    assert.equal(store.get('productos', product.id).stock, 8, 'El stock debe quedar actualizado dentro de la transacción.');
    assert.equal(store.get('ventas', saleId).total, 1000, 'La venta debe quedar persistida.');
    assert.equal(store.status().pending, 2, 'La cola debe colapsar el alta+actualización del producto y conservar la venta.');

    let rollbackWorked = false;
    try {
      store.batch([
        { type: 'update', entity: 'productos', id: product.id, patch: { stock: 7 } },
        { type: 'update', entity: 'productos', id: 'no-existe', patch: { stock: 0 } }
      ]);
    } catch (_) {
      rollbackWorked = true;
    }
    assert.equal(rollbackWorked, true, 'Una transacción inválida debe fallar.');
    assert.equal(store.get('productos', product.id).stock, 8, 'El rollback debe evitar una actualización parcial.');

    const backup = await store.createBackup();
    assert.equal(backup.ok, true);
    assert.equal(fs.existsSync(backup.path), true, 'Debe existir el archivo de respaldo SQLite.');

    console.log('SQLite local-first OK: CRUD, cola, transacción, rollback y respaldo.');
  } finally {
    store.close();
    await fsp.rm(root, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
