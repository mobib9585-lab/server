import express from "express"
import {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getAdminProjects
} from "../portfolioController/projectController.js"
import {
    submitContactForm,
    getMessages,
    getMessage,
    updateMessageStatus,
    deleteMessage,
    markAsRead,
    testEmail
} from "../portfolioController/contactController.js"
import { verifyToken } from "../middleware/authMiddleware.js"

const router = express.Router()

// Public routes
// Projects
router.get('/projects', getProjects)
router.get('/projects/:id', getProject)

// Contact form
router.post('/contact', submitContactForm)

// Admin routes (protected)
// Projects management
router.get('/admin/projects', verifyToken, getAdminProjects)
router.post('/admin/projects', verifyToken, createProject)
router.put('/admin/projects/:id', verifyToken, updateProject)
router.delete('/admin/projects/:id', verifyToken, deleteProject)

// Messages management
router.get('/admin/messages', verifyToken, getMessages)
router.get('/admin/messages/:id', verifyToken, getMessage)
router.patch('/admin/messages/:id', verifyToken, updateMessageStatus)
router.patch('/admin/messages/:id/read', verifyToken, markAsRead)
router.delete('/admin/messages/:id', verifyToken, deleteMessage)

// Email testing
router.post('/admin/test-email', verifyToken, testEmail)

export default router
