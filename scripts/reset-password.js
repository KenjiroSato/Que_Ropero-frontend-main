require('dotenv').config();
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const { connectDatabase } = require('../api/database');

(async () => {
  const email = process.env.RESET_EMAIL?.trim().toLowerCase();
  const password = process.env.RESET_PASSWORD;
  if (!email || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Configura RESET_EMAIL y RESET_PASSWORD (12 caracteres mínimo, 72 bytes máximo).');
  }
  const hash = await bcrypt.hash(password, 12);
  const pool = await connectDatabase();
  try {
    await pool.request().input('email', sql.NVarChar(100), email).input('hash', sql.NVarChar(255), hash).query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;
      DECLARE @id int;
      SELECT @id=IdUsuario FROM dbo.Usuarios WITH(UPDLOCK,HOLDLOCK) WHERE Correo=@email;
      IF @id IS NULL THROW 50001,'Correo no encontrado.',1;
      UPDATE dbo.Usuarios SET Contrasena=@hash WHERE IdUsuario=@id;
      DELETE FROM dbo.Sesiones WHERE IdUsuario=@id;
      COMMIT;`);
    console.info('Contraseña actualizada y sesiones revocadas. Retira RESET_PASSWORD del entorno.');
  } finally {
    await pool.close();
  }
})().catch(error => {
  console.error('No se pudo restablecer la contraseña:', error.message);
  process.exitCode = 1;
});
