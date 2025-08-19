// Admin controller
import Admin from "../adminModel/AdminModel.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

// Helper function to generate JWT token
const generateToken = (adminId, role) => {
    return jwt.sign(
        {
            id: adminId,
            role: role,
            type: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    )
}

// Register admin
export const registerAdmin = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role} = req.body

        // Validation
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            })
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            $or: [{ email }, { username }]
        })

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email or username already exists"
            })
        }

        // Hash password
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Create new admin
        const newAdmin = new Admin({
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: role || 'admin',
           
        })

        await newAdmin.save()

        // Generate token
        const token = generateToken(newAdmin._id, newAdmin.role)

        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: {
                admin: {
                    id: newAdmin._id,
                    username: newAdmin.username,
                    email: newAdmin.email,
                    firstName: newAdmin.firstName,
                    lastName: newAdmin.lastName,
                    fullName: newAdmin.fullName,
                    role: newAdmin.role,
                    isActive: newAdmin.isActive
                },
                token
            }
        })
    } catch (error) {
        console.error('Register admin error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Login admin
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            })
        }

        // Find admin by email
        const admin = await Admin.findOne({ email })
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            })
        }

        // Check if admin is active
        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                message: "Account is deactivated. Please contact super admin."
            })
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            })
        }

        // Update last login
        admin.lastLogin = new Date()
        await admin.save()

        // Generate token
        const token = generateToken(admin._id, admin.role)

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                admin: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    fullName: admin.fullName,
                    role: admin.role,
                  
                    lastLogin: admin.lastLogin
                },
                token
            }
        })
    } catch (error) {
        console.error('Login admin error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Get admin profile
export const getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password')

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            })
        }

        res.status(200).json({
            success: true,
            data: {
                admin: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    fullName: admin.fullName,
               
                    isActive: admin.isActive,
                    lastLogin: admin.lastLogin,
                    profileImage: admin.profileImage,
                    createdAt: admin.createdAt,
                    updatedAt: admin.updatedAt
                }
            }
        })
    } catch (error) {
        console.error('Get admin profile error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Update admin profile
export const updateAdminProfile = async (req, res) => {
    try {
        const { firstName, lastName, username, profileImage } = req.body
        const adminId = req.admin.id

        // Check if username is already taken by another admin
        if (username) {
            const existingAdmin = await Admin.findOne({
                username,
                _id: { $ne: adminId }
            })

            if (existingAdmin) {
                return res.status(400).json({
                    success: false,
                    message: "Username is already taken"
                })
            }
        }

        const updateData = {}
        if (firstName) updateData.firstName = firstName
        if (lastName) updateData.lastName = lastName
        if (username) updateData.username = username
        if (profileImage) updateData.profileImage = profileImage

        const updatedAdmin = await Admin.findByIdAndUpdate(
            adminId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password')

        if (!updatedAdmin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                admin: updatedAdmin
            }
        })
    } catch (error) {
        console.error('Update admin profile error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Get all admins (Super admin only)
export const getAllAdmins = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, role, isActive } = req.query

        // Build filter object
        const filter = {}
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        }
        if (role) filter.role = role
        if (isActive !== undefined) filter.isActive = isActive === 'true'

        const skip = (page - 1) * limit
        const admins = await Admin.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName username')

        const total = await Admin.countDocuments(filter)

        res.status(200).json({
            success: true,
            data: {
                admins,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        })
    } catch (error) {
        console.error('Get all admins error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

// Change admin password
export const changeAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        const adminId = req.admin.id

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long"
            })
        }

        // Find admin
        const admin = await Admin.findById(adminId)
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            })
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password)
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            })
        }

        // Hash new password
        const saltRounds = 12
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

        // Update password
        admin.password = hashedNewPassword
        await admin.save()

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        })
    } catch (error) {
        console.error('Change admin password error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}