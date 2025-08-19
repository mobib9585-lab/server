import mongoose from "mongoose"

const SkillSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
        unique: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Frontend Development',
            'Backend Development', 
            'Mobile Development',
            'Database',
            'Cloud & DevOps',
            'Design',
            'Testing',
            'Tools & Others'
        ]
    },
    proficiency: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    yearsOfExperience: {
        type: Number,
        min: 0,
        max: 50
    },
    description: {
        type: String,
        maxlength: 500
    },
    icon: {
        type: String, // URL or icon name
        trim: true
    },
    color: {
        type: String,
        default: '#3b82f6',
        validate: {
            validator: function(v) {
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v)
            },
            message: 'Color must be a valid hex color'
        }
    },
    featured: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'learning', 'inactive'],
        default: 'active'
    },
    certifications: [{
        name: String,
        issuer: String,
        date: Date,
        url: String
    }],
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
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
SkillSchema.index({ category: 1 })
SkillSchema.index({ featured: 1 })
SkillSchema.index({ status: 1 })
SkillSchema.index({ proficiency: -1 })
SkillSchema.index({ sortOrder: 1 })

// Virtual for proficiency level
SkillSchema.virtual('proficiencyLevel').get(function() {
    if (this.proficiency >= 90) return 'Expert'
    if (this.proficiency >= 75) return 'Advanced'
    if (this.proficiency >= 50) return 'Intermediate'
    if (this.proficiency >= 25) return 'Beginner'
    return 'Learning'
})

// Ensure virtual fields are serialized
SkillSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v
        return ret
    }
})

const Skill = mongoose.model('Skill', SkillSchema)

export default Skill
