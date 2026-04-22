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

async function addColumns() {
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

    const addOfficial = `
      ALTER TABLE personnel
      ADD COLUMN official TINYINT NULL
      COMMENT '0=Mayor, 1=Councilor'
      AFTER picture;
    `;
    const addCommittee = `
      ALTER TABLE personnel
      ADD COLUMN committee TINYINT NULL
      COMMENT '0=IT, 1=Religion, 2=Technical'
      AFTER official;
    `;

    try {
      await connection.query(addOfficial);
      console.log('✅ Column "official" added to personnel table!');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ Column "official" already exists');
      else throw e;
    }

    try {
      await connection.query(addCommittee);
      console.log('✅ Column "committee" added to personnel table!');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ Column "committee" already exists');
      else throw e;
    }
  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

addColumns();
