const { randomUUID } = require('node:crypto');

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if ([2601, 2627].includes(error.number))
    error = httpError(409, 'Ya existe un registro con estos datos.');
  if (error.number === 50001)
    error = httpError(
      409,
      'La reserva no está disponible en el estado actual. Actualiza e inténtalo nuevamente.',
    );
  const reference = randomUUID();
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) {
    console.error(
      JSON.stringify({
        event: 'request_failed',
        reference,
        method: req.method,
        path: req.path,
        code: error.code,
        message: error.message,
      }),
    );
  }
  res.status(status).json({
    mensaje:
      status === 500 ? 'No pudimos completar la operación. Inténtalo nuevamente.' : error.message,
    referencia: reference,
    ...(error.fields ? { campos: error.fields } : {}),
  });
}

module.exports = { httpError, errorHandler };
