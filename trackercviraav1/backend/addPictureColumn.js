// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'deped_db',
  multipleStatements: true
};

async function addPictureColumn() {
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

    // Add picture column if it doesn't exist
    const updateTableSQL = `
      ALTER TABLE personnel 
      ADD COLUMN IF NOT EXISTS picture VARCHAR(255) DEFAULT NULL 
      COMMENT 'Profile picture filename'
      AFTER eventType;
    `;

    await connection.query(updateTableSQL);
    console.log('✅ Column "picture" added to personnel table!');
    
  } catch (error) {
    // If column already exists, that's okay
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Column "picture" already exists');
    } else {
      console.error('❌ Error updating schema:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run update
addPictureColumn();
