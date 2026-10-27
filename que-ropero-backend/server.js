const express = require('express'); 
app.post('/api/usuarios/login', async (req, res) => {
    const { correo, password } = req.body;
    if (!correo || !password) {
        return res.status(400).json({ mensaje: 'Debes ingresar tu correo/usuario y contraseña' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Identificador', sql.NVarChar, correo.trim())
            .query(`
                SELECT IdUsuario, NombreCompleto, Correo, Contrasena, Celular, Direccion, Documento, TipoUsuario, FechaRegistro, Activo
                FROM dbo.Usuarios
                WHERE (Correo = @Identificador OR NombreCompleto = @Identificador OR (@Identificador = 'admin' AND Correo = 'admin@queropero.com'))
                  AND Activo = 1
            `);

        const usuario = result.recordset[0];
        if (!usuario) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        // Valida tanto contraseñas con Hash Bcrypt como texto plano insertado en SSMS
        let passwordValido = false;
        if (usuario.Contrasena && usuario.Contrasena.startsWith('$2')) {
            passwordValido = await bcrypt.compare(password, usuario.Contrasena);
        } else {
            passwordValido = (password === usuario.Contrasena);
        }

        if (!passwordValido) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        res.status(200).json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.IdUsuario,
                nombre: usuario.NombreCompleto,
                correo: usuario.Correo,
                celular: usuario.Celular,
                direccion: usuario.Direccion,
                documento: usuario.Documento,
                tipoUsuario: usuario.TipoUsuario,
                fechaRegistro: usuario.FechaRegistro
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor', detalle: error.message });
    }
});

// 2. REGISTRO DE NUEVOS USUARIOS (RF002)
app.post('/api/usuarios/registro', async (req, res) => {
    const { nombre, correo, password, celular, direccion, documento } = req.body;
    if (!nombre || !correo || !password) {
        return res.status(400).json({ mensaje: 'Nombre, correo y contraseña son obligatorios' });
    }

    try {
        const pool = await poolPromise;
        const existe = await pool.request()
            .input('Correo', sql.NVarChar, correo.trim())
            .query('SELECT IdUsuario FROM dbo.Usuarios WHERE Correo = @Correo');

        if (existe.recordset.length > 0) {
            return res.status(409).json({ mensaje: 'Este correo electrónico ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const insertResult = await pool.request()
            .input('NombreCompleto', sql.NVarChar, nombre.trim())
            .input('Correo', sql.NVarChar, correo.trim())
            .input('Contrasena', sql.NVarChar, passwordHash)
            .input('Celular', sql.NVarChar, celular || '')
            .input('Direccion', sql.NVarChar, direccion || 'Itagüí, Antioquia')
            .input('Documento', sql.NVarChar, documento || '')
            .query(`
                INSERT INTO dbo.Usuarios (NombreCompleto, Correo, Contrasena, Celular, Direccion, Documento, TipoUsuario)
                OUTPUT INSERTED.IdUsuario, INSERTED.NombreCompleto, INSERTED.Correo, INSERTED.Celular, INSERTED.Direccion, INSERTED.Documento, INSERTED.TipoUsuario, INSERTED.FechaRegistro
                VALUES (@NombreCompleto, @Correo, @Contrasena, @Celular, @Direccion, @Documento, 'Cliente')
            `);

        const nuevo = insertResult.recordset[0];
        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: {
                id: nuevo.IdUsuario,
                nombre: nuevo.NombreCompleto,
                correo: nuevo.Correo,
                celular: nuevo.Celular,
                direccion: nuevo.Direccion,
                documento: nuevo.Documento,
                tipoUsuario: nuevo.TipoUsuario,
                fechaRegistro: nuevo.FechaRegistro
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ mensaje: 'Error al registrar usuario', detalle: error.message });
    }
});

// 3. LISTAR, EDITAR Y ELIMINAR USUARIOS (Módulo /usuarios)
app.get('/api/usuarios', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT IdUsuario AS id, NombreCompleto AS nombre, Correo AS correo,
                   Celular AS celular, Direccion AS direccion, Documento AS documento,
                   TipoUsuario AS tipoUsuario, FechaRegistro AS fechaRegistro
            FROM dbo.Usuarios
            WHERE Activo = 1
            ORDER BY IdUsuario DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al consultar usuarios' });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, celular, direccion, tipoUsuario } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('IdUsuario', sql.Int, id)
            .input('NombreCompleto', sql.NVarChar, nombre)
            .input('Correo', sql.NVarChar, correo || `${nombre.replace(/\s+/g, '').toLowerCase()}@queropero.com`)
            .input('Celular', sql.NVarChar, celular || '')
            .input('Direccion', sql.NVarChar, direccion || 'Itagüí, Antioquia')
            .input('TipoUsuario', sql.NVarChar, tipoUsuario || 'Cliente')
            .query(`
                UPDATE dbo.Usuarios
                SET NombreCompleto = @NombreCompleto, Correo = @Correo,
                    Celular = @Celular, Direccion = @Direccion, TipoUsuario = @TipoUsuario
                WHERE IdUsuario = @IdUsuario
            `);
        res.json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar usuario' });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('IdUsuario', sql.Int, id)
            .query('UPDATE dbo.Usuarios SET Activo = 0 WHERE IdUsuario = @IdUsuario');
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar usuario' });
    }
});

// 4. OBTENER CATÁLOGO DE LAVADORAS DESDE SQL SERVER (RF005)
app.get('/api/lavadoras', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT IdLavadora AS idLavadora, Codigo AS codigo, Nombre AS nombre,
                   Modelo AS modelo, Categoria AS categoria, CapacidadKg AS capacidadKg,
                   PrecioHora AS precio, Cantidad AS cantidad, Disponible AS disponible,
                   Estado AS estado, Proveedor AS proveedor, Caracteristicas AS caracteristicas,
                   BarrioUbicacion AS barrioUbicacion, Imagen AS imagen
            FROM dbo.Lavadoras
            ORDER BY IdLavadora ASC
        `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener catálogo de lavadoras' });
    }
});

// 5. REGISTRAR ALQUILER / RESERVA Y PAGO EN SQL SERVER (RF006 y RF007)
app.post('/api/reservas', async (req, res) => {
    const { idUsuario, direccionEntrega, metodoPago, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: 'No hay lavadoras en el carrito para alquilar' });
    }

    try {
        const pool = await poolPromise;
        const reservasCreadas = [];

        for (const item of items) {
            const horas = Number(item.horasAlquiler) || 4;
            const precioHora = Number(item.precio) || 12000;
            const totalItem = horas * precioHora;
            const idLavadora = Number(item.idLavadora) || 1;

            // Insertar Reserva
            const reservaResult = await pool.request()
                .input('IdUsuario', sql.Int, Number(idUsuario) || 1)
                .input('IdLavadora', sql.Int, idLavadora)
                .input('HorasAlquiler', sql.Int, horas)
                .input('DireccionEntrega', sql.NVarChar, direccionEntrega || 'Itagüí, Antioquia')
                .input('Total', sql.Decimal(10, 2), totalItem)
                .query(`
                    INSERT INTO dbo.Reservas (IdUsuario, IdLavadora, HorasAlquiler, DireccionEntrega, FechaInicio, FechaFin, Total, Estado)
                    OUTPUT INSERTED.IdReserva, INSERTED.FechaInicio, INSERTED.FechaFin, INSERTED.Total, INSERTED.Estado
                    VALUES (@IdUsuario, @IdLavadora, @HorasAlquiler, @DireccionEntrega, GETDATE(), DATEADD(HOUR, @HorasAlquiler, GETDATE()), @Total, 'Activa')
                `);

            const nuevaReserva = reservaResult.recordset[0];

            // Insertar Pago
            await pool.request()
                .input('IdReserva', sql.Int, nuevaReserva.IdReserva)
                .input('Monto', sql.Decimal(10, 2), totalItem)
                .input('Metodo', sql.NVarChar, metodoPago || 'Nequi')
                .query(`
                    INSERT INTO dbo.Pagos (IdReserva, Monto, Metodo, EstadoPago)
                    VALUES (@IdReserva, @Monto, @Metodo, 'Aprobado')
                `);

            // Descontar stock y actualizar disponibilidad
            await pool.request()
                .input('IdLavadora', sql.Int, idLavadora)
                .query(`
                    UPDATE dbo.Lavadoras
                    SET Cantidad = CASE WHEN Cantidad > 1 THEN Cantidad - 1 ELSE 0 END,
                        Disponible = CASE WHEN Cantidad - 1 <= 0 THEN 0 ELSE 1 END,
                        Estado = CASE WHEN Cantidad - 1 <= 0 THEN 'Alquilada' ELSE 'Disponible' END
                    WHERE IdLavadora = @IdLavadora
                `);

            reservasCreadas.push(nuevaReserva);
        }

        res.status(201).json({
            mensaje: '¡Alquiler y pago registrados con éxito en SQL Server!',
            reservas: reservasCreadas
        });
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({ mensaje: 'Error al guardar el alquiler en SQL Server', detalle: error.message });
    }
});

// 6. CONSULTAR MIS ALQUILERES ACTIVOS / HISTORIAL
app.get('/api/reservas/usuario/:idUsuario', async (req, res) => {
    const { idUsuario } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('IdUsuario', sql.Int, Number(idUsuario) || 1)
            .query(`
                SELECT r.IdReserva AS idReserva, r.HorasAlquiler AS horasAlquiler,
                       r.DireccionEntrega AS direccionEntrega, r.FechaInicio AS fechaInicio,
                       r.FechaFin AS fechaFin, r.Total AS total, r.Estado AS estado,
                       l.IdLavadora AS idLavadora, l.Nombre AS nombreLavadora,
                       l.Modelo AS modelo, l.Imagen AS imagen,
                       p.Metodo AS metodoPago, p.EstadoPago AS estadoPago,
                       u.NombreCompleto AS nombreCliente
                FROM dbo.Reservas r
                INNER JOIN dbo.Lavadoras l ON r.IdLavadora = l.IdLavadora
                LEFT JOIN dbo.Pagos p ON r.IdReserva = p.IdReserva
                INNER JOIN dbo.Usuarios u ON r.IdUsuario = u.IdUsuario
                WHERE r.IdUsuario = @IdUsuario OR @IdUsuario = 1
                ORDER BY r.IdReserva DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al consultar las reservas' });
    }
});

// 7. DEVOLVER / FINALIZAR ALQUILER DE LAVADORA
app.put('/api/reservas/:idReserva/finalizar', async (req, res) => {
    const { idReserva } = req.params;
    try {
        const pool = await poolPromise;
        const resInfo = await pool.request()
            .input('IdReserva', sql.Int, Number(idReserva))
            .query('SELECT IdLavadora FROM dbo.Reservas WHERE IdReserva = @IdReserva');

        if (resInfo.recordset.length > 0) {
            const idLavadora = resInfo.recordset[0].IdLavadora;
            await pool.request()
                .input('IdReserva', sql.Int, Number(idReserva))
                .query("UPDATE dbo.Reservas SET Estado = 'Finalizada' WHERE IdReserva = @IdReserva");

            await pool.request()
                .input('IdLavadora', sql.Int, idLavadora)
                .query("UPDATE dbo.Lavadoras SET Cantidad = Cantidad + 1, Disponible = 1, Estado = 'Disponible' WHERE IdLavadora = @IdLavadora");
        }
        res.json({ mensaje: 'Lavadora recolectada y disponible nuevamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al finalizar reserva' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` API Que Ropero ejecutándose en http://localhost:${PORT}`);
});