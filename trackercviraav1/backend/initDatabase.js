// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

// Database configuration
// Note: Update these values to match your MySQL configuration or use .env file
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Update this with your MySQL password or set in .env
  database: process.env.DB_NAME || 'deped_db',
  multipleStatements: true
};

async function initDatabase() {
  let connection;
  
  try {
    // Connect without specifying database first
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      multipleStatements: true
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    console.log(`Database '${config.database}' ready`);

    // Use the database
    await connection.query(`USE ${config.database}`);

    // Create personnel table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS personnel (
        personnelID INT AUTO_INCREMENT PRIMARY KEY,
        fname VARCHAR(100) NOT NULL,
        mname VARCHAR(100) DEFAULT NULL,
        lname VARCHAR(100) NOT NULL,
        role TINYINT NOT NULL COMMENT '0=Student, 1=Coach, 2=Trainer',
        eventType TINYINT NOT NULL COMMENT '0=Archery, 1=Arnis, 2=Athletics(Intellectual), 3=Athletics(Track&Field), 4=Athletics(Visual), 5=Badminton, 6=Baseball, 7=Basketball, 8=Billiard, 9=BOCCE(Intellectual), 10=Boxing, 11=Chess, 12=Dancesport, 13=Football, 14=Futsal, 15=Gymnastics (Aerobic), 16=Gymnastics (Mens Artistic), 17=Gymnastics (Rhythmic), 18=Gymnastics (Womens Artistic), 19=Lawn Tennis, 20=Sepak Takraw, 21=Softball, 22=Special Events BOCCE, 23=Swimming, 24=Table Tennis, 25=Taekwondo, 26=Volleyball',
        picture VARCHAR(255) DEFAULT NULL COMMENT 'Profile picture filename',
        personnelStatus TINYINT DEFAULT 0 COMMENT '0=Out, 1=In',
        qrcode TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role),
        INDEX idx_eventType (eventType),
        INDEX idx_name (fname, lname)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableSQL);
    console.log('Table "personnel" ready');

    // Create event_types table
    const createEventTypesSQL = `
      CREATE TABLE IF NOT EXISTS event_types (
        eventTypeID TINYINT UNSIGNED PRIMARY KEY,
        label VARCHAR(80) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.query(createEventTypesSQL);
    console.log('Table "event_types" ready');

    // Seed event_types (insert only if empty)
    const eventTypes = [
      [0, 'Archery'],
      [1, 'Arnis'],
      [2, 'Athletics(Intellectual)'],
      [3, 'Athletics(Track&Field)'],
      [4, 'Athletics(Visual)'],
      [5, 'Badminton'],
      [6, 'Baseball'],
      [7, 'Basketball'],
      [8, 'Billiard'],
      [9, 'BOCCE(Intellectual)'],
      [10, 'Boxing'],
      [11, 'Chess'],
      [12, 'Dancesport'],
      [13, 'Football'],
      [14, 'Futsal'],
      [15, 'Gymnastics (Aerobic)'],
      [16, 'Gymnastics (Mens Artistic)'],
      [17, 'Gymnastics (Rhythmic)'],
      [18, 'Gymnastics (Womens Artistic)'],
      [19, 'Lawn Tennis'],
      [20, 'Sepak Takraw'],
      [21, 'Softball'],
      [22, 'Special Events BOCCE'],
      [23, 'Swimming'],
      [24, 'Table Tennis'],
      [25, 'Taekwondo'],
      [26, 'Volleyball']
    ];
    await connection.query(
      'INSERT IGNORE INTO event_types (eventTypeID, label) VALUES ?',
      [eventTypes]
    );
    console.log('Event types seeded');

    console.log('Database initialization completed successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error('Please check your database credentials in dbConnect.js');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run initialization
initDatabase();

