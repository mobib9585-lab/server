console.log('=== NEW USER CONTROLLER LOADED ===')

import User from "../userModel/UserModel.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

// Helper function to generate JWT token
const generateToken = (userId, role = 'user') => {
    return jwt.sign(
        {
            id: userId,
            role: role,
            type: 'user'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    )
}

// Register user
export const registerUser = async (req, res) => {
    console.log('=== USER REGISTRATION STARTED ===')
    console.log('Request body:', req.body)

    try {
        const { firstName, lastName, username, email, password, role } = req.body

        // Validation
        if (!firstName || !lastName || !username || !email || !password) {
            console.log('Validation failed: missing required fields')
            return res.status(400).json({
                success: false,
                message: "All fields (firstName, lastName, username, email, password) are required"
            })
        }

        // Additional validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            })
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters long"
            })
        }

        // Check if user already exists
        console.log('Checking for existing user...')
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        })

        if (existingUser) {
            console.log('User already exists:', existingUser.email, existingUser.username)
            const field = existingUser.email === email ? 'email' : 'username'
            return res.status(400).json({
                success: false,
                message: `User with this ${field} already exists`
            })
        }

        // Hash password
        console.log('Hashing password...')
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Create new user
        console.log('Creating new user...')
        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: role || 'user'
        })

        // Save user to database
        console.log('Saving user to database...')
        const savedUser = await newUser.save()
        console.log('User saved successfully with ID:', savedUser._id)

        // Generate token
        console.log('Generating JWT token...')
        const token = generateToken(savedUser._id, savedUser.role)

        // Return success response
        console.log('Registration completed successfully')
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                admin: { // Using 'admin' key for frontend compatibility
                    id: savedUser._id,
                    firstName: savedUser.firstName,
                    lastName: savedUser.lastName,
                    username: savedUser.username,
                    email: savedUser.email,
                    role: savedUser.role,
                    fullName: savedUser.fullName,
                    createdAt: savedUser.createdAt
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

        // Handle other errors
        res.status(500).json({
            success: false,
            message: "Internal server error during registration",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Login user
export const loginUser = async (req, res) => {
    console.log('=== USER LOGIN STARTED ===')
    console.log('Request body:', req.body)

    try {
        const { email, password } = req.body

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            })
        }

        // Find user by email
        console.log('Finding user by email...')
        const user = await User.findOne({ email: email.toLowerCase() })
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Account is deactivated. Please contact support."
            })
        }

        // Verify password
        console.log('Verifying password...')
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            })
        }

        // Update last login
        user.lastLogin = new Date()
        await user.save()

        // Generate token
        console.log('Generating JWT token...')
        const token = generateToken(user._id, user.role)

        console.log('Login completed successfully')
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                admin: { // Using 'admin' key for frontend compatibility
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName,
                    lastLogin: user.lastLogin
                },
                token
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error during login",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        res.status(200).json({
            success: true,
            data: {
                admin: { // Using 'admin' key for frontend compatibility
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName,
                    bio: user.bio,
                    phone: user.phone,
                    profilePicture: user.profilePicture,
                    socialLinks: user.socialLinks,
                    preferences: user.preferences,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    lastLogin: user.lastLogin
                }
            }
        })
    } catch (error) {
        console.error('Get user profile error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

export default { registerUser, loginUser, getUserProfile }
