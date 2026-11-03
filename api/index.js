require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const router = express.Router();

// 1. LOGIN DE USUARIOS
router.post('/usuarios/login', async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) {
    return res.status(400).json({ mensaje: 'Debes ingresar tu correo/usuario y contraseña' });
  }

  try {
    const identificador = correo.trim();
    const correoBusqueda = identificador.toLowerCase() === 'admin' ? 'admin@queropero.com' : identificador;

    let { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('correo', correoBusqueda)
      .eq('activo', true)
      .limit(1);

    if ((!usuarios || usuarios.length === 0) && !error) {
      const porNombre = await supabase
        .from('usuarios')
        .select('*')
        .eq('nombre_completo', identificador)
        .eq('activo', true)
        .limit(1);
      usuarios = porNombre.data;
      error = porNombre.error;
    }

    if (error) throw error;
    const usuario = usuarios && usuarios[0];

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    let passwordValido = false;
    if (usuario.contrasena && usuario.contrasena.startsWith('$2')) {
      passwordValido = await bcrypt.compare(password, usuario.contrasena);
    } else {
      passwordValido = (password === usuario.contrasena);
    }

    if (!passwordValido) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    res.status(200).json({
      mensaje: 'Login exitoso',
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre_completo,
        correo: usuario.correo,
        celular: usuario.celular,
        direccion: usuario.direccion,
        documento: usuario.documento,
        tipoUsuario: usuario.tipo_usuario,
        fechaRegistro: usuario.fecha_registro
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno al conectar con Supabase', detalle: error.message });
  }
});

// 2. REGISTRO DE NUEVOS USUARIOS
router.post('/usuarios/registro', async (req, res) => {
  const { nombre, correo, password, celular, direccion, documento } = req.body;
  if (!nombre || !correo || !password) {
    return res.status(400).json({ mensaje: 'Nombre, correo y contraseña son obligatorios' });
  }

  try {
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('correo', correo.trim())
      .limit(1);

    if (existente && existente.length > 0) {
      return res.status(409).json({ mensaje: 'Este correo electrónico ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: insertados, error } = await supabase
      .from('usuarios')
      .insert([{
        nombre_completo: nombre.trim(),
        correo: correo.trim(),
        contrasena: passwordHash,
        celular: celular || '',
        direccion: direccion || 'Itagüí, Antioquia',
        documento: documento || '',
        tipo_usuario: 'Cliente'
      }])
      .select();

    if (error) throw error;
    const nuevo = insertados[0];

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        id: nuevo.id_usuario,
        nombre: nuevo.nombre_completo,
        correo: nuevo.correo,
        celular: nuevo.celular,
        direccion: nuevo.direccion,
        documento: nuevo.documento,
        tipoUsuario: nuevo.tipo_usuario,
        fechaRegistro: nuevo.fecha_registro
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ mensaje: 'Error al registrar usuario', detalle: error.message });
  }
});

// 3. CRUD ADMINISTRATIVO DE USUARIOS
router.get('/usuarios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)
      .order('id_usuario', { ascending: false });

    if (error) throw error;

    const resultado = (data || []).map(u => ({
      id: u.id_usuario,
      nombre: u.nombre_completo,
      correo: u.correo,
      celular: u.celular,
      direccion: u.direccion,
      documento: u.documento,
      tipoUsuario: u.tipo_usuario,
      fechaRegistro: u.fecha_registro
    }));
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al consultar usuarios' });
  }
});

router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, celular, direccion, tipoUsuario } = req.body;
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({
        nombre_completo: nombre,
        correo: correo || `${nombre.replace(/\s+/g, '').toLowerCase()}@queropero.com`,
        celular: celular || '',
        direccion: direccion || 'Itagüí, Antioquia',
        tipo_usuario: tipoUsuario || 'Cliente'
      })
      .eq('id_usuario', Number(id));

    if (error) throw error;
    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar usuario' });
  }
});

router.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: false })
      .eq('id_usuario', Number(id));

    if (error) throw error;
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
});

// 4. CATÁLOGO DE LAVADORAS
router.get('/lavadoras', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lavadoras')
      .select('*')
      .order('id_lavadora', { ascending: true });

    if (error) throw error;

    const lavadoras = (data || []).map(l => ({
      idLavadora: l.id_lavadora,
      codigo: l.codigo,
      nombre: l.nombre,
      modelo: l.modelo,
      categoria: l.categoria,
      capacidadKg: l.capacidad_kg,
      precio: Number(l.precio_hora),
      cantidad: l.cantidad,
      disponible: l.disponible,
      estado: l.estado,
      proveedor: l.proveedor,
      caracteristicas: l.caracteristicas,
      barrioUbicacion: l.barrio_ubicacion,
      imagen: l.imagen
    }));
    res.json(lavadoras);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener catálogo de lavadoras' });
  }
});

// 5. CREAR RESERVAS Y PAGOS
router.post('/reservas', async (req, res) => {
  const { idUsuario, direccionEntrega, metodoPago, items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'No hay lavadoras en el carrito para alquilar' });
  }

  try {
    const reservasCreadas = [];

    for (const item of items) {
      const horas = Number(item.horasAlquiler) || 4;
      const precioHora = Number(item.precio) || 12000;
      const totalItem = horas * precioHora;
      const idLavadora = Number(item.idLavadora) || 1;

      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio.getTime() + horas * 60 * 60 * 1000);

      // 1. Insertar Reserva
      const { data: resInsert, error: errRes } = await supabase
        .from('reservas')
        .insert([{
          id_usuario: Number(idUsuario) || 1,
          id_lavadora: idLavadora,
          horas_alquiler: horas,
          direccion_entrega: direccionEntrega || 'Itagüí, Antioquia',
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          total: totalItem,
          estado: 'Activa'
        }])
        .select();

      if (errRes) throw errRes;
      const nuevaReserva = resInsert[0];

      // 2. Insertar Pago
      const { error: errPago } = await supabase
        .from('pagos')
        .insert([{
          id_reserva: nuevaReserva.id_reserva,
          monto: totalItem,
          metodo: metodoPago || 'Nequi',
          estado_pago: 'Aprobado'
        }]);

      if (errPago) throw errPago;

      // 3. Descontar Stock de la Lavadora
      const { data: lavActual } = await supabase
        .from('lavadoras')
        .select('cantidad')
        .eq('id_lavadora', idLavadora)
        .single();

      if (lavActual) {
        const nuevaCant = Math.max(0, (lavActual.cantidad || 1) - 1);
        await supabase
          .from('lavadoras')
          .update({
            cantidad: nuevaCant,
            disponible: nuevaCant > 0,
            estado: nuevaCant > 0 ? 'Disponible' : 'Alquilada'
          })
          .eq('id_lavadora', idLavadora);
      }

      reservasCreadas.push(nuevaReserva);
    }

    res.status(201).json({
      mensaje: '¡Alquiler y pago registrados con éxito en Supabase!',
      reservas: reservasCreadas
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({ mensaje: 'Error al guardar el alquiler', detalle: error.message });
  }
});

// 6. CONSULTAR RESERVAS POR USUARIO
router.get('/reservas/usuario/:idUsuario', async (req, res) => {
  const idUsr = Number(req.params.idUsuario) || 1;
  try {
    let query = supabase
      .from('reservas')
      .select('*, lavadoras(id_lavadora, nombre, modelo, imagen), pagos(metodo, estado_pago), usuarios(nombre_completo)')
      .order('id_reserva', { ascending: false });

    if (idUsr !== 1) {
      query = query.eq('id_usuario', idUsr);
    }

    const { data, error } = await query;
    if (error) throw error;

    const resultado = (data || []).map(r => {
      const lav = Array.isArray(r.lavadoras) ? r.lavadoras[0] : r.lavadoras;
      const pago = Array.isArray(r.pagos) ? r.pagos[0] : r.pagos;
      const usr = Array.isArray(r.usuarios) ? r.usuarios[0] : r.usuarios;

      return {
        idReserva: r.id_reserva,
        horasAlquiler: r.horas_alquiler,
        direccionEntrega: r.direccion_entrega,
        fechaInicio: r.fecha_inicio,
        fechaFin: r.fecha_fin,
        total: Number(r.total),
        estado: r.estado,
        idLavadora: lav?.id_lavadora,
        nombreLavadora: lav?.nombre || 'Lavadora',
        modelo: lav?.modelo || '',
        imagen: lav?.imagen || '',
        metodoPago: pago?.metodo || 'Nequi',
        estadoPago: pago?.estado_pago || 'Aprobado',
        nombreCliente: usr?.nombre_completo || 'Cliente'
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Error al consultar reservas:', error);
    res.status(500).json({ mensaje: 'Error al consultar las reservas' });
  }
});

// 7. FINALIZAR ALQUILER / RECOLECTAR LAVADORA
router.put('/reservas/:idReserva/finalizar', async (req, res) => {
  const idRes = Number(req.params.idReserva);
  try {
    const { data: reserva } = await supabase
      .from('reservas')
      .select('id_lavadora')
      .eq('id_reserva', idRes)
      .single();

    if (reserva) {
      await supabase
        .from('reservas')
        .update({ estado: 'Finalizada' })
        .eq('id_reserva', idRes);

      const { data: lav } = await supabase
        .from('lavadoras')
        .select('cantidad')
        .eq('id_lavadora', reserva.id_lavadora)
        .single();

      await supabase
        .from('lavadoras')
        .update({
          cantidad: (lav?.cantidad || 0) + 1,
          disponible: true,
          estado: 'Disponible'
        })
        .eq('id_lavadora', reserva.id_lavadora);
    }

    res.json({ mensaje: 'Lavadora recolectada y disponible nuevamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al finalizar reserva' });
  }
});

// Soportar rutas con prefijo /api y sin prefijo en Vercel Serverless
app.use('/api', router);
app.use('/', router);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(` API Supabase ejecutándose en http://localhost:${PORT}`);
  });
}

module.exports = app;