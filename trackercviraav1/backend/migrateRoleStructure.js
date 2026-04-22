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

async function migrateRoleStructure() {
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

    // Step 1: Create roleGroup table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roleGroup (
        rolegroupid INT AUTO_INCREMENT PRIMARY KEY,
        rolegroupname VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rolegroupname (rolegroupname)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table "roleGroup" created');

    // Step 2: Create role table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS role (
        roleid INT AUTO_INCREMENT PRIMARY KEY,
        rolegroupid INT NOT NULL,
        rolename VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (rolegroupid) REFERENCES roleGroup(rolegroupid) ON DELETE RESTRICT ON UPDATE CASCADE,
        INDEX idx_rolegroupid (rolegroupid),
        INDEX idx_rolename (rolename),
        UNIQUE KEY unique_role_per_group (rolegroupid, rolename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table "role" created');

    // Step 3: Populate roleGroup table
    await connection.query(`
      INSERT IGNORE INTO roleGroup (rolegroupid, rolegroupname) VALUES
        (1, 'Sports'),
        (2, 'Committee'),
        (3, 'Officials');
    `);
    console.log('✅ roleGroup table populated');

    // Step 4: Populate role table
    // Sports roles
    const sportsRoles = [
      'Athlete',
      'Asst. Coach',
      'Chaperone',
      'Coach',
      'Trainer'
    ];

    // Committee roles
    const committeeRoles = [
      'Accommodation and Billeting',
      'Learner Rights and Protection',
      'Cultural and Social Development',
      'Disaster Preparedness and Emergency Response',
      'Discipline and Religion',
      'Finance and Budget',
      'Food and Nutrition',
      'Medical, Health, and Wellness',
      'Refurbishment (Advance Party)',
      'Monitoring and Evaluation',
      'Publicity, Media, and Documentation',
      'Results and Documentation',
      'Safety and Security',
      'Sound System and Technical Support/ Lights and Led Wall',
      'Transportation',
      'Uniforms and Equipment',
      'Training Coaching and Performance'
    ];

    // Officials roles
    const officialsRoles = [
      'Mayor',
      'Councilor'
    ];

    // Insert Sports roles (rolegroupid = 1)
    for (const roleName of sportsRoles) {
      await connection.query(
        'INSERT IGNORE INTO role (rolegroupid, rolename) VALUES (?, ?)',
        [1, roleName]
      );
    }
    console.log(`✅ Inserted ${sportsRoles.length} Sports roles`);

    // Insert Committee roles (rolegroupid = 2)
    for (const roleName of committeeRoles) {
      await connection.query(
        'INSERT IGNORE INTO role (rolegroupid, rolename) VALUES (?, ?)',
        [2, roleName]
      );
    }
    console.log(`✅ Inserted ${committeeRoles.length} Committee roles`);

    // Insert Officials roles (rolegroupid = 3)
    for (const roleName of officialsRoles) {
      await connection.query(
        'INSERT IGNORE INTO role (rolegroupid, rolename) VALUES (?, ?)',
        [3, roleName]
      );
    }
    console.log(`✅ Inserted ${officialsRoles.length} Officials roles`);

    // Step 5: Check if personnel.role needs to be migrated
    // First, check if personnel.role is still TINYINT (old structure)
    const [columns] = await connection.query(`
      SELECT COLUMN_TYPE, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'personnel' 
        AND COLUMN_NAME = 'role'
    `, [config.database]);

    if (columns.length > 0 && columns[0].COLUMN_TYPE.includes('tinyint')) {
      console.log('\n⚠️  Found old role structure (TINYINT) in personnel table');
      console.log('⚠️  You need to migrate existing role values to new roleid');
      console.log('⚠️  Mapping old roles to new structure:');
      console.log('   0 (Student) -> Athlete (Sports)');
      console.log('   1 (Coach) -> Coach (Sports)');
      console.log('   2 (Trainer) -> Trainer (Sports)');
      console.log('   3 (Mayor) -> Mayor (Officials)');
      console.log('   4 (Councilor) -> Councilor (Officials)');
      console.log('   5 (IT) -> (needs manual mapping to Committee role)');
      console.log('   6 (Religion) -> Discipline and Religion (Committee)');
      console.log('   7 (Technical) -> Sound System and Technical Support/ Lights and Led Wall (Committee)');
      console.log('\n⚠️  Run migratePersonnelRoles.js to migrate existing data');
    } else {
      console.log('✅ personnel.role column structure looks good');
    }

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
migrateRoleStructure();
