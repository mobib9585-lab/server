import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { registerUser, loginUser, getUserProfile } from "./src/userController/userController.js";

console.log('registerUser function:', typeof registerUser)
console.log('loginUser function:', typeof loginUser)
import adminRoutes from "./adminController/adminRoutes.js";
import portfolioRoutes from "./src/routes/portfolioRoutes.js";
import Contact from "./src/portfolioModel/ContactModel.js";
import { authenticateToken } from "./middleware/authMiddleware.js";

// Load environment variables first
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000
const DB = process.env.DB_Connection

// Middleware
app.use(helmet()) // Security headers
app.use(cors({
  origin: [
    'https://ammar-personal-portfolio.netlify.app',
    process.env.FRONTEND_URL || 'https://ammar-personal-portfolio.netlify.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000'
  ],
  credentials: true
}))
app.use(morgan('combined')) // Logging
app.use(express.json()) // Parse JSON bodies
app.use(express.urlencoded({ extended: true })) // Parse URL-encoded bodies

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Portfolio Backend API',
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    endpoints: {
      health: '/health',
      debug: '/debug',
      userRegister: '/api/v1/user/register',
      adminRoutes: '/api/v1/admin',
      adminLogin: '/api/v1/admin/login',
      adminRegister: '/api/v1/admin/register'
    }
  })
})

// Debug endpoint to check environment and database
app.get('/debug', async (req, res) => {
  try {
    const Admin = (await import('./adminModel/AdminModel.js')).default
    
    const adminCount = await Admin.countDocuments()
    const admins = await Admin.find({}, { password: 0 }).limit(5)
    
    res.json({
      status: 'Debug info',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        DB_CONNECTION_EXISTS: !!process.env.DB_Connection,
        PORT: process.env.PORT
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        adminCount,
        sampleAdmins: admins
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Simple admin creation endpoint for emergency use
app.post('/create-admin', async (req, res) => {
  try {
    const Admin = (await import('./adminModel/AdminModel.js')).default
    const bcrypt = (await import('bcrypt')).default
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ username: 'admin' }, { email: 'admin@portfolio.com' }] 
    })

    if (existingAdmin) {
      return res.json({
        success: false,
        message: 'Admin user already exists!',
        admin: {
          email: existingAdmin.email,
          username: existingAdmin.username,
          createdAt: existingAdmin.createdAt
        }
      })
    }

    // Hash the password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash('password', saltRounds)

    // Create admin user
    const admin = new Admin({
      username: 'admin',
      email: 'admin@portfolio.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true
    })

    await admin.save()

    res.json({
      success: true,
      message: 'Default admin user created successfully!',
      credentials: {
        email: 'admin@portfolio.com',
        username: 'admin',
        password: 'password'
      }
    })

  } catch (error) {
    console.error('Error creating admin user:', error)
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message
    })
  }
})
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  })
})

// Registration endpoint using a different path that should work
app.post('/health', async (req, res) => {
  console.log('=== HEALTH POST ENDPOINT HIT (REGISTRATION) ===')
  console.log('Request body:', req.body)

  try {
    const { firstName, lastName, username, email, password, role } = req.body

    // Validation
    if (!firstName || !lastName || !username || !email || !password) {
      console.log('Validation failed: missing fields')
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      })
    }

    // Import required modules
    const bcrypt = await import('bcrypt')
    const jwt = await import('jsonwebtoken')
    const User = (await import('./src/userModel/UserModel.js')).default

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists"
      })
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.default.hash(password, saltRounds)

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    })

    await newUser.save()
    console.log('User saved successfully:', newUser._id)

    // Generate token
    const token = jwt.default.sign(
      {
        id: newUser._id,
        role: newUser.role,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        admin: { // Use 'admin' key for frontend compatibility
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        },
        token
      }
    })
  } catch (error) {
    console.error('Registration error:', error)

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please choose a different ${field}.`
      })
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      })
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Working user registration endpoint
app.post('/api/v1/user/register-new', async (req, res) => {
  console.log('=== WORKING REGISTRATION ENDPOINT HIT ===')
  console.log('Request body:', req.body)

  try {
    const { firstName, lastName, username, email, password, role } = req.body

    // Validation
    if (!firstName || !lastName || !username || !email || !password) {
      console.log('Validation failed: missing fields')
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      })
    }

    // Import required modules
    const bcrypt = await import('bcrypt')
    const jwt = await import('jsonwebtoken')
    const User = (await import('./src/userModel/UserModel.js')).default

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists"
      })
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.default.hash(password, saltRounds)

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    })

    await newUser.save()
    console.log('User saved successfully:', newUser._id)

    // Generate token
    const token = jwt.default.sign(
      {
        id: newUser._id,
        role: newUser.role,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        admin: { // Use 'admin' key for frontend compatibility
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        },
        token
      }
    })
  } catch (error) {
    console.error('Registration error:', error)

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please choose a different ${field}.`
      })
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      })
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Test route
app.post("/api/v1/user/test", (req, res) => {
  console.log('TEST ROUTE HIT')
  res.json({ message: "Test route working", body: req.body })
})

// Simple test route with different path
app.post("/api/test-signup", (req, res) => {
  console.log('SIMPLE TEST ROUTE HIT')
  res.json({ message: "Simple test route working", body: req.body })
})

// New working registration endpoint
app.post("/api/v1/user/signup", async (req, res) => {
  console.log('=== NEW SIGNUP ENDPOINT HIT ===')
  console.log('Request body:', req.body)

  try {
    const { firstName, lastName, username, email, password, role } = req.body

    // Validation
    if (!firstName || !lastName || !username || !email || !password) {
      console.log('Validation failed: missing fields')
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      })
    }

    // Import User model
    const User = (await import('./src/userModel/UserModel.js')).default
    const bcrypt = (await import('bcrypt')).default
    const jwt = (await import('jsonwebtoken')).default

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists"
      })
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    })

    await newUser.save()

    // Generate token
    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        },
        token
      }
    })
  } catch (error) {
    console.error('Signup error:', error)

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please choose a different ${field}.`
      })
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      })
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Routes
app.post("/api/v1/user/register", registerUser)
app.post("/api/v1/user/login", loginUser)
app.get("/api/v1/user/profile", authenticateToken, getUserProfile)
app.use("/api/v1/admin", adminRoutes)
app.use("/api/v1/portfolio", portfolioRoutes)
// Contact form endpoint - saves to database and sends email
app.post("/api/v1/contact", async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message,
      phone,
      company,
      projectType,
      budget,
      timeline
    } = req.body

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required"
      })
    }

    // Get client info for tracking
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress
    const userAgent = req.get('User-Agent')

    // Create contact record in database
    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      phone: phone?.trim(),
      company: company?.trim(),
      projectType,
      budget,
      timeline,
      source: 'Website',
      status: 'new',
      priority: 'medium',
      ipAddress,
      userAgent
    }

    const contact = new Contact(contactData)
    await contact.save()

    // Send email notification to admin
    let emailSent = false
    if (process.env.SMTP_USER && process.env.ADMIN_EMAIL) {
      try {
        // Import nodemailer here
        const nodemailer = await import('nodemailer')

        // Create transporter
        const transporter = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        })

        const mailOptions = {
          from: process.env.SMTP_USER,
          to: process.env.ADMIN_EMAIL,
          subject: `New Contact Form: ${subject}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              ${projectType ? `<p><strong>Project Type:</strong> ${projectType}</p>` : ''}
              ${budget ? `<p><strong>Budget:</strong> ${budget}</p>` : ''}
              ${timeline ? `<p><strong>Timeline:</strong> ${timeline}</p>` : ''}
            </div>
            <div style="background: #fff; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
              <h3>Message:</h3>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            <hr>
            <p style="color: #666; font-size: 12px;">
              <strong>Contact ID:</strong> ${contact._id}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleString()}<br>
              <strong>IP Address:</strong> ${ipAddress}<br>
              <strong>Source:</strong> Website Contact Form
            </p>
          `
        }

        await transporter.sendMail(mailOptions)
        emailSent = true
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        // Don't fail the request if email fails, just log it
      }
    }

    res.status(201).json({
      success: true,
      message: "Message received successfully! Thank you for contacting us.",
      data: {
        contactId: contact._id,
        emailSent,
        status: contact.status
      }
    })

  } catch (error) {
    console.error('Contact form error:', error)

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to process your message. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get all contact messages (Admin only)
app.get("/api/v1/contact", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Build filter object
    const filter = {}
    if (status) filter.status = status
    if (priority) filter.priority = priority
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ]
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    const skip = (page - 1) * limit
    const contacts = await Contact.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-ipAddress -userAgent') // Hide sensitive data

    const total = await Contact.countDocuments(filter)
    const totalPages = Math.ceil(total / limit)

    // Get status counts for dashboard
    const statusCounts = await Contact.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])

    const priorityCounts = await Contact.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ])

    res.status(200).json({
      success: true,
      data: {
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        stats: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {}),
          priorityCounts: priorityCounts.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {}),
          totalContacts: total
        }
      }
    })

  } catch (error) {
    console.error('Get contacts error:', error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contacts",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

const DB_connection= mongoose.connect(DB).then(() => {
    console.log("DB Connected")
}).catch((err) => {
    console.log(err,"errorror")
})


    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })

