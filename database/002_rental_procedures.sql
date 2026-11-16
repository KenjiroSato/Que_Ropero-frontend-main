CREATE OR ALTER PROCEDURE dbo.CrearReservaSegura
 @IdUsuario int,@Clave uniqueidentifier,@Direccion nvarchar(200),@Items nvarchar(max)
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 IF ISJSON(@Items)<>1 OR LEFT(LTRIM(@Items),1)<>'[' OR @Clave IS NULL OR LEN(LTRIM(RTRIM(@Direccion))) NOT BETWEEN 8 AND 200
  THROW 50001,'Solicitud invalida.',1;
 DECLARE @Equipos TABLE(Id int NOT NULL PRIMARY KEY,Horas int NOT NULL);
 IF EXISTS(SELECT 1 FROM OPENJSON(@Items) WITH(Id int '$.idLavadora',Horas int '$.horasAlquiler') WHERE Id IS NULL OR Id<1 OR Horas IS NULL OR Horas NOT BETWEEN 1 AND 72)
  THROW 50001,'Equipos u horas invalidos.',1;
 IF EXISTS(SELECT Id FROM OPENJSON(@Items) WITH(Id int '$.idLavadora') GROUP BY Id HAVING COUNT(*)>1)
  THROW 50001,'Equipos duplicados.',1;
 INSERT INTO @Equipos SELECT Id,Horas FROM OPENJSON(@Items) WITH(Id int '$.idLavadora',Horas int '$.horasAlquiler');
 IF (SELECT COUNT(*) FROM @Equipos) NOT BETWEEN 1 AND 20 THROW 50001,'Cantidad de equipos invalida.',1;
 DECLARE @Solicitud nvarchar(max)=(SELECT @Direccion AS direccion,JSON_QUERY(@Items) AS items FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
 DECLARE @Recurso nvarchar(255)=CONCAT('reserva:',@IdUsuario,':',CONVERT(nvarchar(36),@Clave)),@Lock int,@Anterior nvarchar(max),@Resultado nvarchar(max);
 BEGIN TRY
  BEGIN TRANSACTION;
  EXEC @Lock=sys.sp_getapplock @Resource=@Recurso,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
  IF @Lock<0 THROW 50001,'Solicitud ocupada. Reintenta.',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.Usuarios WHERE IdUsuario=@IdUsuario AND Activo=1) THROW 50001,'Usuario no disponible.',1;
  SELECT @Anterior=Solicitud,@Resultado=Resultado FROM dbo.SolicitudesReserva WITH(UPDLOCK,HOLDLOCK) WHERE IdUsuario=@IdUsuario AND Clave=@Clave;
  IF @Anterior IS NOT NULL
  BEGIN
   IF @Anterior COLLATE Latin1_General_100_BIN2 <> @Solicitud COLLATE Latin1_General_100_BIN2 THROW 50001,'Clave utilizada con otra solicitud.',1;
   COMMIT;
   SELECT @Resultado AS Resultado;
   RETURN;
  END;
  INSERT INTO dbo.SolicitudesReserva(IdUsuario,Clave,Solicitud) VALUES(@IdUsuario,@Clave,@Solicitud);
  DECLARE @Id int,@Horas int,@Precio decimal(12,2),@Cantidad int,@Disponible bit,@Reserva int;
  DECLARE @Creadas TABLE(idReserva int,total decimal(14,2));
  DECLARE equipos CURSOR LOCAL FAST_FORWARD FOR SELECT Id,Horas FROM @Equipos ORDER BY Id;
  OPEN equipos;
  FETCH NEXT FROM equipos INTO @Id,@Horas;
  WHILE @@FETCH_STATUS=0
  BEGIN
   SET @Precio=NULL;
   SELECT @Precio=PrecioHora,@Cantidad=Cantidad,@Disponible=Disponible FROM dbo.Lavadoras WITH(UPDLOCK,HOLDLOCK) WHERE IdLavadora=@Id;
   IF @Precio IS NULL OR @Precio<=0 OR @Cantidad<1 OR @Disponible<>1 THROW 50001,'Equipo no disponible.',1;
   INSERT INTO dbo.Reservas(IdUsuario,IdLavadora,HorasAlquiler,DireccionEntrega,FechaInicio,FechaFin,Total,Estado)
    VALUES(@IdUsuario,@Id,@Horas,@Direccion,SYSUTCDATETIME(),DATEADD(hour,@Horas,SYSUTCDATETIME()),@Precio*@Horas,'Activa');
   SET @Reserva=CONVERT(int,SCOPE_IDENTITY());
   INSERT INTO dbo.Pagos(IdReserva,Monto,Metodo,EstadoPago,Fecha) VALUES(@Reserva,@Precio*@Horas,'Efectivo','Pendiente',SYSUTCDATETIME());
   UPDATE dbo.Lavadoras SET Cantidad=Cantidad-1,Disponible=CASE WHEN Cantidad>1 THEN 1 ELSE 0 END,
    Estado=CASE WHEN Cantidad>1 THEN 'Disponible' ELSE 'Alquilada' END WHERE IdLavadora=@Id;
   INSERT INTO @Creadas VALUES(@Reserva,@Precio*@Horas);
   FETCH NEXT FROM equipos INTO @Id,@Horas;
  END;
  CLOSE equipos;
  DEALLOCATE equipos;
  SET @Resultado=(SELECT idReserva,total FROM @Creadas FOR JSON PATH);
  UPDATE dbo.SolicitudesReserva SET Resultado=@Resultado WHERE IdUsuario=@IdUsuario AND Clave=@Clave;
  COMMIT;
  SELECT @Resultado AS Resultado;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.SolicitarRecoleccionSegura @IdReserva int,@IdUsuario int
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @Estado nvarchar(50);
  SELECT @Estado=Estado FROM dbo.Reservas WITH(UPDLOCK,HOLDLOCK) WHERE IdReserva=@IdReserva AND IdUsuario=@IdUsuario;
  IF @Estado IS NULL OR @Estado NOT IN('Activa','Recoleccion solicitada') THROW 50001,'Reserva no disponible.',1;
  UPDATE dbo.Reservas SET Estado='Recoleccion solicitada' WHERE IdReserva=@IdReserva;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE dbo.FinalizarReservaSegura @IdReserva int
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @Estado nvarchar(50),@IdLavadora int;
  SELECT @Estado=Estado,@IdLavadora=IdLavadora FROM dbo.Reservas WITH(UPDLOCK,HOLDLOCK) WHERE IdReserva=@IdReserva;
  IF @Estado IS NULL THROW 50001,'Reserva no disponible.',1;
  IF @Estado='Finalizada' BEGIN COMMIT; RETURN; END;
  IF @Estado NOT IN('Activa','Recoleccion solicitada') THROW 50001,'Estado incompatible.',1;
  UPDATE dbo.Lavadoras SET Cantidad=Cantidad+1,Disponible=1,Estado='Disponible' WHERE IdLavadora=@IdLavadora;
  IF @@ROWCOUNT<>1 THROW 50001,'Equipo no disponible.',1;
  UPDATE dbo.Reservas SET Estado='Finalizada' WHERE IdReserva=@IdReserva;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
