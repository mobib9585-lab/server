import mongoose from "mongoose"

const ContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        maxlength: 2000
    },
    phone: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v)
            },
            message: 'Please enter a valid phone number'
        }
    },
    company: {
        type: String,
        trim: true,
        maxlength: 100
    },
    projectType: {
        type: String,
        enum: ['Web Development', 'Mobile App', 'E-commerce', 'API Development', 'Consulting', 'Other']
    },
    budget: {
        type: String,
        enum: ['< $5,000', '$5,000 - $15,000', '$15,000 - $50,000', '$50,000+', 'Not specified']
    },
    timeline: {
        type: String,
        enum: ['ASAP', '1-3 months', '3-6 months', '6+ months', 'Flexible']
    },
    source: {
        type: String,
        enum: ['Website', 'LinkedIn', 'GitHub', 'Referral', 'Google', 'Other'],
        default: 'Website'
    },
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'archived', 'spam'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    tags: [{
        type: String,
        trim: true
    }],
    notes: {
        type: String,
        maxlength: 1000
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    readAt: {
        type: Date
    },
    repliedAt: {
        type: Date
    },
    archivedAt: {
        type: Date
    }
}, {
    timestamps: true
})

// Indexes for better query performance
ContactSchema.index({ email: 1 })
ContactSchema.index({ status: 1 })
ContactSchema.index({ priority: 1 })
ContactSchema.index({ createdAt: -1 })
ContactSchema.index({ projectType: 1 })
ContactSchema.index({ source: 1 })

// Virtual for full contact info
ContactSchema.virtual('fullContact').get(function() {
    let contact = `${this.name} <${this.email}>`
    if (this.phone) {
        contact += ` | ${this.phone}`
    }
    if (this.company) {
        contact += ` | ${this.company}`
    }
    return contact
})

// Virtual for time since submission
ContactSchema.virtual('timeAgo').get(function() {
    const now = new Date()
    const diffTime = Math.abs(now - this.createdAt)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.ceil(diffTime / (1000 * 60))
    
    if (diffDays > 1) {
        return `${diffDays} days ago`
    } else if (diffHours > 1) {
        return `${diffHours} hours ago`
    } else if (diffMinutes > 1) {
        return `${diffMinutes} minutes ago`
    } else {
        return 'Just now'
    }
})

// Virtual for response time (if replied)
ContactSchema.virtual('responseTime').get(function() {
    if (!this.repliedAt) return null
    
    const diffTime = Math.abs(this.repliedAt - this.createdAt)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
    
    if (diffDays > 1) {
        return `${diffDays} days`
    } else if (diffHours > 1) {
        return `${diffHours} hours`
    } else {
        return 'Same day'
    }
})

// Ensure virtual fields are serialized
ContactSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v
        delete ret.ipAddress
        delete ret.userAgent
        return ret
    }
})

// Pre-save middleware to update timestamps
ContactSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'read' && !this.readAt) {
            this.readAt = new Date()
        } else if (this.status === 'replied' && !this.repliedAt) {
            this.repliedAt = new Date()
        } else if (this.status === 'archived' && !this.archivedAt) {
            this.archivedAt = new Date()
        }
    }
    next()
})

const Contact = mongoose.model('Contact', ContactSchema)

export default Contact
