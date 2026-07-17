import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMic, FiMicOff, FiVolume2 } from 'react-icons/fi';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import './VoiceTutor.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function VoiceTutor() {
  const navigate = useNavigate();
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [session, setSession] = useState(null); // { conversationId, documentName, flashcardCount, flashcards }
  const [currentFlashcard, setCurrentFlashcard] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastResponse, setLastResponse] = useState('');

  // currentFlashcard changes on every turn but the recognition callback is
  // created once per startListening() call, so route through a ref to avoid
  // sending stale flashcard state to the backend.
  const currentFlashcardRef = useRef(null);
  const sessionRef = useRef(null);

  const speakText = useCallback((text, callback) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      if (callback) callback();
      return;
    }

    speechSynthesis.cancel();
    setIsSpeaking(true);
    setLastResponse(text);

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setIsSpeaking(false);
        if (callback) callback();
      };
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        if (callback) callback();
      };

      speechSynthesis.speak(utterance);
    }, 100);
  }, []);

  const handleTranscript = useCallback(async (userInput) => {
    if (!sessionRef.current) return;

    disableContinuousListening();

    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : { id: 'demo-user' };

      const response = await fetch(`${API_BASE_URL}/api/voice-learning/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userInput,
          sessionId: sessionRef.current.conversationId,
          currentFlashcard: currentFlashcardRef.current
        })
      });
      const result = await response.json();

      if (result.success) {
        currentFlashcardRef.current = result.data.nextFlashcard;
        setCurrentFlashcard(result.data.nextFlashcard);
        speakText(result.data.response, () => enableContinuousListening());
      } else {
        speakText("Sorry, I had trouble with that. Could you try again?", () => enableContinuousListening());
      }
    } catch (err) {
      console.error('Error processing voice input:', err);
      speakText("Sorry, I had trouble with that. Could you try again?", () => enableContinuousListening());
    }
  }, [speakText]);

  const {
    enableContinuousListening,
    disableContinuousListening,
    isListening,
    isSupported,
    transcript
  } = useVoiceCommands({
    onCommand: handleTranscript,
    autoRestart: true
  });

  useEffect(() => {
    fetchAvailableDocuments();
    return () => {
      speechSynthesis.cancel();
      disableContinuousListening();
    };
  }, []);

  const fetchAvailableDocuments = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        console.error('No user data found');
        return;
      }

      const user = JSON.parse(userData);
      const response = await fetch(`${API_BASE_URL}/api/upload/pdfs/${user.id}`);
      const result = await response.json();

      if (result.success) {
        setAvailableDocuments(result.data);
        if (result.data.length > 0) {
          setSelectedDocument(result.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const startVoiceSession = async () => {
    if (!selectedDocument) {
      setError('Please select a document to study');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : { id: 'demo-user' };

      const response = await fetch(`${API_BASE_URL}/api/voice-learning/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          documentId: selectedDocument,
          mode: 'teacher'
        })
      });

      const result = await response.json();

      if (result.success) {
        sessionRef.current = result.data;
        setSession(result.data);
        currentFlashcardRef.current = null;
        setCurrentFlashcard(null);
        speakText(result.data.greeting, () => enableContinuousListening());
      } else {
        setError(result.error || 'Failed to start voice session');
      }
    } catch (err) {
      console.error('Error starting voice session:', err);
      setError('Failed to start voice session');
    } finally {
      setLoading(false);
    }
  };

  const endVoiceSession = async () => {
    if (!session) return;

    setLoading(true);
    disableContinuousListening();
    speechSynthesis.cancel();

    try {
      await fetch(`${API_BASE_URL}/api/voice-learning/end-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: session.conversationId })
      });
    } catch (err) {
      console.error('Error ending voice session:', err);
    } finally {
      sessionRef.current = null;
      setSession(null);
      setCurrentFlashcard(null);
      setLoading(false);
    }
  };

  return (
    <div className="voice-tutor-container">
      <div className="container">
        <div className="teacher-header">
          <h1 className="teacher-title">🎓 AI Voice Tutor</h1>
          <p className="teacher-subtitle">
            Talk through your uploaded PDF content with an AI tutor, right in your browser
          </p>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="dismiss-button">
              Dismiss
            </button>
          </div>
        )}

        {!isSupported && (
          <div className="error-message">
            <p>
              Voice recognition isn't supported in this browser. Please use Chrome or Edge for
              the AI Voice Tutor.
            </p>
          </div>
        )}

        {!session ? (
          <div className="call-setup">
            <div className="setup-section">
              <h3>📚 Select Document</h3>
              {availableDocuments.length > 0 ? (
                <select
                  value={selectedDocument || ''}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                  className="document-select"
                >
                  {availableDocuments.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fileName} ({doc.flashcardCount} flashcards)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="no-documents">
                  <p>No documents available. Please upload a PDF first.</p>
                  <button onClick={() => navigate('/upload')} className="upload-button">
                    Upload PDF
                  </button>
                </div>
              )}
            </div>

            <div className="call-actions">
              <button
                onClick={startVoiceSession}
                disabled={loading || !selectedDocument || !isSupported}
                className="start-call-button"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Starting Session...
                  </>
                ) : (
                  <>
                    <FiMic />
                    Start Voice Session
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="active-call">
            <div className="call-status">
              <div className="status-indicator">
                <FiVolume2 className="status-icon" />
                <span>Session Active</span>
              </div>
              <p className="call-info">
                Your AI tutor is walking through <strong>{session.documentName}</strong> with you.
                Just speak your answer after each question — say "help" any time for a list of
                voice commands.
              </p>
            </div>

            <div
              className={`listening-indicator ${isListening ? 'active' : ''}`}
              role="status"
              aria-live="polite"
            >
              {isSpeaking ? (
                <>
                  <FiVolume2 className="status-icon" /> Tutor is speaking...
                </>
              ) : isListening ? (
                <>
                  <FiMic className="status-icon" /> Listening...
                </>
              ) : (
                <>
                  <FiMicOff /> Not listening
                </>
              )}
            </div>

            {transcript && (
              <p className="transcript-preview" role="status" aria-live="polite">
                "{transcript}"
              </p>
            )}

            {currentFlashcard && (
              <div className="current-question">
                <h4>Current Question:</h4>
                <p>{currentFlashcard.front}</p>
              </div>
            )}

            {lastResponse && (
              <div className="call-details">
                <h4>🗣️ Tutor said</h4>
                <p>{lastResponse}</p>
              </div>
            )}

            <div className="call-actions">
              <button
                onClick={endVoiceSession}
                disabled={loading}
                className="end-call-button"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Ending Session...
                  </>
                ) : (
                  <>
                    <FiMicOff />
                    End Session
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="teacher-features">
          <h3>🎓 What Your AI Tutor Will Do:</h3>
          <ul>
            <li>📖 Walk through your PDF content step by step</li>
            <li>🎯 Focus on key concepts and important information</li>
            <li>❓ Ask questions to test your understanding</li>
            <li>💡 Provide explanations and examples</li>
            <li>🔄 Adapt to your learning pace</li>
            <li>🎤 Say "repeat", "next question", "help", or "end session" any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default VoiceTutor;
