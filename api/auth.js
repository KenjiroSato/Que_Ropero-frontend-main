const { randomBytes, createHash } = require('node:crypto');
const { httpError } = require('./errors');
const { publicUser } = require('./repository');
const hashToken = token => createHash('sha256').update(token).digest('hex');
function createAuth(repository, production) {
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/' };
  async function issueSession(userId, req, res) {
    const old = req.cookies.qr_session;
    if (old) await repository.deleteSession(hashToken(old));
    const token = randomBytes(32).toString('hex');
    await repository.createSession(userId, hashToken(token), new Date(Date.now() + 8 * 3600_000));
    res.cookie('qr_session', token, { ...cookieOptions, maxAge: 8 * 3600_000 });
  }
  async function requireUser(req, res, next) {
    const token = req.cookies.qr_session;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw httpError(401, 'Inicia sesión para continuar.');
    const user = await repository.sessionUser(hashToken(token));
    if (!user) throw httpError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
    req.user = publicUser(user); next();
  }
  function roles(...allowed) {
    return (req, res, next) => {
      if (!allowed.includes(req.user.tipoUsuario)) throw httpError(403, 'No tienes permiso para esta operación.');
      next();
    };
  }
  async function logout(req, res) {
    const token = req.cookies.qr_session;
    if (token) await repository.deleteSession(hashToken(token));
    res.clearCookie('qr_session', cookieOptions); res.json({ mensaje: 'Sesión cerrada.' });
  }
  return { issueSession, requireUser, roles, logout };
}
module.exports = { createAuth };
