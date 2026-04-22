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

async function migratePersonnelRoles() {
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

    // Mapping old role values to new role names
    const roleMapping = {
      0: { rolegroupname: 'Sports', rolename: 'Athlete' },      // Student -> Athlete
      1: { rolegroupname: 'Sports', rolename: 'Coach' },         // Coach -> Coach
      2: { rolegroupname: 'Sports', rolename: 'Trainer' },       // Trainer -> Trainer
      3: { rolegroupname: 'Officials', rolename: 'Mayor' },      // Mayor -> Mayor
      4: { rolegroupname: 'Officials', rolename: 'Councilor' }, // Councilor -> Councilor
      5: { rolegroupname: 'Committee', rolename: 'Accommodation and Billeting' }, // IT -> Accommodation (you may want to change this)
      6: { rolegroupname: 'Committee', rolename: 'Discipline and Religion' },     // Religion -> Discipline and Religion
      7: { rolegroupname: 'Committee', rolename: 'Sound System and Technical Support/ Lights and Led Wall' } // Technical -> Sound System
    };

    // Step 1: Add new roleid column to personnel table (if it doesn't exist)
    try {
      await connection.query(`
        ALTER TABLE personnel 
        ADD COLUMN roleid INT NULL AFTER role,
        ADD INDEX idx_roleid (roleid),
        ADD FOREIGN KEY (roleid) REFERENCES role(roleid) ON DELETE RESTRICT ON UPDATE CASCADE;
      `);
      console.log('✅ Added roleid column to personnel table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  roleid column already exists');
      } else {
        throw error;
      }
    }

    // Step 2: Migrate existing role values to roleid
    for (const [oldRoleValue, mapping] of Object.entries(roleMapping)) {
      // Get the roleid for this role
      const [roleRows] = await connection.query(`
        SELECT r.roleid 
        FROM role r
        INNER JOIN roleGroup rg ON r.rolegroupid = rg.rolegroupid
        WHERE rg.rolegroupname = ? AND r.rolename = ?
        LIMIT 1
      `, [mapping.rolegroupname, mapping.rolename]);

      if (roleRows.length === 0) {
        console.log(`⚠️  Warning: Role "${mapping.rolename}" in "${mapping.rolegroupname}" not found. Skipping migration for old role ${oldRoleValue}`);
        continue;
      }

      const newRoleId = roleRows[0].roleid;

      // Update personnel records
      const [result] = await connection.query(`
        UPDATE personnel 
        SET roleid = ? 
        WHERE role = ? AND (roleid IS NULL OR roleid = 0)
      `, [newRoleId, parseInt(oldRoleValue)]);

      console.log(`✅ Migrated ${result.affectedRows} records from old role ${oldRoleValue} (${mapping.rolename}) to roleid ${newRoleId}`);
    }

    // Step 3: Make roleid NOT NULL and remove old role column (optional - commented out for safety)
    // Uncomment these lines after verifying the migration worked correctly:
    /*
    await connection.query(`
      ALTER TABLE personnel 
      MODIFY COLUMN roleid INT NOT NULL;
    `);
    console.log('✅ Made roleid NOT NULL');

    await connection.query(`
      ALTER TABLE personnel 
      DROP COLUMN role;
    `);
    console.log('✅ Removed old role column');
    */

    console.log('\n✅ Personnel role migration completed!');
    console.log('⚠️  Note: Old "role" column still exists. After verifying, you can remove it.');
    
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
migratePersonnelRoles();
