import { useState, useEffect, useCallback, useRef } from 'react';

export const useVoiceCommands = ({
  onCommand,
  continuous = true, // Always continuous for accessibility
  interimResults = true,
  maxAlternatives = 1,
  autoRestart = true // Auto-restart when recognition ends
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isEnabled, setIsEnabled] = useState(true); // Control continuous listening
  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const isEnabledRef = useRef(true); // Mirrors isEnabled without the stale-closure risk in onend
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = maxAlternatives;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          const command = finalTranscript.trim().toLowerCase();
          onCommand(command);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);

        // Auto-restart if enabled and not manually stopped.
        // Reads isEnabledRef (not the isEnabled state) because this closure
        // was created when startListening() was called and would otherwise
        // never see a later setIsEnabled(false) from disableContinuousListening.
        if (autoRestart && isEnabledRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isEnabledRef.current) {
              console.log('🔄 Auto-restarting voice recognition...');
              startListening();
            }
          }, 1000); // 1 second delay before restart
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Failed to start speech recognition');
    }
  }, [isSupported, continuous, interimResults, maxAlternatives, onCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    setIsListening(false);
  }, []);

  const disableContinuousListening = useCallback(() => {
    isEnabledRef.current = false;
    setIsEnabled(false);
    stopListening();
    console.log('🛑 Continuous voice listening disabled');
  }, [stopListening]);

  const enableContinuousListening = useCallback(() => {
    isEnabledRef.current = true;
    setIsEnabled(true);
    console.log('🎤 Continuous voice listening enabled');
    startListening();
  }, [startListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  return {
    startListening,
    stopListening,
    disableContinuousListening,
    enableContinuousListening,
    isListening,
    isEnabled,
    isSupported,
    transcript,
    error
  };
};
