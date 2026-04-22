// Load environment variables
require('dotenv').config();

const mysql = require('mysql2');

// Create connection pool
// Note: Update these values to match your MySQL configuration or use .env file
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'berame', // Update this with your MySQL password or set in .env
  database: process.env.DB_NAME || 'cviraa',
  charset: 'utf8mb4', // Support Ñ and other Unicode (e.g. Cañete) in names and QR codes
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection error:', err.message);
    console.error('Please check your database configuration in dbConnect.js');
  } else {
    console.log('Database connected successfully');
    connection.release();
  }
});

// Get promise-based connection
const promisePool = pool.promise();

// Export both callback and promise interfaces
module.exports = {
  query: pool.query.bind(pool),
  promise: promisePool,
  pool: pool
};

