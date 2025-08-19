import Contact from "../portfolioModel/ContactModel.js"
import nodemailer from "nodemailer"

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
}

// Submit contact form (public endpoint)
export const submitContactForm = async (req, res) => {
    try {
        const { name, email, subject, message, phone, company, projectType, budget, timeline } = req.body

        // Get client info
        const ipAddress = req.ip || req.connection.remoteAddress
        const userAgent = req.get('User-Agent')

        // Create contact entry
        const contact = new Contact({
            name,
            email,
            subject,
            message,
            phone,
            company,
            projectType,
            budget,
            timeline,
            ipAddress,
            userAgent
        })

        await contact.save()

        // Send notification email to admin (if configured)
        if (process.env.SMTP_USER && process.env.ADMIN_EMAIL) {
            try {
                const transporter = createTransporter()

                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: process.env.ADMIN_EMAIL,
                    subject: `New Contact Form Submission: ${subject}`,
                    html: `
                        <h2>New Contact Form Submission</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
                        <p><strong>Project Type:</strong> ${projectType || 'Not specified'}</p>
                        <p><strong>Budget:</strong> ${budget || 'Not specified'}</p>
                        <p><strong>Timeline:</strong> ${timeline || 'Not specified'}</p>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p><strong>Message:</strong></p>
                        <p>${message.replace(/\n/g, '<br>')}</p>
                        <hr>
                        <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
                    `
                }

                await transporter.sendMail(mailOptions)
            } catch (emailError) {
                console.error('Email notification error:', emailError)
                // Don't fail the request if email fails
            }
        }

        // Send auto-reply to user (if configured)
        if (process.env.SMTP_USER && process.env.AUTO_REPLY_ENABLED === 'true') {
            try {
                const transporter = createTransporter()

                const autoReplyOptions = {
                    from: process.env.SMTP_USER,
                    to: email,
                    subject: 'Thank you for your message!',
                    html: `
                        <h2>Thank you for reaching out!</h2>
                        <p>Hi ${name},</p>
                        <p>Thank you for your message. I've received your inquiry and will get back to you within 24 hours.</p>
                        <p>Here's a copy of your message:</p>
                        <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0;">
                            <p><strong>Subject:</strong> ${subject}</p>
                            <p><strong>Message:</strong> ${message}</p>
                        </blockquote>
                        <p>Best regards,<br>John Doe</p>
                        <hr>
                        <p><small>This is an automated response. Please do not reply to this email.</small></p>
                    `
                }

                await transporter.sendMail(autoReplyOptions)
            } catch (emailError) {
                console.error('Auto-reply error:', emailError)
                // Don't fail the request if email fails
            }
        }

        res.status(201).json({
            success: true,
            message: "Thank you for your message! I'll get back to you soon."
        })
    } catch (error) {
        console.error('Submit contact form error:', error)

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: Object.values(error.errors).map(err => err.message)
            })
        }

        res.status(500).json({
            success: false,
            message: "Sorry, there was an error sending your message. Please try again."
        })
    }
}

// Get all messages (admin only)
export const getMessages = async (req, res) => {
    try {
        const {
            status,
            priority,
            projectType,
            limit = 10,
            page = 1,
            sort = '-createdAt',
            search
        } = req.query

        // Build filter object
        const filter = {}
        if (status && status !== 'all') {
            filter.status = status
        }
        if (priority && priority !== 'all') {
            filter.priority = priority
        }
        if (projectType && projectType !== 'all') {
            filter.projectType = projectType
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } }
            ]
        }

        // Calculate pagination
        const skip = (page - 1) * limit
        const limitNum = parseInt(limit)

        // Get messages with pagination
        const messages = await Contact.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)

        // Get total count for pagination
        const total = await Contact.countDocuments(filter)

        // Get stats
        const stats = {
            total: await Contact.countDocuments(),
            new: await Contact.countDocuments({ status: 'new' }),
            read: await Contact.countDocuments({ status: 'read' }),
            replied: await Contact.countDocuments({ status: 'replied' }),
            archived: await Contact.countDocuments({ status: 'archived' })
        }

        res.status(200).json({
            success: true,
            data: {
                messages,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limitNum),
                    total,
                    limit: limitNum
                },
                stats
            }
        })
    } catch (error) {
        console.error('Get messages error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Get single message (admin only)
export const getMessage = async (req, res) => {
    try {
        const { id } = req.params

        const message = await Contact.findById(id)

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            })
        }

        res.status(200).json({
            success: true,
            data: message
        })
    } catch (error) {
        console.error('Get message error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Update message status (admin only)
export const updateMessageStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status, priority, notes, tags } = req.body

        const updateData = {}
        if (status) updateData.status = status
        if (priority) updateData.priority = priority
        if (notes !== undefined) updateData.notes = notes
        if (tags) updateData.tags = tags

        const message = await Contact.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Message updated successfully",
            data: message
        })
    } catch (error) {
        console.error('Update message error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Delete message (admin only)
export const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params

        const message = await Contact.findByIdAndDelete(id)

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Message deleted successfully"
        })
    } catch (error) {
        console.error('Delete message error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Mark message as read (admin only)
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params

        const message = await Contact.findByIdAndUpdate(
            id,
            { status: 'read' },
            { new: true }
        )

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Message marked as read",
            data: message
        })
    } catch (error) {
        console.error('Mark as read error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Test email configuration (admin only)
export const testEmail = async (req, res) => {
    try {
        if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
            return res.status(400).json({
                success: false,
                message: "Email configuration is missing. Please set SMTP_USER and ADMIN_EMAIL in .env file."
            })
        }

        const transporter = createTransporter()

        const testMailOptions = {
            from: process.env.SMTP_USER,
            to: process.env.ADMIN_EMAIL,
            subject: 'Portfolio Email Test - Configuration Working!',
            html: `
                <h2>🎉 Email Configuration Test Successful!</h2>
                <p>Congratulations! Your email configuration is working correctly.</p>
                <p><strong>SMTP Settings:</strong></p>
                <ul>
                    <li><strong>Host:</strong> ${process.env.SMTP_HOST}</li>
                    <li><strong>Port:</strong> ${process.env.SMTP_PORT}</li>
                    <li><strong>User:</strong> ${process.env.SMTP_USER}</li>
                    <li><strong>Admin Email:</strong> ${process.env.ADMIN_EMAIL}</li>
                </ul>
                <p>You will now receive contact form submissions at this email address.</p>
                <hr>
                <p><small>Test sent at: ${new Date().toLocaleString()}</small></p>
            `
        }

        await transporter.sendMail(testMailOptions)

        res.status(200).json({
            success: true,
            message: "Test email sent successfully! Check your inbox."
        })
    } catch (error) {
        console.error('Test email error:', error)
        res.status(500).json({
            success: false,
            message: "Failed to send test email. Please check your email configuration.",
            error: error.message
        })
    }
}
