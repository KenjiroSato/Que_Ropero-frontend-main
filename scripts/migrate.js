require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { connectDatabase } = require('../api/database');
(async () => {
  const pool = await connectDatabase();
  try {
    for (const file of ['001_schema.sql', '002_rental_procedures.sql']) {
      const content = await fs.readFile(path.join(__dirname, '../database', file), 'utf8');
      for (const batch of content.split(/^GO\s*$/gim).filter((value) => value.trim()))
        await pool.request().batch(batch);
      console.info(`Aplicado: ${file}`);
    }
  } finally {
    await pool.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
