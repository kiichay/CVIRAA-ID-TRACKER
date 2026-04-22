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

async function updateSchema() {
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

    // Add eventType column if it doesn't exist
    const updateTableSQL = `
      ALTER TABLE personnel 
      ADD COLUMN IF NOT EXISTS eventType TINYINT NOT NULL DEFAULT 0 
      COMMENT '0=Archery, 1=Arnis, 2=Athletics(Intellectual), 3=Athletics(Track&Field), 4=Athletics(Visual), 5=Badminton, 6=Baseball, 7=Basketball, 8=Billiard, 9=BOCCE(Intellectual), 10=Boxing, 11=Chess, 12=Dancesport, 13=Football, 14=Futsal, 15=Gymnastics (Aerobic), 16=Gymnastics (Mens Artistic), 17=Gymnastics (Rhythmic), 18=Gymnastics (Womens Artistic), 19=Lawn Tennis, 20=Sepak Takraw, 21=Softball, 22=Special Events BOCCE, 23=Swimming, 24=Table Tennis, 25=Taekwondo, 26=Volleyball'
      AFTER role;
      
      ALTER TABLE personnel 
      ADD INDEX IF NOT EXISTS idx_eventType (eventType);
    `;

    await connection.query(updateTableSQL);
    console.log('✅ Table "personnel" updated with eventType column!');
    
  } catch (error) {
    // If column already exists, that's okay
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Column "eventType" already exists');
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
updateSchema();
