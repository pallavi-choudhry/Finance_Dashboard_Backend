// Backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const adminRoutes = require('./routes/adminRoutes');
const transactionRoutes = require("./routes/transactionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const User = require('./models/User');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5001;
const SUPER_ADMIN_EMAILS = (
  process.env.SUPER_ADMIN_EMAILS || ''
)
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const isSuperAdminEmail = (email = '') => SUPER_ADMIN_EMAILS.includes(normalizeEmail(email));

// ============= MONGODB CONNECTION WITH BETTER ERROR HANDLING =============
// Use MongoDB Atlas or local MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finance_app';

console.log('🔌 Attempting to connect to MongoDB...');
console.log('📡 Connection URL:', MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide password if present

mongoose.connect(MONGO_URI)
  
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database Name:', mongoose.connection.name);
  console.log('📍 Host:', mongoose.connection.host);
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.error('\n💡 Troubleshooting Tips:');
  console.error('   1. Make sure MongoDB is installed and running');
  console.error('   2. Run "net start MongoDB" as Administrator (Windows)');
  console.error('   3. Or use MongoDB Atlas cloud database');
  console.error('   4. Check your .env file has correct MONGO_URI');
  console.error('\n⚠️  Server will continue but database features will not work!\n');
});

// Handle connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

// ============= MIDDLEWARE =============
const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://recordfinancemanage.netlify.app',
];
const extraCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedCorsOrigins = [...new Set([...defaultCorsOrigins, ...extraCorsOrigins])];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedCorsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.get('/', (req, res) => {
  res.json({
    message: 'Backend is running 🚀',
    live: {
      health: '/api/test',
      dbStatus: '/api/db-status',
    },
    hint: 'Set CORS_ORIGINS on Render to your Netlify URL (https://recordfinancemanage.netlify.app/login)',
  });
});

// Secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-2024-finance-app';

// ============= AUTH ROUTES =============

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 Register request:', req.body);
  
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database not connected. Please check MongoDB server.' 
    });
  }
  
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide name, email and password' 
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: isSuperAdminEmail(normalizedEmail) ? 'admin' : (role || 'viewer'),
      status: 'active'
    });
    
    console.log('✅ User created in database:', { id: newUser._id, email: newUser.email });
    
    // Create token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login request received for email:', req.body.email);
  
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database not connected. Please check MongoDB server.' 
    });
  }
  
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user in database
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    console.log('✅ Login successful for:', email);
    
    // Enforce admin role for configured super-admin emails
    if (isSuperAdminEmail(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Create token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get current user endpoint
app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Check database status endpoint
app.get('/api/db-status', (req, res) => {
  const status = {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'Not connected',
    database: mongoose.connection.name || 'Not connected'
  };
  
  res.json(status);
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: {
      connected: mongoose.connection.readyState === 1,
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
    },
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      dashboard: 'GET /api/dashboard',
      dbStatus: 'GET /api/db-status'
    }
  });
});

// ============= SEED DEMO USERS =============
const seedDemoUsers = async () => {
  // Only seed if database is connected
  if (mongoose.connection.readyState !== 1) {
    console.log('⚠️  Database not connected, skipping demo user seeding');
    return;
  }
  
  try {
    // Check if demo users exist
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create([
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: await bcrypt.hash('Admin123!', 10),
          role: 'admin'
        },
        {
          name: 'Viewer User',
          email: 'viewer@example.com',
          password: await bcrypt.hash('viewer123', 10),
          role: 'viewer'
        },
        {
          name: 'Analyst User',
          email: 'analyst@example.com',
          password: await bcrypt.hash('analyst123', 10),
          role: 'analyst'
        }
      ]);
      console.log('✅ Demo users created in database');
    } else {
      console.log('✅ Demo users already exist in database');
    }
  } catch (error) {
    console.error('Error seeding demo users:', error);
  }
};

const promoteSuperAdmins = async () => {
  if (mongoose.connection.readyState !== 1) return;
  if (!SUPER_ADMIN_EMAILS.length) return;

  try {
    const result = await User.updateMany(
      { email: { $in: SUPER_ADMIN_EMAILS } },
      { $set: { role: 'admin', status: 'active' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Promoted ${result.modifiedCount} configured super-admin user(s)`);
    }
  } catch (error) {
    console.error('Error promoting super-admin users:', error.message);
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`\n=================================`);
  console.log(`🚀 Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`=================================`);
  
  // Wait a bit for database connection to establish
  setTimeout(async () => {
    await seedDemoUsers();
    await promoteSuperAdmins();
  }, 2000);
  
  console.log(`\n📝 Available Endpoints:`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/test`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/db-status`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   ✅ POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`   ✅ GET  http://localhost:${PORT}/api/dashboard`);
  
  if (mongoose.connection.readyState === 1) {
    console.log(`\n💾 Database: Connected to ${mongoose.connection.name}`);
    console.log(`\n🔐 Demo Credentials (automatically added to database):`);
    console.log(`   Admin:   admin@example.com / Admin123!`);
    console.log(`   Viewer:  viewer@example.com / viewer123`);
    console.log(`   Analyst: analyst@example.com / analyst123`);
  } else {
    console.log(`\n⚠️  Database: NOT CONNECTED`);
    console.log(`\n💡 To fix database connection:`);
    console.log(`   1. Install MongoDB from https://www.mongodb.com/try/download/community`);
    console.log(`   2. Start MongoDB service: net start MongoDB`);
    console.log(`   3. Or use MongoDB Atlas cloud (easier!)`);
    console.log(`   4. Update MONGO_URI in .env file`);
  }
  console.log(`\n=================================\n`);
});