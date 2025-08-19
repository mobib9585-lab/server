import mongoose from "mongoose"

const ProjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        maxlength: 500
    },
    longDescription: {
        type: String,
        maxlength: 2000
    },
    category: {
        type: String,
        required: true,
        enum: ['Web App', 'Mobile App', 'E-commerce', 'API', 'Desktop App', 'Other']
    },
    technologies: [{
        type: String,
        required: true
    }],
    images: [{
        url: String,
        alt: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    liveUrl: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v)
            },
            message: 'Live URL must be a valid URL'
        }
    },
    githubUrl: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v)
            },
            message: 'GitHub URL must be a valid URL'
        }
    },
    featured: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    client: {
        type: String,
        trim: true
    },
    teamSize: {
        type: Number,
        min: 1
    },
    myRole: {
        type: String,
        trim: true
    },
    challenges: [{
        type: String
    }],
    solutions: [{
        type: String
    }],
    results: [{
        type: String
    }],
    sortOrder: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
})

// Indexes for better query performance
ProjectSchema.index({ category: 1 })
ProjectSchema.index({ featured: 1 })
ProjectSchema.index({ status: 1 })
ProjectSchema.index({ createdAt: -1 })
ProjectSchema.index({ sortOrder: 1 })

// Virtual for project duration
ProjectSchema.virtual('duration').get(function() {
    if (this.startDate && this.endDate) {
        const diffTime = Math.abs(this.endDate - this.startDate)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const diffMonths = Math.ceil(diffDays / 30)
        return diffMonths > 1 ? `${diffMonths} months` : `${diffDays} days`
    }
    return null
})

// Virtual for primary image
ProjectSchema.virtual('primaryImage').get(function() {
    const primary = this.images.find(img => img.isPrimary)
    return primary || this.images[0] || null
})

// Ensure virtual fields are serialized
ProjectSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v
        return ret
    }
})

// Pre-save middleware to ensure only one primary image
ProjectSchema.pre('save', function(next) {
    if (this.images && this.images.length > 0) {
        const primaryImages = this.images.filter(img => img.isPrimary)
        if (primaryImages.length > 1) {
            // Keep only the first primary image
            this.images.forEach((img, index) => {
                if (index > 0 && img.isPrimary) {
                    img.isPrimary = false
                }
            })
        } else if (primaryImages.length === 0) {
            // Set first image as primary if none is set
            this.images[0].isPrimary = true
        }
    }
    next()
})

const Project = mongoose.model('Project', ProjectSchema)

export default Project
