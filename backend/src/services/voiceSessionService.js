const conversationService = require('./conversationService')

class VoiceSessionService {
  async processUserInput({ userId, userInput, sessionId, currentFlashcard, availableFlashcards }) {
    try {
      console.log(`🤖 Processing user input: "${userInput}"`)

      const response = this.createIntelligentResponse({
        userInput,
        currentFlashcard,
        availableFlashcards,
        userId
      })

      return {
        response: response.message,
        nextFlashcard: response.nextFlashcard,
        progress: response.progress
      }

    } catch (error) {
      console.error('Error processing user input:', error)
      return {
        response: "I'm sorry, I didn't understand that. Could you please repeat your answer?",
        nextFlashcard: currentFlashcard,
        progress: null
      }
    }
  }

  createIntelligentResponse({ userInput, currentFlashcard, availableFlashcards, userId }) {
    const input = userInput.toLowerCase().trim()

    // Handle navigation commands
    if (input.includes('go back') || input.includes('return home') || input.includes('exit')) {
      return {
        message: "Returning to dashboard. Thank you for using Braillience!",
        nextFlashcard: null,
        progress: null
      }
    }

    if (input.includes('end session') || input.includes('stop learning')) {
      return {
        message: "Ending your learning session. Great job studying!",
        nextFlashcard: null,
        progress: null
      }
    }

    if (input.includes('repeat') || input.includes('say again')) {
      if (currentFlashcard) {
        return {
          message: `The question is: ${currentFlashcard.front}`,
          nextFlashcard: currentFlashcard,
          progress: null
        }
      } else {
        return {
          message: "No flashcard is currently active.",
          nextFlashcard: null,
          progress: null
        }
      }
    }

    if (input.includes('next') || input.includes('next question')) {
      const nextCard = this.getNextFlashcard(currentFlashcard, availableFlashcards)
      if (nextCard) {
        return {
          message: `Next question: ${nextCard.front}. Please answer when you're ready.`,
          nextFlashcard: nextCard,
          progress: null
        }
      } else {
        return {
          message: "You've completed all flashcards! Great job!",
          nextFlashcard: null,
          progress: null
        }
      }
    }

    if (input.includes('help') || input.includes('what can i say')) {
      return {
        message: "You can say: repeat, next question, go back, end session, or answer the current question.",
        nextFlashcard: currentFlashcard,
        progress: null
      }
    }

    // Handle flashcard responses
    if (currentFlashcard) {
      return this.evaluateFlashcardAnswer(input, currentFlashcard, availableFlashcards)
    } else {
      // Start with first flashcard
      const firstCard = availableFlashcards[0]
      return {
        message: `Let's begin! Here's your first question: ${firstCard.front}. Please answer when you're ready.`,
        nextFlashcard: firstCard,
        progress: {
          currentIndex: 0,
          totalCards: availableFlashcards.length,
          correctAnswers: 0,
          incorrectAnswers: 0
        }
      }
    }
  }

  evaluateFlashcardAnswer(userAnswer, flashcard, availableFlashcards) {
    const correctAnswer = flashcard.back.toLowerCase()
    const userAnswerLower = userAnswer.toLowerCase()

    // Check for exact matches or close matches
    const isExactMatch = userAnswerLower.includes(correctAnswer) || correctAnswer.includes(userAnswerLower)

    // Check for key concept matches
    const keyConcepts = this.extractKeyConcepts(correctAnswer)
    const userConcepts = this.extractKeyConcepts(userAnswerLower)

    const conceptMatches = keyConcepts.filter(concept =>
      userConcepts.some(userConcept =>
        concept.includes(userConcept) || userConcept.includes(concept)
      )
    )

    const accuracy = conceptMatches.length / keyConcepts.length
    const isCorrect = isExactMatch || accuracy > 0.6

    // Get next flashcard
    const nextCard = this.getNextFlashcard(flashcard, availableFlashcards)

    if (isCorrect) {
      return {
        message: `Excellent! That's correct. ${flashcard.back}. You understand this concept well! ${nextCard ? 'Moving to the next question.' : 'You\'ve completed all flashcards!'}`,
        nextFlashcard: nextCard,
        progress: {
          currentIndex: nextCard ? availableFlashcards.findIndex(card => card.id === nextCard.id) : availableFlashcards.length,
          totalCards: availableFlashcards.length,
          correctAnswers: 1,
          incorrectAnswers: 0
        }
      }
    } else if (accuracy > 0.3) {
      return {
        message: `Good attempt! You're on the right track. The complete answer is: ${flashcard.back}. ${nextCard ? 'Let\'s try the next question.' : 'You\'ve completed all flashcards!'}`,
        nextFlashcard: nextCard,
        progress: {
          currentIndex: nextCard ? availableFlashcards.findIndex(card => card.id === nextCard.id) : availableFlashcards.length,
          totalCards: availableFlashcards.length,
          correctAnswers: 0,
          incorrectAnswers: 1
        }
      }
    } else {
      return {
        message: `Not quite right, but that's okay! The correct answer is: ${flashcard.back}. ${nextCard ? 'Let\'s try the next question.' : 'You\'ve completed all flashcards!'}`,
        nextFlashcard: nextCard,
        progress: {
          currentIndex: nextCard ? availableFlashcards.findIndex(card => card.id === nextCard.id) : availableFlashcards.length,
          totalCards: availableFlashcards.length,
          correctAnswers: 0,
          incorrectAnswers: 1
        }
      }
    }
  }

  getNextFlashcard(currentFlashcard, availableFlashcards) {
    if (!currentFlashcard) return availableFlashcards[0]

    const currentIndex = availableFlashcards.findIndex(card => card.id === currentFlashcard.id)
    const nextIndex = currentIndex + 1

    if (nextIndex >= availableFlashcards.length) {
      return null // Session complete
    }

    return availableFlashcards[nextIndex]
  }

  extractKeyConcepts(text) {
    // Extract important concepts from text
    const words = text.split(/\s+/).filter(word =>
      word.length > 3 &&
      !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'some', 'very', 'when', 'here', 'just', 'into', 'like', 'over', 'also', 'think', 'know', 'take', 'than', 'its', 'them', 'these', 'so', 'may', 'say', 'use', 'her', 'many', 'and', 'the', 'are', 'for', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word.toLowerCase())
    )

    return words.slice(0, 5) // Return top 5 key concepts
  }

  /**
   * Send PDF content and flashcards to Letta agent as background context
   */
  async sendPDFContextToLetta(userId, document, flashcards) {
    try {
      console.log(`📚 Sending PDF context to Letta agent for user: ${userId}`)

      // Get or create Letta agent for user
      const agentId = await conversationService.getUserLettaAgent(userId)
      if (!agentId) {
        console.log(`🤖 Creating new Letta agent for user: ${userId}`)
        const newAgentId = await conversationService.createLettaAgent(userId, {
          learningStyle: 'kinesthetic',
          preferredMode: 'teacher',
          documentContext: document.originalName
        })
        console.log(`🤖 Created Letta agent: ${newAgentId}`)
      }

      // Prepare PDF content for Letta
      const pdfContext = {
        documentName: document.originalName,
        extractedText: document.extractedText || '',
        flashcardCount: flashcards.length,
        keyConcepts: flashcards.map(card => ({
          question: card.question,
          answer: card.answer,
          difficulty: card.difficulty || 'medium'
        })),
        summary: `This document "${document.originalName}" contains ${flashcards.length} key learning concepts. The student will be learning about these topics through voice interaction.`
      }

      // Send context to Letta agent
      const contextMessage = `📚 DOCUMENT CONTEXT FOR TEACHING SESSION:

Document: ${pdfContext.documentName}
Key Concepts: ${pdfContext.keyConcepts.length} flashcards
Summary: ${pdfContext.summary}

FLASHCARDS TO TEACH:
${flashcards.map((card, index) => `${index + 1}. Q: ${card.question}\n   A: ${card.answer}`).join('\n\n')}

Please use this context to provide personalized teaching based on the student's learning style and the document content.`

      // Store this context in Letta with a user message to satisfy Letta's requirements
      await conversationService.storeVapiTranscript(agentId, [
        {
          type: 'user',
          content: `I want to learn about the document "${document.originalName}" with ${flashcards.length} key concepts. Please help me understand this material.`,
          timestamp: new Date().toISOString(),
          metadata: {
            documentId: document.id,
            documentName: document.originalName,
            flashcardCount: flashcards.length,
            contextType: 'learning_request'
          }
        },
        {
          type: 'assistant',
          content: contextMessage,
          timestamp: new Date().toISOString(),
          metadata: {
            documentId: document.id,
            documentName: document.originalName,
            flashcardCount: flashcards.length,
            contextType: 'pdf_teaching_context'
          }
        }
      ])

      console.log(`✅ PDF context sent to Letta agent for user: ${userId}`)
      return true
    } catch (error) {
      console.error('❌ Error sending PDF context to Letta:', error)
      return false
    }
  }

  /**
   * Start an in-browser voice tutoring session: sends PDF context to Letta,
   * stores the opening conversation turns, and returns everything the
   * frontend needs to run the Web Speech API loop client-side.
   */
  async startSession({ userId, document, flashcards, mode }) {
    try {
      console.log(`🎓 Starting voice session for user: ${userId}`)
      console.log(`📚 Document: ${document.originalName}`)
      console.log(`📋 Flashcards: ${flashcards.length}`)

      await this.sendPDFContextToLetta(userId, document, flashcards)

      const greeting = `Hello! I'm your AI teacher for Braillience. I'm going to walk through your document "${document.originalName}" with you. This document has ${flashcards.length} key concepts we'll explore together. Are you ready to begin learning?`

      const conversationData = {
        userId,
        documentId: document.id,
        documentName: document.originalName,
        mode: mode || 'teacher',
        startTime: new Date().toISOString(),
        status: 'active',
        messages: [
          {
            type: 'assistant',
            content: greeting,
            timestamp: new Date().toISOString(),
            metadata: { flashcardCount: flashcards.length, speaker: 'teacher' }
          }
        ],
        metadata: {
          flashcardCount: flashcards.length,
          documentContent: document.extractedText?.substring(0, 500) || ''
        }
      }

      const conversation = await conversationService.storeConversation(conversationData)
      console.log(`💾 Stored voice session conversation: ${conversation.id}`)

      return {
        success: true,
        data: {
          conversationId: conversation.id,
          status: 'active',
          documentName: document.originalName,
          flashcardCount: flashcards.length,
          greeting,
          flashcards
        }
      }
    } catch (error) {
      console.error('❌ Error starting voice session:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async endSession(conversationId) {
    try {
      await conversationService.updateConversationStatus(conversationId, 'completed', {
        endTime: new Date().toISOString()
      })
      return {
        success: true,
        data: { conversationId, status: 'completed' }
      }
    } catch (error) {
      console.error('❌ Error ending voice session:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

module.exports = new VoiceSessionService()
