// Load dotenv FIRST before anything else
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    // Get MongoDB URI from environment
    const mongoURI = process.env.MONGODB_URI;
    
    console.log('=================================');
    console.log('Database Connection Debug Info:');
    console.log('MONGODB_URI:', mongoURI);
    console.log('Current NODE_ENV:', process.env.NODE_ENV);
    console.log('Current directory:', process.cwd());
    console.log('__dirname:', __dirname);
    console.log('=================================');
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is not defined in .env file');
      console.error('Please check if .env file exists in:', path.join(__dirname, '..'));
      process.exit(1);
    }
    
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected Successfully');
    
    // Create admin user if not exists
    await createAdminUser();
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    const User = require('../models/User');
    
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await User.create({
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      console.log('✅ Admin user created successfully');
      console.log('📧 Email:', process.env.ADMIN_EMAIL);
      console.log('🔑 Password:', process.env.ADMIN_PASSWORD);
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

module.exports = connectDB;