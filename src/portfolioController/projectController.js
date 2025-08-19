import Project from "../portfolioModel/ProjectModel.js"

// Get all projects (public endpoint)
export const getProjects = async (req, res) => {
    try {
        const { 
            category, 
            featured, 
            status = 'published', 
            limit = 10, 
            page = 1,
            sort = '-createdAt'
        } = req.query

        // Build filter object
        const filter = { status }
        if (category && category !== 'all') {
            filter.category = category
        }
        if (featured === 'true') {
            filter.featured = true
        }

        // Calculate pagination
        const skip = (page - 1) * limit
        const limitNum = parseInt(limit)

        // Get projects with pagination
        const projects = await Project.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .populate('createdBy', 'firstName lastName')

        // Get total count for pagination
        const total = await Project.countDocuments(filter)

        // Get categories for filtering
        const categories = await Project.distinct('category', { status: 'published' })

        res.status(200).json({
            success: true,
            data: {
                projects,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limitNum),
                    total,
                    limit: limitNum
                },
                categories
            }
        })
    } catch (error) {
        console.error('Get projects error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Get single project (public endpoint)
export const getProject = async (req, res) => {
    try {
        const { id } = req.params

        const project = await Project.findById(id)
            .populate('createdBy', 'firstName lastName')

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            })
        }

        // Increment view count
        project.viewCount += 1
        await project.save()

        res.status(200).json({
            success: true,
            data: project
        })
    } catch (error) {
        console.error('Get project error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Create project (admin only)
export const createProject = async (req, res) => {
    try {
        const projectData = {
            ...req.body,
            createdBy: req.admin.id
        }

        const project = new Project(projectData)
        await project.save()

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: project
        })
    } catch (error) {
        console.error('Create project error:', error)
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: Object.values(error.errors).map(err => err.message)
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Update project (admin only)
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params

        const project = await Project.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        ).populate('createdBy', 'firstName lastName')

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: project
        })
    } catch (error) {
        console.error('Update project error:', error)
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: Object.values(error.errors).map(err => err.message)
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Delete project (admin only)
export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params

        const project = await Project.findByIdAndDelete(id)

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            })
        }

        res.status(200).json({
            success: true,
            message: "Project deleted successfully"
        })
    } catch (error) {
        console.error('Delete project error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

// Get admin projects (admin only)
export const getAdminProjects = async (req, res) => {
    try {
        const { 
            category, 
            status, 
            featured,
            limit = 10, 
            page = 1,
            sort = '-createdAt',
            search
        } = req.query

        // Build filter object
        const filter = {}
        if (category && category !== 'all') {
            filter.category = category
        }
        if (status && status !== 'all') {
            filter.status = status
        }
        if (featured === 'true') {
            filter.featured = true
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { technologies: { $in: [new RegExp(search, 'i')] } }
            ]
        }

        // Calculate pagination
        const skip = (page - 1) * limit
        const limitNum = parseInt(limit)

        // Get projects with pagination
        const projects = await Project.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .populate('createdBy', 'firstName lastName')

        // Get total count for pagination
        const total = await Project.countDocuments(filter)

        // Get stats
        const stats = {
            total: await Project.countDocuments(),
            published: await Project.countDocuments({ status: 'published' }),
            draft: await Project.countDocuments({ status: 'draft' }),
            featured: await Project.countDocuments({ featured: true })
        }

        res.status(200).json({
            success: true,
            data: {
                projects,
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
        console.error('Get admin projects error:', error)
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}
