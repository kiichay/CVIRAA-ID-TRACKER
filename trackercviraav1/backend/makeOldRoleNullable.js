// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'deped_db',
  multipleStatements: true
};

async function makeOldRoleNullable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      multipleStatements: true
    });

    console.log('Connected to MySQL server');

    // Old schema had role as NOT NULL; new schema uses roleid. Allow role to be NULL.
    await connection.query(`
      ALTER TABLE personnel
      MODIFY COLUMN role TINYINT NULL DEFAULT NULL
      COMMENT 'Legacy role (old structure). NULL when using roleid.';
    `);

    console.log('✅ Updated personnel.role to allow NULL');
  } catch (error) {
    console.error('❌ Error updating role column:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

makeOldRoleNullable();

