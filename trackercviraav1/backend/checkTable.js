// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

async function checkTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'deped_db'
    });

    console.log('Connected to database:', process.env.DB_NAME || 'deped_db');
    console.log('');
    
    // Check table structure
    console.log('=== Personnel Table Structure ===');
    const [columns] = await connection.query("DESCRIBE personnel");
    
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`);
    });
    
    // Check if picture column exists
    const hasPicture = columns.some(col => col.Field === 'picture');
    console.log('');
    if (hasPicture) {
      console.log('✅ Picture column EXISTS');
    } else {
      console.log('❌ Picture column MISSING');
      console.log('   Run: npm run add-picture-column');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTable();
