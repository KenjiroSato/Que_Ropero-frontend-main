# Que Ropero

Alquiler de lavadoras por horas a domicilio en Itagüí. Angular 20, Express y **Azure SQL / SQL Server**. Express sirve el sitio y la API desde el mismo origen; no se necesita Supabase.

## Ejecutar

Requiere Node.js 24 y una base SQL Server o Azure SQL accesible.

```powershell
npm ci
Copy-Item .env.example .env
# Completar las variables de conexión antes de continuar.
npm run db:migrate
npm run build
# Para servir el compilado, usar APP_ORIGIN=http://localhost:3000.
npm start
```

En desarrollo, usar `APP_ORIGIN=http://localhost:4200` y ejecutar `npm run start:api` y `npm run start:frontend` en terminales distintas. El proxy dirige `/api` al puerto 3000. SQL Express debe tener TCP/IP y un puerto fijo habilitados; Node utiliza autenticación SQL, no la sesión integrada de Windows.

## Ver el diseño sin base de datos

```powershell
npm run build
npm run preview:demo
```

Abrir <http://127.0.0.1:4300>. Este servidor de pruebas utiliza datos **ficticios en memoria** que se pierden al reiniciarlo. Cuenta: `cliente@example.com`, contraseña `Prueba-segura-2026`. No se utiliza en `npm start` ni en el despliegue.

## Verificar

```powershell
npm run format:check
npm run check
npm run test:api
npm run build
npm run test:ci
npx playwright install chrome
npm run test:e2e
npm audit --omit=dev
```

La integración SQL se omite sin `SQL_TEST_SERVER`. En Windows, con `sqlcmd` y permisos para crear bases de prueba, establece `$env:SQL_TEST_SERVER='.\SQLEXPRESS'` antes de `npm run test:api`. Crea y elimina exclusivamente una base temporal `QueRoperoVerify_…`; no utiliza la base del negocio. Verifica concurrencia, transacciones, inventario, precios e idempotencia.

## Operación

- [Despliegue en Azure](docs/azure.md).
- [Correcciones y pendientes](docs/estado-proyecto.md).
- [Procedencia de imágenes](docs/assets.md).
- `database/`: estructura, procedimientos y permisos SQL.
- `api/`: autenticación, autorización, validación y consultas parametrizadas.
- `src/styles.css`: temas claro y oscuro.

Las reservas nuevas tienen pago en efectivo **pendiente**. Solo un operador o administrador puede registrar el cobro y confirmar la devolución física. No hay pasarela de pagos conectada.
