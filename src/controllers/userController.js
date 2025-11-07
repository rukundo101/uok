// src/controllers/userController.js
// =====================================================
// USER CONTROLLER - BUSINESS LOGIC LAYER
// =====================================================
// Controllers handle the "what to do" logic
// They receive requests, process them, and send responses

// Import required modules
const bcrypt = require('bcryptjs');           // For password hashing
const jwt = require('jsonwebtoken');        // For creating authentication tokens
const User = require('../models/userModel'); // Our User model for database operations

// =====================================================
// WHAT IS A CONTROLLER?
// =====================================================
// Think of a controller as a "traffic cop" in your application:
// 1. Receives incoming requests from routes
// 2. Validates and processes the data
// 3. Calls appropriate model methods
// 4. Formats and sends back the response
//
// Controllers contain BUSINESS LOGIC, not database logic

// =====================================================
// REGISTER USER CONTROLLER
// =====================================================
// Purpose: Create a new user account
// HTTP Method: POST
// Route: /api/users/register

const registerUser = async (req, res) => {
  // =================================================
  // STEP 1: EXTRACT DATA FROM REQUEST BODY
  // =================================================
  // req.body contains the JSON data sent by the client
  // We use destructuring to extract specific fields
  const { username, email, password } = req.body;

  // =================================================
  // STEP 2: VALIDATE INPUT
  // =================================================
  // Always validate data before processing
  // Never trust client input!
  
  // Check if all required fields are provided
  if (!username || !email || !password) {
    return res.status(400).json({ 
      error: 'All fields are required (username, email, password)' 
    });
    // Status 400 = Bad Request (client sent invalid data)
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Please provide a valid email address' 
    });
  }

  // Password strength validation
  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'Password must be at least 6 characters long' 
    });
  }

  // Wrap database operations in try-catch
  // This handles any errors that might occur
  try {
    // =================================================
    // STEP 3: CHECK IF USER ALREADY EXISTS
    // =================================================
    // We need to ensure email and username are unique
    
    // Check if email is already registered
    const existingEmail = await User.findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ 
        error: 'Email is already registered' 
      });
      // Status 409 = Conflict (resource already exists)
    }

    // Check if username is already taken
    const existingUsername = await User.findUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ 
        error: 'Username is already taken' 
      });
    }

    // =================================================
    // STEP 4: HASH THE PASSWORD
    // =================================================
    // NEVER store passwords in plain text!
    // bcrypt creates a one-way hash (can't be reversed)
    
    // What is SALT_ROUNDS?
    // It's the cost factor for hashing
    // Higher number = more secure but slower
    // 10 is a good balance for most applications
    const SALT_ROUNDS = 10;
    
    // bcrypt.hash() does two things:
    // 1. Generates a random "salt" (adds randomness)
    // 2. Hashes the password + salt
    // Result: Even identical passwords have different hashes!
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Example:
    // Plain password: "myPassword123"
    // Hashed password: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
    // Even if someone gets the hash, they can't reverse it to get original password

    // =================================================
    // STEP 5: CREATE USER IN DATABASE
    // =================================================
    const newUser = await User.createUser(username, email, hashedPassword);

    // =================================================
    // STEP 6: SEND SUCCESS RESPONSE
    // =================================================
    // Status 201 = Created (new resource successfully created)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at
      }
      // Notice: We DON'T send back the password, even hashed!
    });

  } catch (error) {
    // =================================================
    // ERROR HANDLING
    // =================================================
    console.error('Registration error:', error);
    
    // Check for specific database errors
    // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (error.code === '23505') { 
      // 23505 = unique_violation (duplicate key)
      return res.status(409).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    // For any other error, return generic error message
    // Don't expose internal error details to client (security)
    res.status(500).json({ 
      error: 'Server error during registration. Please try again.' 
    });
    // Status 500 = Internal Server Error
  }
};

// =====================================================
// LOGIN USER CONTROLLER
// =====================================================
// Purpose: Authenticate user and provide JWT token
// HTTP Method: POST
// Route: /api/users/login

const loginUser = async (req, res) => {
  // =================================================
  // STEP 1: EXTRACT CREDENTIALS FROM REQUEST
  // =================================================
  const { email, password } = req.body;

  // =================================================
  // STEP 2: VALIDATE INPUT
  // =================================================
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Email and password are required' 
    });
  }

  try {
    // =================================================
    // STEP 3: FIND USER BY EMAIL
    // =================================================
    const user = await User.findUserByEmail(email);

    // Check if user exists
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
      // Status 401 = Unauthorized (authentication failed)
      // Note: We don't say "email not found" for security
      // Attackers shouldn't know if email exists in system
    }

    // =================================================
    // STEP 4: VERIFY PASSWORD
    // =================================================
    // bcrypt.compare() checks if plain password matches hashed password
    // It:
    // 1. Extracts the salt from the stored hash
    // 2. Hashes the provided password with same salt
    // 3. Compares the two hashes
    // Returns: true if match, false if not
    
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // =================================================
    // STEP 5: GENERATE JWT TOKEN
    // =================================================
    // JWT (JSON Web Token) is used for authentication
    // It's a string that contains encoded user information
    
    // Token Payload: Data we want to include in token
    // Keep it minimal - tokens are sent with every request!
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    // Sign the token with secret key
    // jwt.sign(payload, secret, options)
    const token = jwt.sign(
      payload,                           // Data to encode
      process.env.JWT_SECRET,            // Secret key (from .env)
      { expiresIn: '24h' }              // Token expires in 24 hours
    );

    // TOKEN STRUCTURE:
    // header.payload.signature
    // Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSJ9.abc123...

    // =================================================
    // STEP 6: SEND SUCCESS RESPONSE WITH TOKEN
    // =================================================
    res.status(200).json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    // Client will store this token (in localStorage or cookie)
    // and send it in Authorization header for protected routes

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error during login. Please try again.' 
    });
  }
};

// =====================================================
// GET ALL USERS CONTROLLER
// =====================================================
// Purpose: Retrieve list of all registered users
// HTTP Method: GET
// Route: /api/users (protected - requires authentication)

const getAllUsers = async (req, res) => {
  // =================================================
  // NOTE ABOUT req.user
  // =================================================
  // req.user is added by authentication middleware
  // It contains the decoded JWT payload (userId, email, username)
  // This proves the request is from an authenticated user
  
  try {
    // =================================================
    // STEP 1: FETCH ALL USERS FROM DATABASE
    // =================================================
    const users = await User.getAllUsers();

    // =================================================
    // STEP 2: SEND RESPONSE
    // =================================================
    res.status(200).json({
      message: 'Users retrieved successfully',
      count: users.length,              // Total number of users
      users: users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching users' 
    });
  }
};

// =====================================================
// EXPORT ALL CONTROLLERS
// =====================================================
// Export these functions so routes can use them
module.exports = {
  registerUser,
  loginUser,
  getAllUsers
};

// =====================================================
// HTTP STATUS CODES REFERENCE
// =====================================================
// 200 OK - Request succeeded
// 201 Created - New resource created successfully
// 400 Bad Request - Client sent invalid data
// 401 Unauthorized - Authentication failed
// 403 Forbidden - Authenticated but not authorized
// 404 Not Found - Resource doesn't exist
// 409 Conflict - Resource already exists
// 500 Internal Server Error - Something went wrong on server

// =====================================================
// AUTHENTICATION FLOW SUMMARY
// =====================================================
// 1. User registers → Password hashed → Stored in DB
// 2. User logs in → Password verified → JWT token generated
// 3. Client stores token → Sends with each request
// 4. Middleware verifies token → Allows access to protected routes
