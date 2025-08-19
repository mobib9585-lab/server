import jwt from "jsonwebtoken"
import Admin from "../../adminModel/AdminModel.js"

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '')

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')

        // Get admin details
        const admin = await Admin.findById(decoded.id).select('-password')

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid token. Admin not found."
            })
        }

        req.admin = admin
        next()
    } catch (error) {
        console.error('Token verification error:', error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token."
            })
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired."
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '')

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
            const admin = await Admin.findById(decoded.id).select('-password')

            if (admin) {
                req.admin = admin
            }
        }

        next()
    } catch (error) {
        // For optional auth, we don't return errors, just continue without auth
        next()
    }
}
