// =====================================================
// USER CONTROLLER - BUSINESS LOGIC LAYER
// =====================================================
//
// This file handles user registration, login, and related
// business logic. It communicates with the UserModel layer,
// which abstracts all database operations.
// =====================================================

// =====================================================
// IMPORTS
// =====================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { UserModel } = require('../models/userModel'); // <-- Correct import

// =====================================================
// REGISTER USER CONTROLLER
// =====================================================
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  // ==============================
  // 1️⃣ VALIDATE INPUT
  // ==============================
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required (username, email, password)' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // ==============================
    // 2️⃣ CHECK FOR EXISTING USER
    // ==============================
    const existingEmail = await UserModel.findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const existingUsername = await UserModel.findUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // ==============================
    // 3️⃣ HASH PASSWORD
    // ==============================
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ==============================
    // 4️⃣ CREATE USER
    // ==============================
    const newUser = await UserModel.createUser(username, email, hashedPassword);

    // ==============================
    // 5️⃣ SEND RESPONSE
    // ==============================
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Registration error:', error);

    if (error.code === '23505') {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    res.status(500).json({ error: 'Server error during registration. Please try again.' });
  }
};

// =====================================================
// LOGIN USER CONTROLLER
// =====================================================
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // ==============================
  // 1️⃣ VALIDATE INPUT
  // ==============================
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // ==============================
    // 2️⃣ FIND USER BY EMAIL
    // ==============================
    const user = await UserModel.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // ==============================
    // 3️⃣ VERIFY PASSWORD
    // ==============================
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // ==============================
    // 4️⃣ GENERATE JWT TOKEN
    // ==============================
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // ==============================
    // 5️⃣ SEND RESPONSE
    // ==============================
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
};

// =====================================================
// GET ALL USERS CONTROLLER (OPTIONAL)
// =====================================================
const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ Fetch users error:', error);
    res.status(500).json({ error: 'Error retrieving users. Please try again later.' });
  }
};

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
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
