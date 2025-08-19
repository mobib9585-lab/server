// Generic authentication middleware for both users and admins
import jwt from "jsonwebtoken"
import Admin from "../adminModel/AdminModel.js"
import User from "../src/userModel/UserModel.js"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

// Generic token authentication (works for both users and admins)
export const authenticateToken = async (req, res, next) => {
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
        
        let user = null
        
        // Check if it's an admin token
        if (decoded.type === 'admin') {
            user = await Admin.findById(decoded.id).select('-password')
            if (user && user.isActive) {
                req.user = {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    type: 'admin',
                    permissions: user.permissions
                }
                req.admin = req.user // For backward compatibility
            }
        } 
        // Check if it's a user token
        else if (decoded.type === 'user') {
            user = await User.findById(decoded.id).select('-password')
            if (user && user.isActive) {
                req.user = {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    type: 'user',
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Access denied. User not found or inactive."
            })
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

        console.error('Token verification error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Require admin role
export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required."
        })
    }
    next()
}

// Require specific role
export const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                success: false,
                message: `Access denied. '${role}' role required.`
            })
        }
        next()
    }
}

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.header('x-auth-token')

        if (!token) {
            return next()
        }

        const decoded = jwt.verify(token, JWT_SECRET)
        
        let user = null
        
        if (decoded.type === 'admin') {
            user = await Admin.findById(decoded.id).select('-password')
            if (user && user.isActive) {
                req.user = {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    type: 'admin',
                    permissions: user.permissions
                }
            }
        } else if (decoded.type === 'user') {
            user = await User.findById(decoded.id).select('-password')
            if (user && user.isActive) {
                req.user = {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    type: 'user',
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            }
        }

        next()
    } catch (error) {
        // Continue without authentication if token is invalid
        next()
    }
}

export default { authenticateToken, requireAdmin, requireRole, optionalAuth }
