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

async function addRoleTypeColumn() {
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

    // roleType: used mainly for Committee (Chairman/Member), but nullable for all.
    await connection.query(`
      ALTER TABLE personnel
      ADD COLUMN roleType VARCHAR(30) NULL DEFAULT NULL AFTER roleid;
    `);

    console.log('✅ Added personnel.roleType');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  personnel.roleType already exists');
    } else {
      console.error('❌ Error adding roleType column:', error.message);
      console.error(error);
      process.exit(1);
    }
  } finally {
    if (connection) await connection.end();
  }
}

addRoleTypeColumn();

