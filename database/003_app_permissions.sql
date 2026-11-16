-- Ejecutar como administrador después de 001 y 002.
-- Crear antes el usuario de identidad administrada o SQL según docs/azure.md.
IF DATABASE_PRINCIPAL_ID('que_ropero_runtime') IS NULL
 CREATE ROLE que_ropero_runtime;
GRANT SELECT, INSERT, UPDATE ON OBJECT::dbo.Usuarios TO que_ropero_runtime;
GRANT SELECT, INSERT, DELETE ON OBJECT::dbo.Sesiones TO que_ropero_runtime;
GRANT SELECT ON OBJECT::dbo.Lavadoras TO que_ropero_runtime;
GRANT SELECT ON OBJECT::dbo.Reservas TO que_ropero_runtime;
GRANT SELECT ON OBJECT::dbo.Pagos TO que_ropero_runtime;
GRANT UPDATE ON OBJECT::dbo.Pagos (EstadoPago) TO que_ropero_runtime;
GRANT EXECUTE ON OBJECT::dbo.CrearReservaSegura TO que_ropero_runtime;
GRANT EXECUTE ON OBJECT::dbo.SolicitarRecoleccionSegura TO que_ropero_runtime;
GRANT EXECUTE ON OBJECT::dbo.FinalizarReservaSegura TO que_ropero_runtime;
GO
