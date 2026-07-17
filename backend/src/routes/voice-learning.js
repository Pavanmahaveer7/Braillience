const express = require('express')
const voiceSessionService = require('../services/voiceSessionService')
const dbService = require('../services/databaseService')

const router = express.Router()

// Start an in-browser voice tutoring session
router.post('/start-session', async (req, res) => {
  try {
    const { userId, documentId, mode } = req.body

    if (!userId || !documentId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and document ID are required'
      })
    }

    console.log('🎓 Starting voice session for user:', userId)
    console.log('📚 Document ID:', documentId)

    // Get document content
    const document = await dbService.getDocument(documentId, userId)
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      })
    }

    // Get flashcards for the document
    const flashcards = await dbService.getFlashcards(userId, documentId)

    if (flashcards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No flashcards found',
        message: 'Please upload a PDF first to generate flashcards'
      })
    }

    const session = await voiceSessionService.startSession({
      userId,
      document,
      flashcards,
      mode: mode || 'teacher'
    })

    if (session.success) {
      res.json({
        success: true,
        message: 'Voice session started successfully',
        data: session.data
      })
    } else {
      res.status(500).json({
        success: false,
        error: session.error || 'Failed to start voice session'
      })
    }
  } catch (error) {
    console.error('Error starting voice session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to start voice session'
    })
  }
})

// Process spoken user input through the voice session
router.post('/process', async (req, res) => {
  try {
    const { userId, userInput, sessionId, currentFlashcard } = req.body

    console.log(`🎤 Processing user input for ${userId}:`, userInput)

    // Get available flashcards for the user
    const flashcards = await dbService.getFlashcards(userId, null)

    if (flashcards.length === 0) {
      return res.json({
        success: true,
        data: {
          response: "No flashcards available. Please upload a PDF first to generate flashcards.",
          nextFlashcard: null,
          progress: null
        }
      })
    }

    const response = await voiceSessionService.processUserInput({
      userId,
      userInput,
      sessionId,
      currentFlashcard,
      availableFlashcards: flashcards
    })

    res.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error processing user input:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process user input',
      message: error.message
    })
  }
})

// End a voice session
router.post('/end-session', async (req, res) => {
  try {
    const { conversationId } = req.body

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      })
    }

    console.log('🛑 Ending voice session:', conversationId)

    const result = await voiceSessionService.endSession(conversationId)

    if (result.success) {
      res.json({
        success: true,
        message: 'Voice session ended successfully',
        data: result.data
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to end voice session'
      })
    }
  } catch (error) {
    console.error('Error ending voice session:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to end voice session'
    })
  }
})

module.exports = router
