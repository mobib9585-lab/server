import mongoose from "mongoose"

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    permissions: {
        type: [String],
        default: ['read', 'write', 'delete']
    },
    profileImage: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    }
}, {
    timestamps: true
})

// Index for better query performance
AdminSchema.index({ email: 1 })
AdminSchema.index({ username: 1 })
AdminSchema.index({ isActive: 1 })

// Virtual for full name
AdminSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`
})

// Ensure virtual fields are serialized
AdminSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.password
        return ret
    }
})

const Admin = mongoose.model('Admin', AdminSchema)

export default Admin
