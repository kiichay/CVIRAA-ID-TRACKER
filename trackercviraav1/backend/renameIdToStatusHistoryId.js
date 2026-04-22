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

async function renameIdColumn() {
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

    // Check if table exists and has 'id' column
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'personnelStatusHistory'"
    );

    if (tables.length === 0) {
      console.log('Table "personnelStatusHistory" does not exist. Run createPersonnelStatusHistoryTable.js first.');
      return;
    }

    // Check if 'id' column exists
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM personnelStatusHistory LIKE 'id'"
    );

    if (columns.length === 0) {
      console.log('Column "id" does not exist. Column may already be renamed or table structure is different.');
      return;
    }

    // Rename id column to statusHistoryId
    const renameSQL = `
      ALTER TABLE personnelStatusHistory 
      CHANGE COLUMN id statusHistoryId INT AUTO_INCREMENT;
    `;

    await connection.query(renameSQL);
    console.log('✅ Column "id" renamed to "statusHistoryId" successfully!');
    
  } catch (error) {
    // If column doesn't exist or already renamed, that's okay
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('Unknown column')) {
      console.log('✅ Column "id" does not exist or already renamed');
    } else {
      console.error('❌ Error renaming column:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run rename
renameIdColumn();
