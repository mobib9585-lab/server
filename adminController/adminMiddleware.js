// Admin middleware for authentication and authorization
import jwt from "jsonwebtoken"
import Admin from "../adminModel/AdminModel.js"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

// Verify admin token
export const verifyAdminToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.header('x-auth-token')

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            })
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET)
        
        // Check if token is for admin
        if (decoded.type !== 'admin') {
            return res.status(401).json({
                success: false,
                message: "Access denied. Invalid token type."
            })
        }

        // Find admin
        const admin = await Admin.findById(decoded.id).select('-password')
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Admin not found."
            })
        }

        // Check if admin is active
        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Account is deactivated."
            })
        }

        // Add admin to request object
        req.admin = {
            id: admin._id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions
        }

        next()
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Access denied. Invalid token."
            })
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Access denied. Token expired."
            })
        }

        console.error('Admin token verification error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Check if admin is super admin
export const requireSuperAdmin = (req, res, next) => {
    if (req.admin.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: "Access denied. Super admin privileges required."
        })
    }
    next()
}

// Check admin permissions
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. '${permission}' permission required.`
            })
        }
        next()
    }
}

// Check if admin has any of the specified permissions
export const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        const hasPermission = permissions.some(permission => 
            req.admin.permissions.includes(permission)
        )
        
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: `Access denied. One of these permissions required: ${permissions.join(', ')}`
            })
        }
        next()
    }
}

// Optional admin authentication (doesn't fail if no token)
export const optionalAdminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.header('x-auth-token')

        if (!token) {
            return next()
        }

        const decoded = jwt.verify(token, JWT_SECRET)
        
        if (decoded.type === 'admin') {
            const admin = await Admin.findById(decoded.id).select('-password')
            if (admin && admin.isActive) {
                req.admin = {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role,
                    permissions: admin.permissions
                }
            }
        }

        next()
    } catch (error) {
        // Continue without authentication if token is invalid
        next()
    }
}
