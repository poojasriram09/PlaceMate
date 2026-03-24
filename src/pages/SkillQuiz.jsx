import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { generateQuizQuestions } from '../lib/ai'
import { Shield, Clock, CheckCircle2, XCircle, Loader2, ArrowRight, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const TIME_PER_QUESTION = 30
const TOTAL_QUESTIONS = 5
const PASS_THRESHOLD = 4

export default function SkillQuiz() {
  const [searchParams] = useSearchParams()
  const skill = searchParams.get('skill') || ''
  const returnTo = searchParams.get('returnTo') || null
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()

  const [phase, setPhase] = useState('loading')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)

  // ====== 6 CHEAT DETECTION LAYERS ======
  const [tabSwitches, setTabSwitches] = useState(0)          // 1. Tab switch detection
  const [focusLosses, setFocusLosses] = useState(0)          // 4. Window focus loss
  const [windowResizes, setWindowResizes] = useState(0)       // 4. Window resize (side-by-side)
  const [showWarning, setShowWarning] = useState(false)
  const questionStartRef = useRef(Date.now())                 // 2. Response time tracking
  const responseTimes = useRef([])                            // 2. Per-question response times

  useEffect(() => {
    if (!skill) { navigate('/profile'); return }
    loadQuestions()
  }, [skill])

  // Timer — 6. Timed questions (30s per question, auto-submit)
  useEffect(() => {
    if (phase !== 'quiz') return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleAnswer(null); return TIME_PER_QUESTION }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, currentQ])

  // 1. Tab switch detection (visibilitychange)
  useEffect(() => {
    if (phase !== 'quiz') return
    const handler = () => {
      if (document.hidden) {
        setTabSwitches(prev => {
          const next = prev + 1
          if (next >= 3 && !showWarning) {
            setShowWarning(true)
            toast.error('Multiple tab switches detected. This is being recorded.')
          }
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [phase, showWarning])

  // 4. Window blur / focus loss detection
  useEffect(() => {
    if (phase !== 'quiz') return
    const onBlur = () => setFocusLosses(prev => prev + 1)
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [phase])

  // 4. Window resize detection (side-by-side browsing)
  useEffect(() => {
    if (phase !== 'quiz') return
    const onResize = () => setWindowResizes(prev => prev + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [phase])

  async function loadQuestions() {
    setPhase('loading')
    try {
      const qs = await generateQuizQuestions(skill)
      if (!Array.isArray(qs) || qs.length < 3) throw new Error('Bad questions')
      const valid = qs.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3)
      if (valid.length < 3) throw new Error('Not enough valid questions')
      setQuestions(valid.slice(0, TOTAL_QUESTIONS))
      setPhase('ready')
    } catch {
      toast.error('Failed to generate quiz. Try again.')
      navigate(returnTo || '/profile')
    }
  }

  function startQuiz() {
    setPhase('quiz')
    setTimeLeft(TIME_PER_QUESTION)
    questionStartRef.current = Date.now()
    // Reset cheat counters
    setTabSwitches(0)
    setFocusLosses(0)
    setWindowResizes(0)
    setShowWarning(false)
    responseTimes.current = []
  }

  const handleAnswer = useCallback((optionIndex) => {
    const q = questions[currentQ]
    if (!q) return

    // 2. Response time analysis
    const responseTime = (Date.now() - questionStartRef.current) / 1000
    responseTimes.current.push(responseTime)

    const correct = optionIndex === q.correct
    const answerText = optionIndex != null ? q.options[optionIndex] : '(no answer)'

    const newResults = [...results, {
      question: q.question, answer: answerText, expected: q.options[q.correct],
      correct, selectedIndex: optionIndex, timeUsed: Math.round(responseTime),
    }]
    setResults(newResults)

    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
      setTimeLeft(TIME_PER_QUESTION)
      questionStartRef.current = Date.now()
    } else {
      finishQuiz(newResults)
    }
  }, [currentQ, questions, results])

  async function finishQuiz(finalResults) {
    setPhase('results')
    const correctCount = finalResults.filter(r => r.correct).length

    // ====== BUILD INTEGRITY FLAGS ======
    const integrityFlags = []

    // 1. Tab switches
    if (tabSwitches >= 3) integrityFlags.push({ type: 'tab_switches', severity: 'high', message: `${tabSwitches} tab switches — likely looking up answers` })
    else if (tabSwitches > 0) integrityFlags.push({ type: 'tab_switches', severity: 'low', message: `${tabSwitches} tab switch(es)` })

    // 2. Response time analysis — suspiciously fast (< 3s for correct answer)
    finalResults.forEach((r, i) => {
      if (r.correct && r.timeUsed < 3) integrityFlags.push({ type: 'too_fast', severity: 'medium', message: `Q${i + 1}: answered correctly in ${r.timeUsed}s (suspiciously fast)` })
    })

    // 2. Response time analysis — suspiciously slow (> 25s, likely searching)
    finalResults.forEach((r, i) => {
      if (r.timeUsed > 25 && r.correct) integrityFlags.push({ type: 'too_slow', severity: 'medium', message: `Q${i + 1}: took ${r.timeUsed}s then got it right (possible external help)` })
    })

    // 4. Focus loss / window resize (side-by-side browsing)
    if (focusLosses >= 3) integrityFlags.push({ type: 'focus_loss', severity: 'high', message: `${focusLosses} focus losses — opened another window` })
    if (windowResizes > 2) integrityFlags.push({ type: 'window_resize', severity: 'medium', message: `${windowResizes} window resizes — possible side-by-side browsing` })

    // Pattern: perfect score + many tab switches = suspicious
    if (correctCount === questions.length && tabSwitches >= 2) {
      integrityFlags.push({ type: 'perfect_with_flags', severity: 'high', message: 'Perfect score with suspicious activity — likely external help' })
    }

    // Calculate integrity score
    let integrityScore = 100
    integrityFlags.forEach(f => {
      if (f.severity === 'high') integrityScore -= 20
      else if (f.severity === 'medium') integrityScore -= 10
      else integrityScore -= 5
    })
    integrityScore = Math.max(0, integrityScore)

    const passed = correctCount >= PASS_THRESHOLD

    // Save to DB
    try {
      await supabase.from('skill_quizzes').insert({
        candidate_id: user.uid, skill, questions, answers: finalResults,
        score: correctCount, total: questions.length, passed,
        integrity_score: integrityScore,
        integrity_flags: integrityFlags,
        time_taken_seconds: finalResults.reduce((s, r) => s + r.timeUsed, 0),
        completed_at: new Date().toISOString(),
      })
    } catch {}

    if (passed) {
      const currentVerified = profile?.skills_verified || []
      const currentScores = profile?.quiz_scores || {}
      if (!currentVerified.includes(skill)) {
        await updateProfile({
          skills_verified: [...currentVerified, skill],
          quiz_scores: { ...currentScores, [skill]: { score: correctCount, total: questions.length, passed, integrity: integrityScore, date: new Date().toISOString() } },
        }).catch(() => {})
      }
      toast.success(`${skill} verified!`)
    }
  }

  // --- LOADING ---
  if (phase === 'loading') return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-4" />
      <p className="text-primary/60">Generating {skill} quiz...</p>
    </div>
  )

  // --- READY ---
  if (phase === 'ready') return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card text-center">
        <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Skill Verification: {skill}</h2>
        <p className="text-primary/50 mb-6">{TOTAL_QUESTIONS} MCQ questions &middot; {TIME_PER_QUESTION}s per question &middot; {PASS_THRESHOLD}/{TOTAL_QUESTIONS} to pass</p>
        <div className="bg-slate-100 rounded-lg p-4 mb-6 text-left text-sm text-primary/70 space-y-1">
          <p>&bull; Each question has 4 options — click to answer</p>
          <p>&bull; Questions are specifically about <strong>{skill}</strong></p>
          <p>&bull; {TIME_PER_QUESTION} seconds per question — auto-submits on timeout</p>
          <p>&bull; <strong>Do not switch tabs or open other windows</strong></p>
          <p>&bull; All activity is monitored for integrity</p>
        </div>
        <button onClick={startQuiz} className="btn-accent w-full">Start Quiz</button>
      </motion.div>
    </div>
  )

  // --- RESULTS ---
  if (phase === 'results') {
    const correctCount = results.filter(r => r.correct).length
    const passed = correctCount >= PASS_THRESHOLD
    const flags = []
    if (tabSwitches > 0) flags.push(`${tabSwitches} tab switch${tabSwitches > 1 ? 'es' : ''}`)
    if (focusLosses > 0) flags.push(`${focusLosses} focus loss${focusLosses > 1 ? 'es' : ''}`)
    if (windowResizes > 2) flags.push(`${windowResizes} window resizes`)

    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {passed ? <CheckCircle2 className="w-8 h-8 text-emerald-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
          </div>
          <h2 className="text-xl font-bold text-primary text-center mb-1">{passed ? 'Skill Verified!' : 'Not Passed'}</h2>
          <p className="text-center text-primary/50 mb-4">{skill} — {correctCount}/{questions.length} correct (need {PASS_THRESHOLD})</p>

          <div className="space-y-3 mb-4">
            {results.map((r, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${r.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-2">
                  {r.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-primary/80">{r.question}</p>
                    <p className="text-xs mt-1"><span className="text-primary/40">Your answer:</span> <span className={r.correct ? 'text-emerald-700' : 'text-red-700'}>{r.answer}</span></p>
                    {!r.correct && <p className="text-xs"><span className="text-primary/40">Correct:</span> <span className="text-emerald-700">{r.expected}</span></p>}
                    <p className="text-xs text-primary/30 mt-0.5">{r.timeUsed}s</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Integrity flags shown to candidate */}
          {flags.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-amber-800 mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Integrity Notes (visible to recruiters)</p>
              {flags.map((f, i) => <p key={i} className="text-xs text-amber-700">&bull; {f}</p>)}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(returnTo || '/profile')} className="btn-secondary">
              {returnTo ? 'Back to Job' : 'Back to Profile'}
            </button>
            {!passed && <button onClick={() => { setPhase('loading'); setCurrentQ(0); setResults([]); loadQuestions() }} className="btn-accent">Retry</button>}
            {passed && returnTo && <button onClick={() => navigate(returnTo)} className="btn-accent">Continue to Job <ArrowRight className="w-4 h-4" /></button>}
          </div>
        </motion.div>
      </div>
    )
  }

  // --- QUIZ ---
  const q = questions[currentQ]
  if (!q) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="badge bg-accent/10 text-accent text-xs">{skill}</span>
          <p className="text-sm text-primary/50 mt-1">Question {currentQ + 1} of {questions.length}</p>
        </div>
        <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-primary/70'}`}>
          <Clock className="w-4 h-4" />
          0:{String(timeLeft).padStart(2, '0')}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-primary/10 rounded-full h-1 mb-6">
        <div className="bg-accent rounded-full h-1 transition-all" style={{ width: `${(currentQ / questions.length) * 100}%` }} />
      </div>

      {/* Tab switch warning */}
      {tabSwitches >= 3 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Multiple tab switches detected. This is being recorded and visible to recruiters.
        </div>
      )}

      {/* Question */}
      <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
        <span className="badge bg-slate-100 text-primary/60 text-xs mb-3 capitalize">{q.difficulty || 'question'}</span>
        <h3 className="text-lg font-semibold text-primary mb-4">{q.question}</h3>

        {q.code && (
          <div className="bg-primary rounded-lg p-4 mb-4 overflow-x-auto">
            <pre className="text-sm font-mono text-white/90 whitespace-pre-wrap">{q.code}</pre>
          </div>
        )}

        <div className="space-y-2.5">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(i)}
              className="w-full text-left p-3.5 rounded-lg border-2 border-primary/10 hover:border-accent hover:bg-accent/5 transition-all text-sm group">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/5 text-primary/50 text-xs font-bold mr-3 group-hover:bg-accent/10 group-hover:text-accent">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-primary/80 group-hover:text-primary">{opt}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Progress dots */}
      {results.length > 0 && (
        <div className="flex gap-1.5 mt-4 justify-center">
          {results.map((r, i) => <div key={i} className={`w-3 h-3 rounded-full ${r.correct ? 'bg-emerald-500' : 'bg-red-500'}`} />)}
          {Array.from({ length: questions.length - results.length }).map((_, i) => <div key={`p-${i}`} className="w-3 h-3 rounded-full bg-primary/10" />)}
        </div>
      )}
    </div>
  )
}
