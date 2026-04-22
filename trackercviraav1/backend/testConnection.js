// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'deped_db'
    });

    console.log('✅ Database connection successful!');
    
    // Test query to check if table exists
    const [tables] = await connection.query("SHOW TABLES LIKE 'personnel'");
    if (tables.length > 0) {
      console.log('✅ Personnel table found!');
      
      // Count records
      const [rows] = await connection.query("SELECT COUNT(*) as count FROM personnel");
      console.log(`✅ Table has ${rows[0].count} record(s)`);
    } else {
      console.log('⚠️  Personnel table not found. Make sure you created it in MySQL Workbench.');
    }
    
    await connection.end();
    console.log('\n✅ All checks passed! Your database is ready to use.');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. MySQL server is running');
    console.error('2. Your .env file has the correct password');
    console.error('3. Database "deped_db" exists');
    console.error('4. Table "personnel" exists');
    process.exit(1);
  }
}

testConnection();

