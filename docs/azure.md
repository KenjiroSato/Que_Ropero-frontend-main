# Desplegar en Azure

Destino: **Azure App Service Linux + Azure SQL Database**. Express sirve Angular y `/api` desde el mismo dominio. El navegador nunca accede directamente a SQL. El repositorio está preparado; los recursos remotos aún deben crearse y configurarse.

## 1. Crear Azure SQL

En la pantalla compartida, selecciona **Crear → Base de datos SQL**:

1. Elige Azure for Students y un grupo de recursos, por ejemplo `rg-que-ropero`.
2. Nombra la base `QueRoperoDB`. Crea un servidor lógico con nombre único: su host será `<nombre>.database.windows.net`.
3. Configura un administrador Microsoft Entra. Si necesitas autenticación SQL para migrar, configura además un administrador SQL y conserva su contraseña fuera del repositorio.
4. Revisa región, capacidad y precio antes de crear. La oferta gratuita depende de elegibilidad y región; no todas las configuraciones están cubiertas por Azure for Students. Revisa las opciones de pausa y límites de consumo si aparecen.
5. Autoriza en el firewall la IP desde la que aplicarás la migración y las IP de salida de App Service. Para producción, considera conectividad privada según el plan. No abras todas las IP ni habilites indiscriminadamente todos los servicios Azure.
6. Mantén TLS y validación de certificado. La aplicación los exige en producción.

Referencias: [Node.js y Azure SQL con mssql](https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-sql-javascript-mssql-quickstart?view=azuresql), [elegibilidad de la oferta gratuita](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer-faq?view=azuresql).

## 2. Migrar estructura y datos

Haz copia de seguridad y ensaya primero sobre una copia. Los scripts conservan las tablas originales `Usuarios`, `Lavadoras`, `Reservas` y `Pagos`; agregan sesiones, índices únicos y control de solicitudes duplicadas.

Configura `.env` para una cuenta con permisos de migración y ejecuta `npm ci` y `npm run db:migrate`. También puedes ejecutar `database/001_schema.sql` y `database/002_rental_procedures.sql` en orden desde SSMS o un editor compatible con lotes `GO`. Si hay correos o pagos duplicados, el script se detiene para que revises los datos. Se puede volver a ejecutar. La aplicación no migra automáticamente al iniciar.

Para trasladar una base local a Azure SQL, utiliza BACPAC o una herramienta de migración SQL Server compatible; valida cantidades, tarifas, identificadores, relaciones y estados en la copia. Si existen datos reales en Supabase, requieren una extracción y un mapeo propios: no hay una migración de esos datos probada en este repositorio.

Las contraseñas anteriores en texto plano no se aceptan. Usa `npm run admin:reset-password` para establecer contraseñas individuales en cuentas conservadas. No se reactivan usuarios ni se modifican roles con ese comando.

## 3. Crear App Service

Crea una aplicación Linux con Node.js 24. Si no está disponible en tu región, utiliza el `Dockerfile` Node 24 con App Service para contenedores. Activa **HTTPS solo**. Comando de inicio: `node api/index.js`. Express escucha en el `PORT` proporcionado por Azure.

Activa la **identidad administrada asignada por el sistema**. Conéctate a SQL como administrador Entra y ejecuta con el nombre real de la aplicación:

```sql
CREATE USER [NOMBRE-REAL-DE-LA-APP] FROM EXTERNAL PROVIDER;
```

Ejecuta `database/003_app_permissions.sql` y agrega la identidad al rol:

```sql
ALTER ROLE que_ropero_runtime ADD MEMBER [NOMBRE-REAL-DE-LA-APP];
```

El rol no tiene permisos de migración ni `db_owner`. Los procedimientos operan sobre inventario y reservas mediante la cadena de propiedad de objetos `dbo`.

En las variables de entorno de App Service:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_ORIGIN` | `https://NOMBRE-REAL-DE-LA-APP.azurewebsites.net` sin barra final |
| `DB_SERVER` | `TU-SERVIDOR.database.windows.net` |
| `DB_NAME` | `QueRoperoDB` |
| `DB_AUTH` | `managed-identity` |
| `DB_PORT` | `1433` |

Con identidad administrada omite `DB_USER` y `DB_PASSWORD`. Si necesitas autenticación SQL, usa `DB_AUTH=sql` y ambas variables con una cuenta exclusiva miembro de `que_ropero_runtime`. Guarda la contraseña en la configuración segura o una referencia Key Vault. Nunca en Angular, Git o un archivo publicado. Separa la cuenta de migración de la de ejecución.

Si cambias de dominio, cambia `APP_ORIGIN` por el origen HTTPS exacto que usarán los clientes. Otros orígenes serán rechazados. La configuración confía en un único proxy frontal de Azure; revísala si añades más proxies.

## 4. Administrador inicial y credenciales heredadas

En una terminal con acceso a la base establece temporalmente `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_ADDRESS` y `ADMIN_PASSWORD`, y ejecuta `npm run admin:create`. Introduce el secreto mediante un gestor de secretos o entrada privada; evita comandos con contraseñas literales que queden en el historial. Retira `ADMIN_PASSWORD` del entorno al terminar.

Se exige un mínimo de 12 caracteres y máximo de 72 bytes; se almacena bcrypt. No existe contraseña predeterminada. Para un correo ya existente usa `RESET_EMAIL` y `RESET_PASSWORD` con `npm run admin:reset-password`. Se conserva el rol y se revocan sus sesiones.

**Rota la credencial que antes estaba incrustada en el proyecto** en su servidor original. Borrarla del código no la elimina del historial ni de copias previas.

## 5. Desplegar

El workflow manual `.github/workflows/deploy-azure.yml` verifica y publica el código. Configura un entorno GitHub `production`:

- Variable `AZURE_WEBAPP_NAME`: nombre de App Service.
- Secretos `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` para la identidad de despliegue.
- Credencial federada para el repositorio y entorno `production`, con permisos de despliegue limitados a la aplicación o su grupo de recursos.

GitHub usa OIDC, sin contraseña de publicación. Esta identidad es distinta a la que usa la aplicación para SQL. Sigue la [guía oficial de App Service y GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions) para configurar la federación.

Aplica antes las migraciones y permisos; el workflow no modifica la base. El paquete incluye `api`, `dist`, `package.json` y dependencias de producción instaladas en Linux. No necesita compilar al arrancar. Para contenedores, construye y publica el `Dockerfile` y configura las mismas variables; `.env` no entra en la imagen.

## 6. Validar en Azure

- `/api/health` devuelve `ok` y `/api/ready` devuelve `ready` cuando SQL responde. Configura Health Check con `/api/ready`.
- Inicio, catálogo y login cargan por HTTPS, sin errores CSP; los temas persisten al recargar.
- Registra una cuenta, cierra sesión y comprueba que `/api/reservas` sin sesión responde 401. Un cliente no administra usuarios ni pagos.
- Reserva un equipo de prueba: precio desde SQL, pago pendiente y una sola reducción de stock.
- Solicitar recolección no aumenta stock; confirmar devolución como operador sí. Repetir la confirmación no agrega unidades.
- Configura registros, alertas de consumo y respaldos, y ensaya restaurar antes de abrir al público.

El rate limiter actual es por proceso. Para varias instancias agrega un almacén compartido; empieza con una instancia. Las listas muestran las últimas 200 filas: implementa paginación antes de superar ese volumen. No se han verificado recursos remotos ni costos de tu cuenta desde este entorno.
