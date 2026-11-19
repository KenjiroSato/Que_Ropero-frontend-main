const sql = require('mssql');

function databaseConfig(env = process.env) {
  if (!env.DB_SERVER || !env.DB_NAME)
    throw new Error('Configura DB_SERVER y DB_NAME. Consulta .env.example.');
  const config = {
    server: env.DB_SERVER,
    database: env.DB_NAME,
    port: Number(env.DB_PORT || 1433),
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  };
  if (env.DB_AUTH === 'managed-identity') {
    config.authentication = { type: 'azure-active-directory-msi-app-service', options: {} };
  } else {
    if (!env.DB_USER || !env.DB_PASSWORD)
      throw new Error('Configura DB_USER y DB_PASSWORD o DB_AUTH=managed-identity.');
    config.user = env.DB_USER;
    config.password = env.DB_PASSWORD;
  }
  // A self-signed certificate is only accepted for an explicitly selected local development instance.
  if (
    env.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1'].includes(env.DB_SERVER) &&
    env.DB_TRUST_LOCAL_CERT === 'true'
  ) {
    config.options.trustServerCertificate = true;
  }
  return config;
}
async function connectDatabase(env = process.env) {
  const pool = new sql.ConnectionPool(databaseConfig(env));
  pool.on('error', (error) =>
    console.error(JSON.stringify({ event: 'database_pool_error', code: error.code })),
  );
  await pool.connect();
  return pool;
}
module.exports = { connectDatabase, databaseConfig };
