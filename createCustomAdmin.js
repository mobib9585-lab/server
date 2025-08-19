import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import readline from 'readline';
import Admin from './adminModel/AdminModel.js';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask questions
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Function to ask for password (hidden input)
const askPassword = (question) => {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
};

const createCustomAdmin = async () => {
  try {
    console.log('🔧 Custom Admin Account Creator');
    console.log('================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.DB_Connection);
    console.log('✅ Connected to MongoDB\n');

    // Get admin details from user
    const firstName = await askQuestion('Enter first name: ');
    const lastName = await askQuestion('Enter last name: ');
    const email = await askQuestion('Enter email address: ');
    const username = await askQuestion('Enter username: ');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingAdmin) {
      console.log('❌ Admin with this email or username already exists!');
      console.log('Existing admin details:');
      console.log('Email:', existingAdmin.email);
      console.log('Username:', existingAdmin.username);
      process.exit(1);
    }

    // Get password
    const password = await askPassword('Enter password: ');
    const confirmPassword = await askPassword('Confirm password: ');

    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      process.exit(1);
    }

    if (password.length < 6) {
      console.log('❌ Password must be at least 6 characters long');
      process.exit(1);
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('\n✅ Admin user created successfully!');
    console.log('================================');
    console.log('👤 Name:', `${firstName} ${lastName}`);
    console.log('📧 Email:', email);
    console.log('🔑 Username:', username);
    console.log('🔐 Password:', '****** (hidden for security)');
    console.log('');
    console.log('🎯 You can now login to the admin dashboard with these credentials.');
    console.log('🌐 Admin Dashboard: http://localhost:5174/admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    // Close the database connection and readline interface
    await mongoose.connection.close();
    rl.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run the script
createCustomAdmin();
