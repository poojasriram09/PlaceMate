import { useState, useRef, useCallback, useEffect } from 'react'

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const shouldListenRef = useRef(false)
  const restartTimerRef = useRef(null)
  const isSupported = !!getSpeechRecognition()

  // Create a fresh recognition instance each time we start
  const createRecognition = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) return null

    const recognition = new SR()
    recognition.continuous = false  // single utterance — we manually restart
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
    }

    recognition.onend = () => {
      // Auto-restart after a short delay if user still wants to listen
      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) {
            try {
              recognition.start()
            } catch {
              // If restart fails, create a new instance
              const fresh = createRecognition()
              if (fresh) {
                recognitionRef.current = fresh
                try { fresh.start() } catch {}
              }
            }
          }
        }, 300)
      } else {
        setIsListening(false)
      }
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'not-allowed') {
        shouldListenRef.current = false
        setIsListening(false)
      }
    }

    return recognition
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false
      clearTimeout(restartTimerRef.current)
      try { recognitionRef.current?.stop() } catch {}
    }
  }, [])

  const startListening = useCallback(() => {
    // Stop any existing instance
    clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.stop() } catch {}

    setTranscript('')
    shouldListenRef.current = true

    // Create fresh instance and start after brief delay
    setTimeout(() => {
      const recognition = createRecognition()
      if (!recognition) return
      recognitionRef.current = recognition
      try {
        recognition.start()
        setIsListening(true)
      } catch {
        shouldListenRef.current = false
        setIsListening(false)
      }
    }, 150)
  }, [createRecognition])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.stop() } catch {}
    setIsListening(false)
  }, [])

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return

    function doSpeak() {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
        || voices.find(v => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred
      utterance.rate = 0.95
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }

    if (window.speechSynthesis.getVoices().length > 0) doSpeak()
    else { window.speechSynthesis.onvoiceschanged = doSpeak; setTimeout(doSpeak, 500) }
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const resetTranscript = useCallback(() => setTranscript(''), [])

  return { isListening, transcript, isSupported, isSpeaking, startListening, stopListening, speak, stopSpeaking, resetTranscript }
}
