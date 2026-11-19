const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const path = require('node:path');
const { errorHandler, httpError } = require('./errors');
const { createAuth } = require('./auth');
const { userRoutes } = require('./users');
const { rentalRoutes } = require('./rentals');

function createApp({ repository, origin, production = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', production ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: production ? [] : null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('origin') !== origin || req.get('x-requested-with') !== 'QueRopero')
    ) {
      throw httpError(403, 'Origen de solicitud no permitido.');
    }
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { mensaje: 'Demasiadas solicitudes. Espera un minuto.' },
    }),
  );
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/ready', async (req, res) => {
    await repository.health();
    res.json({ status: 'ready' });
  });
  const auth = createAuth(repository, production);
  app.use('/api/usuarios', userRoutes(repository, auth));
  app.use('/api', rentalRoutes(repository, auth));
  app.use('/api', (req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));
  const browser = path.resolve(__dirname, '../dist/Que_Ropero/browser');
  app.use(express.static(browser, { index: false, maxAge: '1h' }));
  app.get('/{*path}', (req, res, next) => {
    if (path.extname(req.path)) return res.sendStatus(404);
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(browser, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
