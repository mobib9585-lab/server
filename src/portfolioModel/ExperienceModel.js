import mongoose from "mongoose"

const ExperienceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    company: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    location: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    employmentType: {
        type: String,
        required: true,
        enum: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship']
    },
    workType: {
        type: String,
        enum: ['On-site', 'Remote', 'Hybrid'],
        default: 'On-site'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    current: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    achievements: [{
        type: String,
        maxlength: 300
    }],
    responsibilities: [{
        type: String,
        maxlength: 300
    }],
    technologies: [{
        type: String,
        required: true
    }],
    skills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill'
    }],
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    companyLogo: {
        type: String // URL to company logo
    },
    companyWebsite: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v)
            },
            message: 'Company website must be a valid URL'
        }
    },
    salary: {
        amount: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        period: {
            type: String,
            enum: ['hourly', 'monthly', 'yearly'],
            default: 'yearly'
        }
    },
    teamSize: {
        type: Number,
        min: 1
    },
    reportingTo: {
        type: String,
        trim: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    sortOrder: {
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
ExperienceSchema.index({ startDate: -1 })
ExperienceSchema.index({ endDate: -1 })
ExperienceSchema.index({ current: 1 })
ExperienceSchema.index({ featured: 1 })
ExperienceSchema.index({ sortOrder: 1 })

// Virtual for duration
ExperienceSchema.virtual('duration').get(function() {
    const start = this.startDate
    const end = this.endDate || new Date()
    
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffMonths = Math.ceil(diffDays / 30)
    const years = Math.floor(diffMonths / 12)
    const months = diffMonths % 12
    
    if (years > 0) {
        return months > 0 ? `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''}`
    }
    return `${months} month${months > 1 ? 's' : ''}`
})

// Virtual for period display
ExperienceSchema.virtual('period').get(function() {
    const startMonth = this.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const endMonth = this.current ? 'Present' : this.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `${startMonth} - ${endMonth}`
})

// Virtual for total experience in months
ExperienceSchema.virtual('totalMonths').get(function() {
    const start = this.startDate
    const end = this.endDate || new Date()
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.ceil(diffDays / 30)
})

// Ensure virtual fields are serialized
ExperienceSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v
        return ret
    }
})

// Pre-save middleware to handle current position
ExperienceSchema.pre('save', function(next) {
    if (this.current) {
        this.endDate = null
    }
    next()
})

const Experience = mongoose.model('Experience', ExperienceSchema)

export default Experience
