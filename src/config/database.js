// src/config/database.js
// =====================================================
// DATABASE CONNECTION CONFIGURATION
// =====================================================
// This file sets up the connection to PostgreSQL database
// We use connection pooling for better performance

// Import the pg (node-postgres) library
// pg is the PostgreSQL client for Node.js
const { Pool } = require('pg');

// Import dotenv to load environment variables from .env file
// This keeps sensitive information (like passwords) out of our code
require('dotenv').config();

// =====================================================
// WHAT IS A CONNECTION POOL?
// =====================================================
// A connection pool is a cache of database connections
// Instead of creating a new connection for every query:
// 1. Pool creates several connections when app starts
// 2. Queries reuse these existing connections
// 3. Much faster than creating new connections each time
// 4. Automatically handles connection lifecycle

// =====================================================
// DATABASE CONNECTION CONFIGURATION
// =====================================================
// We support two connection methods:
// 1. DATABASE_URL (used by Render, Heroku, etc.)
// 2. Individual connection parameters (used locally)

let pool;

if (process.env.DATABASE_URL) {
  // PRODUCTION: Use DATABASE_URL (Render, Heroku, etc.)
  console.log('📊 Using DATABASE_URL for connection');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for hosted databases
    }
  });
} else {
  // DEVELOPMENT: Use individual parameters
  console.log('📊 Using individual DB parameters for connection');
  pool = new Pool({
    host: process.env.DB_HOST,           // Database server address
    port: process.env.DB_PORT,           // PostgreSQL default port is 5432
    database: process.env.DB_NAME,       // Name of the database
    user: process.env.DB_USER,           // PostgreSQL username
    password: process.env.DB_PASSWORD,   // PostgreSQL password
    
    // Optional pool configuration:
    max: 20,                             // Maximum number of connections
    idleTimeoutMillis: 30000,           // How long idle before closing
    connectionTimeoutMillis: 2000,      // How long to wait when connecting
  });
}

// =====================================================
// CONNECTION EVENT HANDLERS
// =====================================================
// These help us monitor the database connection status

// Event: When a new client connects to the database
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Event: When there's an error with a connection
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1); // Exit the application if database connection fails
});

// =====================================================
// TEST CONNECTION FUNCTION
// =====================================================
// This function verifies that we can connect to the database
// It's good practice to test the connection when the app starts

const testConnection = async () => {
  try {
    // Try to connect to database
    const client = await pool.connect();
    console.log('🔗 Database connection test successful');
    
    // Release the client back to the pool
    // Always release clients after using them!
    client.release();
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// =====================================================
// EXPORT
// =====================================================
// Export the pool so other files can use it to query the database
// Export testConnection so we can verify connection at startup

module.exports = {
  pool,
  testConnection
};

// the following are good when locally testing the code but for for deployment on render.com, the above code is better suited

// =====================================================
// USAGE EXAMPLE (in other files):
// =====================================================
// const { pool } = require('./config/database');
// const result = await pool.query('SELECT * FROM users');


// // src/config/database.js
// // =====================================================
// // DATABASE CONNECTION CONFIGURATION
// // =====================================================
// // This file sets up the connection to PostgreSQL database
// // We use connection pooling for better performance

// // Import the pg (node-postgres) library
// // pg is the PostgreSQL client for Node.js
// const { Pool } = require('pg');

// // Import dotenv to load environment variables from .env file
// // This keeps sensitive information (like passwords) out of our code
// require('dotenv').config();

// // =====================================================
// // WHAT IS A CONNECTION POOL?
// // =====================================================
// // A connection pool is a cache of database connections
// // Instead of creating a new connection for every query:
// // 1. Pool creates several connections when app starts
// // 2. Queries reuse these existing connections
// // 3. Much faster than creating new connections each time
// // 4. Automatically handles connection lifecycle

// // Create a new connection pool with configuration from environment variables
// const pool = new Pool({
//   host: process.env.DB_HOST,           // Database server address (usually 'localhost' in development)
//   port: process.env.DB_PORT,           // PostgreSQL default port is 5432
//   database: process.env.DB_NAME,       // Name of the database we created
//   user: process.env.DB_USER,           // PostgreSQL username
//   password: process.env.DB_PASSWORD,   // PostgreSQL password
  
//   // Optional pool configuration for better performance:
//   max: 20,                             // Maximum number of connections in the pool
//   idleTimeoutMillis: 30000,           // How long a connection can be idle before being closed (30 seconds)
//   connectionTimeoutMillis: 2000,      // How long to wait when connecting to database (2 seconds)
// });

// // =====================================================
// // CONNECTION EVENT HANDLERS
// // =====================================================
// // These help us monitor the database connection status

// // Event: When a new client connects to the database
// pool.on('connect', () => {
//   console.log('✅ Connected to PostgreSQL database');
// });

// // Event: When there's an error with a connection
// pool.on('error', (err) => {
//   console.error('❌ Unexpected error on idle client', err);
//   process.exit(-1); // Exit the application if database connection fails
// });

// // =====================================================
// // TEST CONNECTION FUNCTION
// // =====================================================
// // This function verifies that we can connect to the database
// // It's good practice to test the connection when the app starts

// const testConnection = async () => {
//   try {
//     // Try to connect to database
//     const client = await pool.connect();
//     console.log('🔗 Database connection test successful');
    
//     // Release the client back to the pool
//     // Always release clients after using them!
//     client.release();
    
//     return true;
//   } catch (error) {
//     console.error('❌ Database connection test failed:', error.message);
//     return false;
//   }
// };

// // =====================================================
// // EXPORT
// // =====================================================
// // Export the pool so other files can use it to query the database
// // Export testConnection so we can verify connection at startup

// module.exports = {
//   pool,
//   testConnection
// };

// // =====================================================
// // USAGE EXAMPLE (in other files):
// // =====================================================
// // const { pool } = require('./config/database');
// // const result = await pool.query('SELECT * FROM users');
