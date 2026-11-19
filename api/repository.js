const sql = require('mssql');
const { httpError } = require('./errors');
const userColumns = `IdUsuario AS id, NombreCompleto AS nombre, Correo AS correo, ISNULL(Celular,'') AS celular,
  ISNULL(Direccion,'') AS direccion, ISNULL(Documento,'') AS documento, TipoUsuario AS tipoUsuario,
  FechaRegistro AS fechaRegistro, Activo AS activo`;
const publicUser = ({ activo, passwordHash, ...user }) => user;

function createRepository(pool) {
  const byId = (id) => pool.request().input('id', sql.Int, id);
  return {
    async health() {
      await pool.request().query('SELECT 1 AS ok');
    },
    async findLogin(email) {
      return (
        await pool
          .request()
          .input('email', sql.NVarChar(100), email)
          .query(
            `SELECT ${userColumns}, Contrasena AS passwordHash FROM dbo.Usuarios WHERE Correo=@email AND Activo=1`,
          )
      ).recordset[0];
    },
    async createUser(input, hash, role) {
      const request = pool
        .request()
        .input('nombre', sql.NVarChar(150), input.nombre)
        .input('correo', sql.NVarChar(100), input.correo)
        .input('password', sql.NVarChar(255), hash)
        .input('celular', sql.NVarChar(30), input.celular)
        .input('direccion', sql.NVarChar(200), input.direccion)
        .input('documento', sql.NVarChar(30), input.documento)
        .input('rol', sql.NVarChar(50), role);
      const result =
        await request.query(`INSERT INTO dbo.Usuarios(NombreCompleto,Correo,Contrasena,Celular,Direccion,Documento,TipoUsuario,Activo,FechaRegistro)
        VALUES(@nombre,@correo,@password,@celular,@direccion,@documento,@rol,1,SYSUTCDATETIME());
        SELECT ${userColumns} FROM dbo.Usuarios WHERE IdUsuario=SCOPE_IDENTITY();`);
      return publicUser(result.recordset[0]);
    },
    async listUsers() {
      return (
        await pool
          .request()
          .query(
            `SELECT TOP (200) ${userColumns} FROM dbo.Usuarios WHERE Activo=1 ORDER BY IdUsuario DESC`,
          )
      ).recordset.map(publicUser);
    },
    async updateUser(id, input) {
      const result = await byId(id)
        .input('nombre', sql.NVarChar(150), input.nombre)
        .input('correo', sql.NVarChar(100), input.correo)
        .input('celular', sql.NVarChar(30), input.celular)
        .input('direccion', sql.NVarChar(200), input.direccion)
        .input('rol', sql.NVarChar(50), input.tipoUsuario)
        .query(`UPDATE dbo.Usuarios SET NombreCompleto=@nombre,Correo=@correo,Celular=@celular,Direccion=@direccion,TipoUsuario=@rol WHERE IdUsuario=@id AND Activo=1;
        SELECT ${userColumns} FROM dbo.Usuarios WHERE IdUsuario=@id AND Activo=1;`);
      if (!result.recordset[0]) throw httpError(404, 'Usuario no encontrado.');
      return publicUser(result.recordset[0]);
    },
    async disableUser(id) {
      const result = await byId(id).query(
        'UPDATE dbo.Usuarios SET Activo=0 WHERE IdUsuario=@id AND Activo=1;',
      );
      if (!result.rowsAffected[0]) throw httpError(404, 'Usuario no encontrado.');
    },
    async createSession(userId, tokenHash, expires) {
      await pool
        .request()
        .input('usuario', sql.Int, userId)
        .input('hash', sql.Char(64), tokenHash)
        .input('expires', sql.DateTime2, expires)
        .query(`DELETE FROM dbo.Sesiones WHERE ExpiraEn < SYSUTCDATETIME();
          INSERT INTO dbo.Sesiones(TokenHash,IdUsuario,ExpiraEn) VALUES(@hash,@usuario,@expires);`);
    },
    async deleteSession(tokenHash) {
      await pool
        .request()
        .input('hash', sql.Char(64), tokenHash)
        .query('DELETE FROM dbo.Sesiones WHERE TokenHash=@hash');
    },
    async sessionUser(tokenHash) {
      return (
        await pool.request().input('hash', sql.Char(64), tokenHash).query(`SELECT ${userColumns}
        FROM dbo.Usuarios WHERE Activo=1 AND IdUsuario=(SELECT IdUsuario FROM dbo.Sesiones WHERE TokenHash=@hash AND ExpiraEn>SYSUTCDATETIME())`)
      ).recordset[0];
    },
    async catalog() {
      return (
        await pool.request()
          .query(`SELECT TOP (200) IdLavadora AS idLavadora,Codigo AS codigo,Nombre AS nombre,Modelo AS modelo,
        Categoria AS categoria,CapacidadKg AS capacidadKg,PrecioHora AS precio,Cantidad AS cantidad,
        CAST(CASE WHEN Disponible=1 AND Cantidad>0 THEN 1 ELSE 0 END AS bit) AS disponible,Estado AS estado,
        ISNULL(Caracteristicas,'') AS caracteristicas,ISNULL(BarrioUbicacion,'Itagüí') AS barrioUbicacion,ISNULL(Imagen,'') AS imagen
        FROM dbo.Lavadoras ORDER BY IdLavadora`)
      ).recordset;
    },
    async createRental(userId, key, input) {
      const result = await pool
        .request()
        .input('IdUsuario', sql.Int, userId)
        .input('Clave', sql.UniqueIdentifier, key)
        .input('Direccion', sql.NVarChar(200), input.direccionEntrega)
        .input('Items', sql.NVarChar(sql.MAX), JSON.stringify(input.items))
        .execute('dbo.CrearReservaSegura');
      return JSON.parse(result.recordset[0].Resultado);
    },
    async listRentals(userId, operator) {
      return (
        await pool.request().input('usuario', sql.Int, userId).input('operador', sql.Bit, operator)
          .query(`
        SELECT TOP (200) r.IdReserva AS idReserva,r.IdLavadora AS idLavadora,r.HorasAlquiler AS horasAlquiler,
        r.DireccionEntrega AS direccionEntrega,r.FechaInicio AS fechaInicio,r.FechaFin AS fechaFin,r.Total AS total,r.Estado AS estado,
        l.Nombre AS nombreLavadora,l.Modelo AS modelo,ISNULL(l.Imagen,'') AS imagen,
        ISNULL(p.Metodo,'Efectivo') AS metodoPago,ISNULL(p.EstadoPago,'Pendiente') AS estadoPago,u.NombreCompleto AS nombreCliente
        FROM dbo.Reservas r JOIN dbo.Lavadoras l ON l.IdLavadora=r.IdLavadora JOIN dbo.Usuarios u ON u.IdUsuario=r.IdUsuario
        LEFT JOIN dbo.Pagos p ON p.IdReserva=r.IdReserva WHERE r.IdUsuario=@usuario OR @operador=1 ORDER BY r.IdReserva DESC`)
      ).recordset;
    },
    async collectRental(id, userId) {
      await pool
        .request()
        .input('IdReserva', sql.Int, id)
        .input('IdUsuario', sql.Int, userId)
        .execute('dbo.SolicitarRecoleccionSegura');
    },
    async finishRental(id) {
      await pool.request().input('IdReserva', sql.Int, id).execute('dbo.FinalizarReservaSegura');
    },
    async confirmCash(id) {
      const result = await byId(id).query(
        "UPDATE dbo.Pagos SET EstadoPago='Aprobado' WHERE IdReserva=@id AND Metodo='Efectivo'",
      );
      if (!result.rowsAffected[0]) throw httpError(404, 'Pago en efectivo no encontrado.');
    },
  };
}
module.exports = { createRepository, publicUser };
