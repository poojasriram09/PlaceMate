import { useState, useRef, useCallback, useEffect } from 'react'

const FACE_API_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.min.js'
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model'

export function useWebcam() {
  const videoRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [metrics, setMetrics] = useState({
    confidence: 0, eyeContact: 0, engagement: 0,
    headMovement: 'stable', currentExpression: 'neutral',
  })
  const detectLoopRef = useRef(null)
  const posHistoryRef = useRef([])
  const prevMetricsRef = useRef({ confidence: 50, eyeContact: 50, engagement: 50 })
  const streamRef = useRef(null)
  const isActiveRef = useRef(false)

  async function loadFaceAPI() {
    if (window.faceapi) return
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = FACE_API_URL
      script.onload = resolve
      script.onerror = () => reject(new Error('Failed to load face-api.js'))
      document.head.appendChild(script)
    })
  }

  async function loadModels() {
    if (!window.faceapi) throw new Error('face-api not loaded')
    await Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ])
  }

  const smooth = (prev, next) => Math.round(prev * 0.65 + next * 0.35)

  function runDetection() {
    if (!videoRef.current || !window.faceapi || !isActiveRef.current) return

    window.faceapi
      .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
      .withFaceLandmarks(true)
      .withFaceExpressions()
      .then(detection => {
        if (detection) {
          const box = detection.detection.box
          const vw = videoRef.current?.videoWidth || 320
          const vh = videoRef.current?.videoHeight || 240

          const faceCenterX = box.x + box.width / 2
          const offset = Math.abs(faceCenterX - vw / 2) / (vw / 2)
          const eyeContact = Math.max(0, Math.round(100 - offset * 180))

          const faceArea = (box.width * box.height) / (vw * vh)
          const sizeScore = (faceArea > 0.04 && faceArea < 0.65) ? 100 : 40

          const sorted = Object.entries(detection.expressions).sort((a, b) => b[1] - a[1])
          const dominant = sorted[0][0]
          const engMap = { neutral: 65, happy: 95, surprised: 55, sad: 30, angry: 35, fearful: 25, disgusted: 30 }
          const engagement = engMap[dominant] || 50

          posHistoryRef.current.push({ x: faceCenterX })
          if (posHistoryRef.current.length > 10) posHistoryRef.current.shift()
          let movementPenalty = 0, movementLevel = 'stable'
          if (posHistoryRef.current.length >= 5) {
            const xs = posHistoryRef.current.map(p => p.x)
            const mean = xs.reduce((a, b) => a + b, 0) / xs.length
            const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length
            if (variance > 2000) { movementPenalty = 20; movementLevel = 'excessive' }
            else if (variance > 500) { movementPenalty = 8; movementLevel = 'moderate' }
          }

          const confidence = Math.max(0, Math.min(100, eyeContact * 0.35 + engagement * 0.35 + sizeScore * 0.15 + (100 - movementPenalty) * 0.15))
          const prev = prevMetricsRef.current
          const m = { confidence: smooth(prev.confidence, confidence), eyeContact: smooth(prev.eyeContact, eyeContact), engagement: smooth(prev.engagement, engagement), headMovement: movementLevel, currentExpression: dominant }
          prevMetricsRef.current = m
          setMetrics(m)
        } else {
          const prev = prevMetricsRef.current
          const m = { confidence: Math.max(0, prev.confidence - 3), eyeContact: Math.max(0, prev.eyeContact - 5), engagement: prev.engagement, headMovement: prev.headMovement, currentExpression: 'no face' }
          prevMetricsRef.current = m
          setMetrics(m)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isActiveRef.current) detectLoopRef.current = setTimeout(runDetection, 600)
      })
  }

  // When video ref is attached AND stream exists, connect them
  // This effect runs when isActive changes — the video element now exists in DOM
  useEffect(() => {
    if (isActive && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  })

  // Start detection loop when active + model loaded
  useEffect(() => {
    isActiveRef.current = isActive
    if (isActive && isModelLoaded) {
      setTimeout(runDetection, 1500)
    }
    return () => { clearTimeout(detectLoopRef.current) }
  }, [isActive, isModelLoaded])

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await loadFaceAPI()
      await loadModels()
      setIsModelLoaded(true)

      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
      streamRef.current = stream

      // Set active FIRST so the video element renders, THEN the effect above connects the stream
      setIsActive(true)
    } catch (err) {
      setError(err.message.includes('Permission') || err.message.includes('NotAllowed') ? 'Camera access denied' : 'Webcam error: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    isActiveRef.current = false
    setIsActive(false)
    clearTimeout(detectLoopRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => () => { stopCamera() }, [])

  return { videoRef, isActive, isModelLoaded, isLoading, metrics, startCamera, stopCamera, error }
}
