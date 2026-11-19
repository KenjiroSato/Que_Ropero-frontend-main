require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../api/database');
const { createRepository } = require('../api/repository');
const { registro, validate } = require('../api/validation');
(async () => {
  const input = validate(registro, {
    nombre: process.env.ADMIN_NAME,
    correo: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    celular: process.env.ADMIN_PHONE,
    direccion: process.env.ADMIN_ADDRESS,
    documento: '',
  });
  const pool = await connectDatabase();
  try {
    await createRepository(pool).createUser(
      input,
      await bcrypt.hash(input.password, 12),
      'Administrador',
    );
    console.info('Administrador creado. Retira ADMIN_PASSWORD del entorno.');
  } finally {
    await pool.close();
  }
})().catch((error) => {
  console.error('No se pudo crear el administrador:', error.message);
  process.exitCode = 1;
});
