SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.Usuarios','U') IS NULL
CREATE TABLE dbo.Usuarios(
 IdUsuario int IDENTITY PRIMARY KEY, NombreCompleto nvarchar(150) NOT NULL, Correo nvarchar(100) NOT NULL,
 Contrasena nvarchar(255) NOT NULL, Celular nvarchar(30) NOT NULL DEFAULT '', Direccion nvarchar(200) NOT NULL DEFAULT '',
 Documento nvarchar(30) NOT NULL DEFAULT '', TipoUsuario nvarchar(50) NOT NULL DEFAULT 'Cliente',
 FechaRegistro datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), Activo bit NOT NULL DEFAULT 1
);
IF OBJECT_ID('dbo.Lavadoras','U') IS NULL
CREATE TABLE dbo.Lavadoras(
 IdLavadora int IDENTITY PRIMARY KEY,Codigo nvarchar(30) NOT NULL UNIQUE,Nombre nvarchar(120) NOT NULL,
 Modelo nvarchar(100) NOT NULL,Categoria nvarchar(60) NOT NULL,CapacidadKg int NOT NULL,
 PrecioHora decimal(12,2) NOT NULL,Cantidad int NOT NULL DEFAULT 0,Disponible bit NOT NULL DEFAULT 0,
 Estado nvarchar(40) NOT NULL DEFAULT 'Disponible',Proveedor nvarchar(100),Caracteristicas nvarchar(250),
 BarrioUbicacion nvarchar(100),Imagen nvarchar(255)
);
IF OBJECT_ID('dbo.Reservas','U') IS NULL
CREATE TABLE dbo.Reservas(
 IdReserva int IDENTITY PRIMARY KEY,IdUsuario int NOT NULL REFERENCES dbo.Usuarios(IdUsuario),
 IdLavadora int NOT NULL REFERENCES dbo.Lavadoras(IdLavadora),HorasAlquiler int NOT NULL,DireccionEntrega nvarchar(200) NOT NULL,
 FechaInicio datetime2 NOT NULL,FechaFin datetime2 NOT NULL,Total decimal(14,2) NOT NULL,Estado nvarchar(50) NOT NULL DEFAULT 'Activa'
);
IF OBJECT_ID('dbo.Pagos','U') IS NULL
CREATE TABLE dbo.Pagos(
 IdPago int IDENTITY PRIMARY KEY,IdReserva int NOT NULL REFERENCES dbo.Reservas(IdReserva),Monto decimal(14,2) NOT NULL,
 Metodo nvarchar(50) NOT NULL,EstadoPago nvarchar(50) NOT NULL DEFAULT 'Pendiente',Fecha datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
IF EXISTS(SELECT LOWER(LTRIM(RTRIM(Correo))) FROM dbo.Usuarios GROUP BY LOWER(LTRIM(RTRIM(Correo))) HAVING COUNT(*)>1)
 THROW 50002,'Hay correos duplicados. Resolverlos antes de migrar.',1;
IF EXISTS(SELECT IdReserva FROM dbo.Pagos GROUP BY IdReserva HAVING COUNT(*)>1)
 THROW 50002,'Hay pagos duplicados por reserva. Revisarlos antes de migrar.',1;
UPDATE dbo.Usuarios SET Correo=LOWER(LTRIM(RTRIM(Correo))) WHERE Correo COLLATE Latin1_General_100_BIN2 <> LOWER(LTRIM(RTRIM(Correo))) COLLATE Latin1_General_100_BIN2;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Usuarios_Correo' AND object_id=OBJECT_ID('dbo.Usuarios'))
 CREATE UNIQUE INDEX UX_Usuarios_Correo ON dbo.Usuarios(Correo);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Pagos_Reserva' AND object_id=OBJECT_ID('dbo.Pagos'))
 CREATE UNIQUE INDEX UX_Pagos_Reserva ON dbo.Pagos(IdReserva);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Reservas_Usuario' AND object_id=OBJECT_ID('dbo.Reservas'))
 CREATE INDEX IX_Reservas_Usuario ON dbo.Reservas(IdUsuario,IdReserva DESC);
IF OBJECT_ID('dbo.Sesiones','U') IS NULL
 CREATE TABLE dbo.Sesiones(TokenHash char(64) PRIMARY KEY,IdUsuario int NOT NULL REFERENCES dbo.Usuarios(IdUsuario),ExpiraEn datetime2 NOT NULL);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_Sesiones_Expira' AND object_id=OBJECT_ID('dbo.Sesiones'))
 CREATE INDEX IX_Sesiones_Expira ON dbo.Sesiones(ExpiraEn);
IF OBJECT_ID('dbo.SolicitudesReserva','U') IS NULL
 CREATE TABLE dbo.SolicitudesReserva(IdUsuario int NOT NULL REFERENCES dbo.Usuarios(IdUsuario),Clave uniqueidentifier NOT NULL,
 Solicitud nvarchar(max) NOT NULL,Resultado nvarchar(max),CreadaEn datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),PRIMARY KEY(IdUsuario,Clave));
COMMIT;
GO
