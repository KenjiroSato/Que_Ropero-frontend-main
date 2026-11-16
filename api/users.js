const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const schemas = require('./validation');
const { httpError } = require('./errors');
const { publicUser } = require('./repository');
const dummyHash = bcrypt.hashSync('not-a-real-account-secret', 12);
function userRoutes(repository, auth) {
  const router = Router();
  const loginLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { mensaje: 'Demasiados intentos. Espera 15 minutos.' } });
  async function insertUser(input, role = 'Cliente') {
    return repository.createUser(input, await bcrypt.hash(input.password, 12), role);
  }
  router.post('/login', loginLimit, async (req, res) => {
    const input = schemas.validate(schemas.login, req.body);
    const email = input.correo.toLowerCase() === 'admin' ? 'admin@queropero.com' : input.correo.toLowerCase();
    const user = await repository.findLogin(email);
    const hash = user && /^\$2[aby]\$/.test(user.passwordHash || '') ? user.passwordHash : dummyHash;
    const valid = await bcrypt.compare(input.password, hash);
    if (!user || hash === dummyHash || !valid) throw httpError(401, 'Correo o contraseña incorrectos.');
    await auth.issueSession(user.id, req, res); res.json({ usuario: publicUser(user) });
  });
  router.post('/registro', loginLimit, async (req, res) => {
    const user = await insertUser(schemas.validate(schemas.registro, req.body));
    await auth.issueSession(user.id, req, res); res.status(201).json({ usuario: user });
  });
  router.post('/logout', auth.logout);
  router.get('/sesion', auth.requireUser, (req, res) => res.json({ usuario: req.user }));
  router.use(auth.requireUser, auth.roles('Administrador'));
  router.get('/', async (req, res) => res.json(await repository.listUsers()));
  router.post('/', async (req, res) => {
    const input = schemas.validate(schemas.crearUsuario, req.body);
    res.status(201).json({ usuario: await insertUser(input, input.tipoUsuario) });
  });
  router.put('/:id', async (req, res) => {
    const id = schemas.validate(schemas.id, req.params.id), input = schemas.validate(schemas.editarUsuario, req.body);
    if (id === req.user.id && input.tipoUsuario !== 'Administrador') throw httpError(409, 'Otro administrador debe cambiar tu rol.');
    res.json({ usuario: await repository.updateUser(id, input) });
  });
  router.delete('/:id', async (req, res) => {
    const id = schemas.validate(schemas.id, req.params.id);
    if (id === req.user.id) throw httpError(409, 'No puedes desactivar tu propia cuenta.');
    await repository.disableUser(id); res.json({ mensaje: 'Usuario desactivado.' });
  });
  return router;
}
module.exports = { userRoutes };
