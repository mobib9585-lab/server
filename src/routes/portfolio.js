import express from 'express'

const router = express.Router()

// Mock portfolio data (in a real app, this would come from a database)
const portfolioData = {
  projects: [
    {
      id: 1,
      title: 'E-commerce Platform',
      category: 'web',
      description: 'Modern e-commerce platform with seamless user experience and advanced features',
      longDescription: 'A comprehensive e-commerce solution built with React and Node.js, featuring real-time inventory management, secure payment processing, and an intuitive admin dashboard.',
      image: '/api/placeholder/600/400',
      images: [
        '/api/placeholder/600/400',
        '/api/placeholder/600/400',
        '/api/placeholder/600/400'
      ],
      technologies: ['React', 'Node.js', 'MongoDB', 'Stripe', 'Redux'],
      link: 'https://example-ecommerce.com',
      github: 'https://github.com/jerome/ecommerce',
      featured: true,
      completedAt: '2024-01-15',
      client: 'TechStart Inc.'
    },
    {
      id: 2,
      title: 'Brand Identity Design',
      category: 'branding',
      description: 'Complete brand identity for a tech startup including logo, colors, and guidelines',
      longDescription: 'Comprehensive brand identity design for a fintech startup, including logo design, color palette, typography, business cards, and brand guidelines.',
      image: '/api/placeholder/600/400',
      images: [
        '/api/placeholder/600/400',
        '/api/placeholder/600/400',
        '/api/placeholder/600/400'
      ],
      technologies: ['Illustrator', 'Photoshop', 'Figma', 'InDesign'],
      link: 'https://example-brand.com',
      github: null,
      featured: true,
      completedAt: '2024-02-20',
      client: 'FinTech Solutions'
    },
    {
      id: 3,
      title: 'Mobile App UI',
      category: 'mobile',
      description: 'Clean and intuitive mobile app interface design for iOS and Android',
      longDescription: 'User interface design for a fitness tracking mobile application, focusing on user experience and accessibility across iOS and Android platforms.',
      image: '/api/placeholder/600/400',
      images: [
        '/api/placeholder/600/400',
        '/api/placeholder/600/400',
        '/api/placeholder/600/400'
      ],
      technologies: ['Figma', 'Principle', 'After Effects', 'Sketch'],
      link: 'https://example-app.com',
      github: null,
      featured: false,
      completedAt: '2024-03-10',
      client: 'FitLife App'
    },
    {
      id: 4,
      title: 'Corporate Website',
      category: 'web',
      description: 'Professional corporate website with CMS integration',
      longDescription: 'Modern corporate website built with Next.js and Tailwind CSS, featuring a custom CMS for easy content management.',
      image: '/api/placeholder/600/400',
      images: [
        '/api/placeholder/600/400',
        '/api/placeholder/600/400'
      ],
      technologies: ['Next.js', 'Tailwind', 'Strapi'],
      link: 'https://example-corporate.com',
      github: 'https://github.com/jerome/corporate-site',
      featured: false,
      completedAt: '2024-03-25',
      client: 'Business Corp'
    },
    {
      id: 5,
      title: 'Logo Collection',
      category: 'branding',
      description: 'Collection of minimalist logo designs',
      longDescription: 'A curated collection of minimalist logo designs for various clients across different industries.',
      image: '/api/placeholder/600/400',
      images: [
        '/api/placeholder/600/400',
        '/api/placeholder/600/400'
      ],
      technologies: ['Illustrator', 'Photoshop'],
      link: 'https://example-logos.com',
      github: null,
      featured: false,
      completedAt: '2024-04-01',
      client: 'Various Clients'
    },
    {
      id: 6,
      title: 'Dashboard Interface',
      category: 'web',
      description: 'Analytics dashboard with data visualization',
      longDescription: 'Interactive analytics dashboard featuring real-time data visualization, built with React and D3.js.',
      image: '/api/placeholder/600/400',
      images: [
        '/api/placeholder/600/400',
        '/api/placeholder/600/400'
      ],
      technologies: ['React', 'D3.js', 'TypeScript'],
      link: 'https://example-dashboard.com',
      github: 'https://github.com/jerome/dashboard',
      featured: true,
      completedAt: '2024-04-15',
      client: 'Analytics Pro'
    }
  ],
  categories: [
    { id: 'all', name: 'All Projects', count: 6 },
    { id: 'web', name: 'Web Design', count: 3 },
    { id: 'branding', name: 'Branding', count: 2 },
    { id: 'mobile', name: 'Mobile', count: 1 }
  ],
  stats: {
    totalProjects: 150,
    happyClients: 50,
    yearsExperience: 8,
    awards: 12
  }
}

// GET /api/portfolio - Get all projects
router.get('/', (req, res) => {
  const { category, featured, limit } = req.query

  let projects = [...portfolioData.projects]

  // Filter by category
  if (category && category !== 'all') {
    projects = projects.filter(project => project.category === category)
  }

  // Filter by featured
  if (featured === 'true') {
    projects = projects.filter(project => project.featured)
  }

  // Limit results
  if (limit) {
    const limitNum = parseInt(limit)
    if (!isNaN(limitNum) && limitNum > 0) {
      projects = projects.slice(0, limitNum)
    }
  }

  res.json({
    success: true,
    data: {
      projects,
      categories: portfolioData.categories,
      stats: portfolioData.stats,
      total: projects.length
    }
  })
})

// GET /api/portfolio/:id - Get single project
router.get('/:id', (req, res) => {
  const projectId = parseInt(req.params.id)
  const project = portfolioData.projects.find(p => p.id === projectId)

  if (!project) {
    return res.status(404).json({
      error: 'Project not found',
      message: `Project with ID ${projectId} does not exist`
    })
  }

  res.json({
    success: true,
    data: project
  })
})

// GET /api/portfolio/categories - Get all categories
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: portfolioData.categories
  })
})

// GET /api/portfolio/stats - Get portfolio statistics
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: portfolioData.stats
  })
})

export default router
