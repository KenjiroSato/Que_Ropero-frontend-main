// Isolated browser-test data. This entry point is never used by npm start.
const { createApp } = require('../api/app');
const bcrypt = require('bcryptjs');
const { httpError } = require('../api/errors');
const users = [
  {
    id: 1,
    nombre: 'Cliente de prueba',
    correo: 'cliente@example.com',
    celular: '3001234567',
    direccion: 'Calle 12 #34-56, Itagüí',
    documento: '',
    tipoUsuario: 'Cliente',
    fechaRegistro: new Date().toISOString(),
    activo: true,
    passwordHash: bcrypt.hashSync('Prueba-segura-2026', 12),
  },
  {
    id: 2,
    nombre: 'Administración de prueba',
    correo: 'admin@example.com',
    celular: '3001234567',
    direccion: 'Calle 12 #34-56',
    documento: '',
    tipoUsuario: 'Administrador',
    fechaRegistro: new Date().toISOString(),
    activo: true,
    passwordHash: bcrypt.hashSync('Prueba-segura-2026', 12),
  },
];
const catalog = [
  {
    idLavadora: 1,
    codigo: 'TEST-01',
    nombre: 'Lavadora de prueba 18 kg',
    modelo: 'Modelo de prueba',
    categoria: 'Carga Superior',
    capacidadKg: 18,
    precio: 12000,
    cantidad: 3,
    disponible: true,
    estado: 'Disponible',
    caracteristicas: 'Equipo de demostración para pruebas',
    barrioUbicacion: 'Itagüí',
    imagen: '/images/lavanderia.jpg',
  },
  {
    idLavadora: 2,
    codigo: 'TEST-02',
    nombre: 'Lavadora de prueba 12 kg',
    modelo: 'Modelo de prueba',
    categoria: 'Carga Frontal',
    capacidadKg: 12,
    precio: 10000,
    cantidad: 0,
    disponible: false,
    estado: 'Alquilada',
    caracteristicas: 'Equipo no disponible de prueba',
    barrioUbicacion: 'Itagüí',
    imagen: '/assets/lavadora-placeholder.svg',
  },
];
const sessions = new Map(),
  rentals = [],
  requests = new Map();
const publicUser = ({ activo, passwordHash, ...user }) => user;
const repository = {
  async health() {},
  async findLogin(email) {
    return users.find((user) => user.correo === email && user.activo);
  },
  async createSession(id, hash, expires) {
    sessions.set(hash, { id, expires });
  },
  async deleteSession(hash) {
    sessions.delete(hash);
  },
  async sessionUser(hash) {
    const session = sessions.get(hash);
    return session && session.expires > new Date()
      ? users.find((user) => user.id === session.id && user.activo)
      : undefined;
  },
  async catalog() {
    return catalog;
  },
  async listUsers() {
    return users.filter((user) => user.activo).map(publicUser);
  },
  async createUser(input, hash, role) {
    if (users.some((user) => user.correo === input.correo))
      throw httpError(409, 'Este correo ya existe.');
    const { password, ...profile } = input;
    const user = {
      ...profile,
      id: users.length + 1,
      passwordHash: hash,
      tipoUsuario: role,
      activo: true,
      fechaRegistro: new Date().toISOString(),
    };
    users.push(user);
    return publicUser(user);
  },
  async updateUser(id, input) {
    const user = users.find((user) => user.id === id);
    Object.assign(user, input);
    return publicUser(user);
  },
  async disableUser(id) {
    users.find((user) => user.id === id).activo = false;
  },
  async listRentals(id, operator) {
    return rentals.filter((r) => operator || r.userId === id);
  },
  async createRental(id, key, input) {
    if (requests.has(`${id}:${key}`)) return requests.get(`${id}:${key}`);
    const created = input.items.map((item) => {
      const equipment = catalog.find((lav) => lav.idLavadora === item.idLavadora);
      if (!equipment?.disponible) throw httpError(409, 'Equipo no disponible.');
      const row = {
        idReserva: rentals.length + 1,
        userId: id,
        idLavadora: item.idLavadora,
        horasAlquiler: item.horasAlquiler,
        direccionEntrega: input.direccionEntrega,
        fechaInicio: new Date().toISOString(),
        fechaFin: new Date().toISOString(),
        total: equipment.precio * item.horasAlquiler,
        estado: 'Activa',
        nombreLavadora: equipment.nombre,
        modelo: equipment.modelo,
        imagen: equipment.imagen,
        metodoPago: 'Efectivo',
        estadoPago: 'Pendiente',
        nombreCliente: users.find((user) => user.id === id).nombre,
      };
      rentals.push(row);
      return { idReserva: row.idReserva, total: row.total };
    });
    requests.set(`${id}:${key}`, created);
    return created;
  },
  async collectRental(id, user) {
    const row = rentals.find((r) => r.idReserva === id && r.userId === user);
    if (!row) throw httpError(404, 'Reserva no encontrada.');
    row.estado = 'Recoleccion solicitada';
  },
  async finishRental(id) {
    rentals.find((r) => r.idReserva === id).estado = 'Finalizada';
  },
  async confirmCash(id) {
    rentals.find((r) => r.idReserva === id).estadoPago = 'Aprobado';
  },
};
createApp({ repository, origin: 'http://127.0.0.1:4300' }).listen(4300, '127.0.0.1', () =>
  console.log('Test server: http://127.0.0.1:4300'),
);
