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

async function createPersonnelStatusHistoryTable() {
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

    // Create personnelStatusHistory table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS personnelStatusHistory (
        statusHistoryId INT AUTO_INCREMENT PRIMARY KEY,
        personnelID INT NOT NULL,
        status TINYINT NOT NULL COMMENT '0=Out, 1=In',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_personnelID (personnelID),
        INDEX idx_timestamp (timestamp),
        FOREIGN KEY (personnelID) REFERENCES personnel(personnelID) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableSQL);
    console.log('✅ Table "personnelStatusHistory" created successfully!');
    
  } catch (error) {
    // If table already exists, that's okay
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✅ Table "personnelStatusHistory" already exists');
    } else {
      console.error('❌ Error creating table:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run creation
createPersonnelStatusHistoryTable();
