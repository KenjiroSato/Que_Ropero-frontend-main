require('dotenv').config();
const { createApp } = require('./app');
const { connectDatabase } = require('./database');
const { createRepository } = require('./repository');
async function start() {
  const { APP_ORIGIN, NODE_ENV, PORT = '3000' } = process.env;
  if (!APP_ORIGIN) throw new Error('Configura APP_ORIGIN. Consulta .env.example.');
  const origin = new URL(APP_ORIGIN);
  if (NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('APP_ORIGIN debe usar HTTPS.');
  const pool = await connectDatabase();
  const app = createApp({ repository: createRepository(pool), origin: origin.origin, production: NODE_ENV === 'production' });
  const server = app.listen(Number(PORT), '0.0.0.0', () => console.info(JSON.stringify({ event: 'server_started', port: Number(PORT) })));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => pool.close().finally(() => process.exit(0))));
  return server;
}
if (require.main === module) start().catch(error => { console.error(JSON.stringify({ event: 'startup_failed', message: error.message })); process.exitCode = 1; });
module.exports = { start };
