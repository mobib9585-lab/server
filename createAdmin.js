import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import Admin from './adminModel/AdminModel.js';

// Load environment variables
dotenv.config();

const createDefaultAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_Connection);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ username: 'admin' }, { email: 'admin@portfolio.com' }] 
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('password', saltRounds);

    // Create admin user
    const admin = new Admin({
      username: 'admin',
      email: 'admin@portfolio.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('✅ Default admin user created successfully!');
    console.log('📧 Email: admin@portfolio.com');
    console.log('👤 Username: admin');
    console.log('🔑 Password: password');
    console.log('');
    console.log('You can now login to the admin dashboard with these credentials.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the script
createDefaultAdmin();
