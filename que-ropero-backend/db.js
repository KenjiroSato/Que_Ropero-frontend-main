require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER || 'queropero_admin',
    password: process.env.DB_PASSWORD || 'QueRopero2026*',
    server: '127.0.0.1', // Conexión directa local
    port: 1433,          // Puerto fijo TCP/IP que activamos en el Paso 1
    database: process.env.DB_NAME || 'QueRoperoDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log(' Conectado exitosamente a SQL Server -> Base de datos:', dbConfig.database);
        return pool;
    })
    .catch(err => {
        console.error(' Error conectando a SQL Server:', err.message);
        throw err;
    });

module.exports = { sql, poolPromise };