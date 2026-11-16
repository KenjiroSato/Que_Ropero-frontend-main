const { z } = require('zod');

const id = z.coerce.number().int().positive().max(2147483647);
const correo = z.string().trim().email().max(100).transform(value => value.toLowerCase());
const password = z.string().min(12).refine(value => Buffer.byteLength(value, 'utf8') <= 72,
  'La contraseña debe ocupar como máximo 72 bytes.');
const perfil = {
  nombre: z.string().trim().min(2).max(120),
  correo,
  celular: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/),
  direccion: z.string().trim().min(8).max(200),
};
const rol = z.enum(['Cliente', 'Administrador', 'Operador Logistico']);
const registro = z.object({
  ...perfil,
  password,
  documento: z.string().trim().max(30).default(''),
}).strict();
const login = z.object({
  correo: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
}).strict();
const editarUsuario = z.object({ ...perfil, tipoUsuario: rol }).strict();
const crearUsuario = registro.extend({ tipoUsuario: rol });
const reserva = z.object({
  direccionEntrega: perfil.direccion,
  metodoPago: z.literal('Efectivo'),
  items: z.array(z.object({
    idLavadora: id,
    horasAlquiler: z.number().int().min(1).max(72),
  }).strict()).min(1).max(20).refine(items =>
    new Set(items.map(item => item.idLavadora)).size === items.length,
  'No repitas una lavadora en la misma solicitud.'),
}).strict();

function validate(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const error = new Error('Revisa los datos enviados.');
    error.status = 400;
    error.fields = parsed.error.issues.map(issue => ({ campo: issue.path.join('.'), mensaje: issue.message }));
    throw error;
  }
  return parsed.data;
}

module.exports = { id, registro, login, editarUsuario, crearUsuario, reserva, validate };
