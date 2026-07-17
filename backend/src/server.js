const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const path = require('path')
const database = require('./config/database')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../public')))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use('/api/', limiter)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/upload', require('./routes/upload'))
app.use('/api/flashcards', require('./routes/flashcards'))
app.use('/api/voice-learning', require('./routes/voice-learning')) // Browser-based voice tutoring
app.use('/api/conversations', require('./routes/conversations')) // Conversation storage with Letta
app.use('/api/test-ai', require('./routes/test-ai'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Braillience API'
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

// Start server with database connection
async function startServer() {
  try {
    // Connect to database
    await database.connect()
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Braillience API server running on port ${PORT}`)
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🗄️ Database: ${database.getConnectionStatus().isConnected ? 'Connected' : 'Disconnected'}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...')
  await database.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...')
  await database.disconnect()
  process.exit(0)
})

// Start the server
startServer()

module.exports = app
