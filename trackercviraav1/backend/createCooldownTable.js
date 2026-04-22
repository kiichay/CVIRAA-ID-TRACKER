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

async function createCooldownTable() {
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

    // Create cooldown table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS cooldown (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cooldownCount INT NOT NULL DEFAULT 1 COMMENT 'Cooldown time in minutes for IN/OUT switch',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await connection.query(createTableSQL);
    console.log('✅ Cooldown table created successfully!');
    
    // Insert default value if table is empty
    const insertDefaultSQL = `
      INSERT INTO cooldown (cooldownCount) 
      SELECT 1 FROM DUAL 
      WHERE NOT EXISTS (SELECT 1 FROM cooldown);
    `;

    await connection.query(insertDefaultSQL);
    console.log('✅ Default cooldown value inserted (1 minute)!');
    
  } catch (error) {
    console.error('❌ Error creating cooldown table:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createCooldownTable();
