const { Router } = require('express');
const { z } = require('zod');
const { validate, id, reserva } = require('./validation');
function rentalRoutes(repository, auth) {
  const router = Router();
  router.get('/lavadoras', async (req, res) => res.json(await repository.catalog()));
  router.use(auth.requireUser);
  router.post('/reservas', async (req, res) => {
    const input = validate(reserva, req.body),
      key = validate(z.string().uuid(), req.get('idempotency-key'));
    const reservas = await repository.createRental(req.user.id, key, input);
    res
      .status(201)
      .json({ mensaje: 'Reserva registrada. Pago pendiente contra entrega.', reservas });
  });
  router.get('/reservas', async (req, res) =>
    res.json(
      await repository.listRentals(
        req.user.id,
        ['Administrador', 'Operador Logistico'].includes(req.user.tipoUsuario),
      ),
    ),
  );
  router.put('/reservas/:id/recoleccion', async (req, res) => {
    await repository.collectRental(validate(id, req.params.id), req.user.id);
    res.json({ mensaje: 'Solicitud de recolección registrada.' });
  });
  router.put(
    '/reservas/:id/finalizar',
    auth.roles('Administrador', 'Operador Logistico'),
    async (req, res) => {
      await repository.finishRental(validate(id, req.params.id));
      res.json({ mensaje: 'Recolección confirmada. Equipo disponible.' });
    },
  );
  router.put(
    '/reservas/:id/pago',
    auth.roles('Administrador', 'Operador Logistico'),
    async (req, res) => {
      await repository.confirmCash(validate(id, req.params.id));
      res.json({ mensaje: 'Recepción del efectivo confirmada.' });
    },
  );
  return router;
}
module.exports = { rentalRoutes };
