import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useVoiceInterview Hook
 * Integrates Web Speech API for voice-driven mock interviews:
 * - Speech-to-Text (STT) for candidate answers
 * - Text-to-Speech (TTS) for AI interviewer voice replies
 * - Speech synthesis queue management
 */
export const useVoiceInterview = ({ onTranscriptComplete } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const selectedVoiceRef = useRef(null);
  const onTranscriptCompleteRef = useRef(onTranscriptComplete);
  const shouldListenRef = useRef(false);
  const activeUtteranceRef = useRef(null);
  const heartbeatRef = useRef(null);

  useEffect(() => {
    onTranscriptCompleteRef.current = onTranscriptComplete;
  }, [onTranscriptComplete]);

  // Clean up speech synthesis heartbeat
  const clearHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  // Initialize Speech Recognition & Synthesis once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk + ' ';
          } else {
            interim += transcriptChunk;
          }
        }

        setInterimTranscript(interim);

        if (final.trim() && onTranscriptCompleteRef.current) {
          onTranscriptCompleteRef.current(final.trim());
          setInterimTranscript('');
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          shouldListenRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // If candidate intended to keep mic open, automatically reconnect after silence pause
        if (shouldListenRef.current) {
          try {
            recognition.start();
            setIsListening(true);
            return;
          } catch (e) {
            // will catch if already starting
          }
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition setup failed:', err);
      setIsSupported(false);
    }

    // Load available voices for TTS
    if (synthRef.current) {
      const loadVoices = () => {
        const voices = synthRef.current.getVoices();
        // Prefer natural English voices
        const naturalVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))
        ) || voices.find((v) => v.lang.startsWith('en'));
        selectedVoiceRef.current = naturalVoice || null;
      };

      loadVoices();
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      shouldListenRef.current = false;
      clearHeartbeat();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (synthRef.current) {
        try {
          synthRef.current.cancel();
        } catch (e) {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    if (!recognitionRef.current || isListening) return;
    try {
      // Pause TTS before listening to prevent audio feedback loop
      if (synthRef.current && synthRef.current.speaking) {
        clearHeartbeat();
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // Recognition may already be running
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) {
      console.warn('Recognition stop error:', e);
      setIsListening(false);
    }
  }, []);

  const speak = useCallback((text) => {
    if (!synthRef.current || !voiceEnabled || !text) return;

    try {
      clearHeartbeat();
      synthRef.current.cancel(); // cancel any active speech

      // Clean markdown and formatting from speech for natural audio flow
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Here is the relevant architecture pattern shown on your screen.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*#_>-]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      activeUtteranceRef.current = utterance; // Prevent Chrome garbage collection bug

      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        // Start Chrome keep-alive heartbeat to prevent speech cutoffs > 15s
        clearHeartbeat();
        heartbeatRef.current = setInterval(() => {
          if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.pause();
            synthRef.current.resume();
          } else {
            clearHeartbeat();
          }
        }, 10000);
      };

      utterance.onend = () => {
        clearHeartbeat();
        activeUtteranceRef.current = null;
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        clearHeartbeat();
        activeUtteranceRef.current = null;
        setIsSpeaking(false);
      };

      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      clearHeartbeat();
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
    }
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    clearHeartbeat();
    activeUtteranceRef.current = null;
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    interimTranscript,
    isSpeaking,
    isSupported,
    voiceEnabled,
    setVoiceEnabled,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
};

export default useVoiceInterview;
