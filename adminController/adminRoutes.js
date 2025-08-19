// Admin routes
import express from "express"
import {
    registerAdmin,
    loginAdmin,
    getAdminProfile,
    updateAdminProfile,
    getAllAdmins,
    changeAdminPassword
} from "./adminController.js"
import {
    verifyAdminToken,
    requireSuperAdmin,
    requirePermission,
    requireAnyPermission
} from "./adminMiddleware.js"

const router = express.Router()

// Public routes (no authentication required)
router.post("/register", registerAdmin)
router.post("/login", loginAdmin)

// Protected routes (authentication required)
router.use(verifyAdminToken) // All routes below require authentication

// Profile routes
router.get("/profile", getAdminProfile)
router.put("/profile", updateAdminProfile)
router.put("/change-password", changeAdminPassword)

// Admin management routes (Super admin only)
router.get("/all", requireSuperAdmin, getAllAdmins)

// Dashboard stats route
router.get("/dashboard-stats", requireAnyPermission(['read', 'write']), async (req, res) => {
    try {
        // This is a placeholder for dashboard statistics
        // You can implement actual stats based on your needs
        const stats = {
            totalUsers: 0,
            totalAdmins: 0,
            activeUsers: 0,
            recentActivity: []
        }

        res.status(200).json({
            success: true,
            data: stats
        })
    } catch (error) {
        console.error('Dashboard stats error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
})

// Admin activity log route
router.get("/activity-log", requirePermission('read'), async (req, res) => {
    try {
        // This is a placeholder for activity logging
        // You can implement actual activity tracking based on your needs
        const activities = []

        res.status(200).json({
            success: true,
            data: {
                activities,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 0,
                    itemsPerPage: 10
                }
            }
        })
    } catch (error) {
        console.error('Activity log error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
})

// Test route to verify admin authentication
router.get("/test-auth", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Admin authentication successful",
        data: {
            admin: {
                id: req.admin.id,
                username: req.admin.username,
                email: req.admin.email,
                role: req.admin.role,
                permissions: req.admin.permissions
            }
        }
    })
})

export default router
