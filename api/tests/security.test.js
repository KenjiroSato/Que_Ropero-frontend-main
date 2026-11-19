const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');
const { validate, reserva, registro } = require('../validation');

async function withServer(run) {
  const app = createApp({
    repository: new Proxy(
      {},
      {
        get() {
          return () => {
            throw new Error('Unexpected database access');
          };
        },
      },
    ),
    origin: 'http://localhost:4200',
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('anonymous callers cannot list, modify, deactivate users or read rentals', async () => {
  await withServer(async (base) => {
    for (const [method, path] of [
      ['GET', '/usuarios'],
      ['PUT', '/usuarios/1'],
      ['DELETE', '/usuarios/1'],
      ['GET', '/reservas'],
      ['GET', '/reservas/usuario/1'],
      ['POST', '/reservas'],
      ['PUT', '/reservas/1/finalizar'],
    ]) {
      const response = await fetch(`${base}/api${path}`, {
        method,
        headers: { Origin: 'http://localhost:4200', 'X-Requested-With': 'QueRopero' },
      });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  });
});
test('cross-origin writes are rejected before querying the database', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/usuarios/login`, {
      method: 'POST',
      headers: { Origin: 'https://untrusted.example', 'X-Requested-With': 'QueRopero' },
    });
    assert.equal(response.status, 403);
  });
});
test('health is public and browser security headers are present', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});
test('rentals reject supplied prices, identities, invalid hours and duplicate equipment', () => {
  const valid = {
    direccionEntrega: 'Calle 12 #34-56',
    metodoPago: 'Efectivo',
    items: [{ idLavadora: 1, horasAlquiler: 4 }],
  };
  assert.deepEqual(validate(reserva, valid), valid);
  for (const input of [
    { ...valid, idUsuario: 1 },
    { ...valid, metodoPago: 'Nequi' },
    { ...valid, items: [{ ...valid.items[0], precio: 1 }] },
    ...[-1, 0, 1.5, 73].map((horasAlquiler) => ({
      ...valid,
      items: [{ idLavadora: 1, horasAlquiler }],
    })),
    { ...valid, items: [valid.items[0], valid.items[0]] },
  ]) {
    assert.throws(
      () => validate(reserva, input),
      (error) => error.status === 400,
    );
  }
});
test('registration cannot set a role or use the old shared password', () => {
  const valid = {
    nombre: 'Cliente',
    correo: 'TEST@EXAMPLE.COM',
    celular: '3001234567',
    direccion: 'Calle 12 #34-56',
    password: 'Una-clave-larga-2026',
  };
  assert.equal(validate(registro, valid).correo, 'test@example.com');
  assert.throws(() => validate(registro, { ...valid, tipoUsuario: 'Administrador' }));
  assert.throws(() => validate(registro, { ...valid, password: '1234' }));
});
