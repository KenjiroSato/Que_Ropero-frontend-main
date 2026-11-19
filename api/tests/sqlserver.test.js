const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile, execFileSync } = require('node:child_process');
const { promisify } = require('node:util');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const enabled = process.env.SQL_TEST_SERVER;

test(
  'SQL Server: transaction rollback, retries, ownership, repeated returns and concurrent stock',
  { skip: !enabled },
  async () => {
    const database = `QueRoperoVerify_${randomUUID().replaceAll('-', '')}`;
    const args = ['-S', enabled, '-E', '-C', '-b', '-l', '10', '-W', '-h', '-1'];
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'queropero-sql-test-'));
    const queryFile = (sql) => {
      const file = path.join(temporary, `${randomUUID()}.sql`);
      fs.writeFileSync(file, sql, 'utf8');
      return file;
    };
    const query = (sql, db = database) =>
      execFileSync('sqlcmd', [...args, '-d', db, '-i', queryFile(sql)], { encoding: 'utf8' });
    let created = false;
    try {
      query(`CREATE DATABASE [${database}];`, 'master');
      created = true;
      for (let pass = 0; pass < 2; pass++) {
        for (const file of [
          '001_schema.sql',
          '002_rental_procedures.sql',
          '003_app_permissions.sql',
        ]) {
          execFileSync('sqlcmd', [
            ...args,
            '-d',
            database,
            '-i',
            path.join(__dirname, '../../database', file),
          ]);
        }
      }
      query(`CREATE USER app_test WITHOUT LOGIN; ALTER ROLE que_ropero_runtime ADD MEMBER app_test;
      INSERT INTO dbo.Usuarios(NombreCompleto,Correo,Contrasena) VALUES('Test','test@example.com','hash');
      INSERT INTO dbo.Lavadoras(Codigo,Nombre,Modelo,Categoria,CapacidadKg,PrecioHora,Cantidad,Disponible)
      VALUES('T1','Test 1','Model','Front',12,10000,1,1),('T2','Test 2','Model','Front',12,12000,0,0);`);
      const rent = (key, items) =>
        `EXECUTE AS USER='app_test'; EXEC dbo.CrearReservaSegura 1,'${key}',N'Calle 12 #34-56',N'${JSON.stringify(items)}'; REVERT;`;
      assert.throws(() =>
        query("EXECUTE AS USER='app_test'; UPDATE dbo.Lavadoras SET Cantidad=99; REVERT;"),
      );
      assert.throws(() =>
        query("EXECUTE AS USER='app_test'; CREATE TABLE dbo.NotAllowed(Id int); REVERT;"),
      );
      const items = [{ idLavadora: 1, horasAlquiler: 4 }];
      assert.throws(() =>
        query(rent(randomUUID(), [...items, { idLavadora: 2, horasAlquiler: 4 }])),
      );
      assert.equal(query('SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Reservas').trim(), '0');
      assert.equal(
        query('SET NOCOUNT ON; SELECT Cantidad FROM dbo.Lavadoras WHERE IdLavadora=1').trim(),
        '1',
      );
      const key = randomUUID();
      const original = query(rent(key, items));
      assert.equal(query(rent(key, items)), original);
      assert.throws(() => query(rent(key, [{ idLavadora: 1, horasAlquiler: 5 }])));
      assert.equal(query('SET NOCOUNT ON; SELECT Total FROM dbo.Reservas').trim(), '40000.00');
      assert.equal(query('SET NOCOUNT ON; SELECT EstadoPago FROM dbo.Pagos').trim(), 'Pendiente');
      const id = Number(query('SET NOCOUNT ON; SELECT IdReserva FROM dbo.Reservas').trim());
      assert.throws(() => query(`EXEC dbo.SolicitarRecoleccionSegura ${id},999;`));
      query(`EXEC dbo.SolicitarRecoleccionSegura ${id},1;`);
      assert.equal(
        query('SET NOCOUNT ON; SELECT Cantidad FROM dbo.Lavadoras WHERE IdLavadora=1').trim(),
        '0',
      );
      query(`EXEC dbo.FinalizarReservaSegura ${id}; EXEC dbo.FinalizarReservaSegura ${id};`);
      assert.equal(
        query('SET NOCOUNT ON; SELECT Cantidad FROM dbo.Lavadoras WHERE IdLavadora=1').trim(),
        '1',
      );
      const results = await Promise.allSettled(
        [randomUUID(), randomUUID()].map((k) =>
          promisify(execFile)('sqlcmd', [...args, '-d', database, '-i', queryFile(rent(k, items))]),
        ),
      );
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(
        query('SET NOCOUNT ON; SELECT Cantidad FROM dbo.Lavadoras WHERE IdLavadora=1').trim(),
        '0',
      );
      assert.equal(query('SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Reservas').trim(), '2');
    } finally {
      // Only the isolated database created by this invocation may be dropped.
      if (created && /^QueRoperoVerify_[a-f0-9]{32}$/.test(database)) {
        query(
          `ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}];`,
          'master',
        );
      }
      for (const file of fs.readdirSync(temporary)) fs.unlinkSync(path.join(temporary, file));
      fs.rmdirSync(temporary);
    }
  },
);
