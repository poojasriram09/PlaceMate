import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { startInterview, submitAnswer, generateScorecard } from '../lib/interview'
import { useVoice } from '../hooks/useVoice'
import { useWebcam } from '../hooks/useWebcam'
import { Mic, MicOff, Volume2, Send, Loader2, Bot, Clock, ArrowRight, CheckCircle2, AlertTriangle, Award, Target, MessageSquare, Sparkles, ChevronDown, ChevronUp, Camera, Eye, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_COLORS = { behavioral: 'bg-purple-100 text-purple-700', technical: 'bg-blue-100 text-blue-700', problem_solving: 'bg-amber-100 text-amber-700', closing: 'bg-emerald-100 text-emerald-700' }
const SCORE_COLOR = (s) => { const n = Number(s) || 0; return n >= 80 ? 'text-emerald-600' : n >= 60 ? 'text-blue-600' : n >= 40 ? 'text-amber-600' : 'text-red-600' }
const SCORE_BG = (s) => { const n = Number(s) || 0; return n >= 80 ? 'bg-emerald-50 border-emerald-200' : n >= 60 ? 'bg-blue-50 border-blue-200' : n >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200' }
const BAR_COLOR = (s) => { const n = Number(s) || 0; return n >= 70 ? 'bg-emerald-500' : n >= 40 ? 'bg-amber-500' : 'bg-red-500' }

let msgIdCounter = 0
function msgId() { return `msg-${++msgIdCounter}-${Date.now()}` }

// ==================== SETUP ====================
function SetupScreen({ onStart }) {
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [voiceOn, setVoiceOn] = useState(false)
  const [webcamOn, setWebcamOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const voice = useVoice()

  useEffect(() => {
    supabase.from('jobs').select('id, title, company_name, skills_required, description').eq('is_active', true).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { setJobs(data || []); setLoading(false) })
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-8 h-8 text-accent" /></div>
        <h1 className="text-3xl font-bold text-primary">AI Mock Interview</h1>
        <p className="text-primary/50 mt-2">6 questions. Scored. Learn what to improve.</p>
      </motion.div>

      <div className="card mb-4">
        <h3 className="font-semibold text-primary mb-3">Select a Job to Practice</h3>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
        : jobs.length === 0 ? <p className="text-primary/50 text-center py-6">No jobs available.</p>
        : <div className="space-y-2 max-h-64 overflow-y-auto">{jobs.map(job => (
          <button key={job.id} onClick={() => setSelectedJob(job)} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedJob?.id === job.id ? 'border-accent bg-accent/5' : 'border-primary/10 hover:border-primary/20'}`}>
            <p className="font-medium text-primary text-sm">{job.title}</p>
            <p className="text-xs text-primary/50">{job.company_name} &middot; {(job.skills_required || []).slice(0, 4).join(', ')}</p>
          </button>
        ))}</div>}
      </div>

      <div className="space-y-2 mb-4">
        {voice.isSupported && (
          <div className="card !p-3 cursor-pointer" onClick={() => setVoiceOn(!voiceOn)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Mic className="w-5 h-5 text-primary/50" /><div><p className="font-medium text-primary text-sm">Voice Mode</p><p className="text-xs text-primary/40">Speak answers, hear questions read aloud</p></div></div>
              <div className={`w-10 h-6 rounded-full transition-colors ${voiceOn ? 'bg-accent' : 'bg-primary/20'} relative`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${voiceOn ? 'translate-x-5' : 'translate-x-1'}`} /></div>
            </div>
          </div>
        )}
        <div className="card !p-3 cursor-pointer" onClick={() => setWebcamOn(!webcamOn)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Camera className="w-5 h-5 text-primary/50" /><div><p className="font-medium text-primary text-sm">Webcam Coaching</p><p className="text-xs text-primary/40">Real-time confidence & body language</p></div></div>
            <div className={`w-10 h-6 rounded-full transition-colors ${webcamOn ? 'bg-accent' : 'bg-primary/20'} relative`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${webcamOn ? 'translate-x-5' : 'translate-x-1'}`} /></div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-primary/40 mb-4">~10 minutes &middot; Detailed scorecard at the end</p>
      <button onClick={() => selectedJob && onStart(selectedJob, voiceOn, webcamOn)} disabled={!selectedJob} className="btn-accent w-full py-3 disabled:opacity-40">Start Interview <ArrowRight className="w-4 h-4" /></button>
    </div>
  )
}

// ==================== WEBCAM OVERLAY ====================
function WebcamOverlay({ webcam }) {
  if (webcam.isLoading) return (
    <div className="fixed top-[4.5rem] right-2 z-40 w-32 sm:w-44 sm:right-4">
      <div className="rounded-xl overflow-hidden shadow-lg border border-primary/10 bg-primary p-4 text-center">
        <Loader2 className="w-5 h-5 text-accent animate-spin mx-auto mb-2" /><p className="text-xs text-white/50">Loading camera...</p>
      </div>
    </div>
  )
  if (!webcam.isActive) return null
  const m = webcam.metrics
  return (
    <div className="fixed top-[4.5rem] right-2 z-40 w-32 sm:w-44 sm:right-4">
      <div className="rounded-xl overflow-hidden shadow-lg border border-primary/10 bg-primary">
        <video ref={webcam.videoRef} className="w-full h-28 object-cover bg-black" muted playsInline autoPlay />
        <div className="p-2 space-y-1">
          {[{ label: 'Confidence', val: m.confidence }, { label: 'Eye Contact', val: m.eyeContact }, { label: 'Engagement', val: m.engagement }].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-xs text-white/60"><span>{item.label}</span><span className="font-mono">{Math.round(item.val || 0)}%</span></div>
              <div className="w-full bg-white/10 rounded-full h-1"><div className={`rounded-full h-1 transition-all duration-500 ${BAR_COLOR(item.val)}`} style={{ width: `${item.val || 0}%` }} /></div>
            </div>
          ))}
          <p className="text-xs text-white/40 text-center capitalize">{m.currentExpression}</p>
        </div>
      </div>
    </div>
  )
}

// ==================== CHAT ====================
function InterviewChat({ session: initialSession, voiceEnabled, webcamEnabled, onComplete }) {
  const [session, setSession] = useState(initialSession)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const answerStartRef = useRef(Date.now())
  const voice = useVoice()
  const webcam = useWebcam()

  // Timer — uses timestamp number, not Date object
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [session.startedAt])

  // Start webcam
  useEffect(() => { if (webcamEnabled) webcam.startCamera() }, [webcamEnabled])

  // First question
  useEffect(() => {
    const q = session.questions[0]
    if (!q) return
    setMessages([{ id: msgId(), type: 'question', text: q.question, qType: q.question_type || 'behavioral', qNum: 1 }])
    if (voiceEnabled) setTimeout(() => voice.speak(q.question), 500)
    answerStartRef.current = Date.now()
  }, [])

  // Auto-scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Voice transcript → input
  useEffect(() => { if (voice.transcript) setInput(voice.transcript) }, [voice.transcript])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || done) return
    if (text.split(' ').length < 3) { toast.error('Give a more detailed answer'); return }

    setSending(true)
    voice.stopListening()
    voice.stopSpeaking()
    const timeTaken = Math.round((Date.now() - answerStartRef.current) / 1000)

    setMessages(prev => [...prev, { id: msgId(), type: 'answer', text }])
    setInput('')
    voice.resetTranscript()
    setMessages(prev => [...prev, { id: msgId(), type: 'typing' }])

    try {
      const result = await submitAnswer(session, text, timeTaken)

      // Update session state for React
      if (result.updatedSession) setSession(result.updatedSession)

      setMessages(prev => {
        const clean = prev.filter(m => m.type !== 'typing')
        const msgs = [...clean]
        msgs.push({ id: msgId(), type: 'feedback', score: result.evaluation.overall, text: result.evaluation.feedback })
        if (result.nextQuestion) {
          msgs.push({ id: msgId(), type: 'question', text: result.nextQuestion.question, qType: result.nextQuestion.question_type, qNum: result.nextQuestion.question_number })
        }
        return msgs
      })

      if (result.nextQuestion && voiceEnabled) {
        voice.speak(result.nextQuestion.question)
        setTimeout(() => voice.startListening(), 3500)
      }

      answerStartRef.current = Date.now()

      if (result.isComplete) {
        setDone(true)
        voice.stopListening()
        setMessages(prev => [...prev, { id: msgId(), type: 'system', text: 'Interview complete! Generating your scorecard...' }])
        try {
          const scorecard = await generateScorecard(session)
          if (webcam.isActive) {
            scorecard.webcam_metrics = { ...webcam.metrics }
            webcam.stopCamera()
          }
          onComplete(scorecard)
        } catch {
          toast.error('Scorecard generation failed')
          onComplete({ overall_score: 50, grade: 'C', summary: 'Scorecard could not be generated.', category_scores: {}, top_strengths: [], areas_to_improve: [], sample_better_answers: [], final_tip: 'Try again later.' })
        }
      }
    } catch (err) {
      console.error('Interview error:', err)
      setMessages(prev => [...prev.filter(m => m.type !== 'typing'), { id: msgId(), type: 'system', text: `Error: ${err.message || 'AI failed'}. Try sending again.` }])
      toast.error(err.message || 'Failed. Try again.')
      if (voiceEnabled) setTimeout(() => voice.startListening(), 500)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, done, session, voiceEnabled])

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const currentQNum = session.currentQuestion + 1

  return (
    <div className="max-w-3xl mx-auto px-4 flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3 border-b border-primary/10">
        <div><p className="font-semibold text-primary text-sm">{session.job.title}</p><p className="text-xs text-primary/40">{session.job.company_name}</p></div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-primary/60">Q{currentQNum}/{session.totalQuestions}</span>
          <span className="text-xs font-mono text-primary/40 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(elapsed)}</span>
          {voiceEnabled && <span className="badge bg-accent/10 text-accent text-xs"><Volume2 className="w-3 h-3" /> Voice</span>}
          {webcam.isActive && <span className="badge bg-accent/10 text-accent text-xs"><Camera className="w-3 h-3" /> Cam</span>}
        </div>
      </div>

      {/* Webcam — fixed to screen corner, outside chat scroll */}
      <WebcamOverlay webcam={webcam} />

      {/* Chat — add right padding when webcam active so text doesn't go behind it */}
      <div className={`flex-1 overflow-y-auto py-4 space-y-4 ${webcam.isActive ? 'pr-28 sm:pr-48' : ''}`}>

        {webcam.isActive && (webcam.metrics.confidence || 0) < 40 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 flex-shrink-0" /> Tip: Maintain eye contact with the camera and show enthusiasm.
          </div>
        )}

        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={msg.type === 'answer' ? 'flex justify-end' : ''}>
            {msg.type === 'question' && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Bot className="w-4 h-4 text-accent" /></div>
                <div>
                  <span className={`badge text-xs mb-1 ${TYPE_COLORS[msg.qType] || 'bg-primary/10 text-primary/60'}`}>{(msg.qType || '').replace('_', ' ')}</span>
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-primary">{msg.text}</div>
                </div>
              </div>
            )}
            {msg.type === 'answer' && <div className="bg-accent text-white rounded-2xl rounded-br-md px-4 py-3 text-sm max-w-[85%]">{msg.text}</div>}
            {msg.type === 'feedback' && (
              <div className="ml-11 bg-primary/5 rounded-lg px-3 py-2 text-xs text-primary/60">
                <span className={`font-mono font-bold ${SCORE_COLOR((msg.score || 0) * 10)}`}>{msg.score}/10</span> &middot; {msg.text}
              </div>
            )}
            {msg.type === 'typing' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-accent" /></div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                  <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" /><div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {msg.type === 'system' && <div className="text-center text-xs text-primary/40 py-2">{msg.text}</div>}
          </motion.div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input — hide after interview completes */}
      {!done && (
        <div className="border-t border-primary/10 py-3">
          <div className="flex gap-2 items-end">
            {voiceEnabled && (
              <button onClick={voice.isListening ? voice.stopListening : voice.startListening}
                className={`p-2.5 rounded-lg transition-all flex-shrink-0 ${voice.isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/5 text-primary/50 hover:bg-primary/10'}`}>
                {voice.isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              disabled={sending} placeholder={voice.isListening ? 'Listening... speak now' : 'Type your answer...'}
              rows={1} className="input-field flex-1 resize-none min-h-[42px] max-h-[120px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} />
            <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-accent p-2.5 flex-shrink-0 disabled:opacity-40">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          {voice.isListening && <p className="text-xs text-red-500 mt-1 animate-pulse">Recording... click mic to stop, or press Send</p>}
        </div>
      )}
    </div>
  )
}

// ==================== SCORECARD ====================
function Scorecard({ data, jobTitle, onReset }) {
  const [expandedBetter, setExpandedBetter] = useState(null)
  if (!data) return <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" /><p className="text-primary/50 mt-4">Generating scorecard...</p></div>

  const cats = data.category_scores || {}
  const overallScore = Number(data.overall_score) || 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto mb-4 ${SCORE_BG(overallScore)}`}>
            <div><span className={`text-3xl font-bold font-mono ${SCORE_COLOR(overallScore)}`}>{overallScore}</span><span className="text-xs text-primary/40 block">/100</span></div>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className={`badge py-1 px-3 text-sm font-bold ${SCORE_BG(overallScore)}`}>{data.grade || '?'}</span>
            <span className="badge bg-primary/10 text-primary/70 py-1 px-3 text-sm">{data.hire_recommendation || '?'}</span>
          </div>
          <h2 className="text-xl font-bold text-primary">{jobTitle} — Results</h2>
          {data.summary && <p className="text-primary/50 mt-2 text-sm max-w-lg mx-auto">{data.summary}</p>}
        </div>

        {Object.keys(cats).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {Object.entries(cats).map(([key, val]) => {
              const score = Number(val?.score) || 0
              return (
                <div key={key} className={`card border ${SCORE_BG(score)}`}>
                  <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-primary capitalize">{key.replace(/_/g, ' ')}</span><span className={`text-lg font-bold font-mono ${SCORE_COLOR(score)}`}>{score}</span></div>
                  {val?.feedback && <p className="text-xs text-primary/50">{val.feedback}</p>}
                </div>
              )
            })}
          </div>
        )}

        {data.webcam_metrics && (
          <div className="card mb-4 border-l-4 border-l-blue-500">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-blue-500" /> Body Language</h3>
            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Confidence', val: data.webcam_metrics.confidence }, { label: 'Eye Contact', val: data.webcam_metrics.eyeContact }, { label: 'Engagement', val: data.webcam_metrics.engagement }].map(item => (
                <div key={item.label} className="text-center">
                  <span className={`text-xl font-bold font-mono ${SCORE_COLOR(item.val)}`}>{Math.round(item.val || 0)}%</span>
                  <p className="text-xs text-primary/50">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.top_strengths?.length > 0 && (
          <div className="card border-l-4 border-l-emerald-500 mb-4">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Top Strengths</h3>
            <ul className="space-y-1.5">{data.top_strengths.map((s, i) => <li key={i} className="text-sm text-primary/70">&bull; {s}</li>)}</ul>
          </div>
        )}

        {data.areas_to_improve?.length > 0 && (
          <div className="card border-l-4 border-l-amber-500 mb-4">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> Areas to Improve</h3>
            <div className="space-y-3">{data.areas_to_improve.map((a, i) => <div key={i}><p className="text-sm font-medium text-primary">{a.area}</p><p className="text-xs text-primary/50">{a.suggestion}</p></div>)}</div>
          </div>
        )}

        {data.sample_better_answers?.length > 0 && (
          <div className="card mb-4">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" /> Better Answers</h3>
            <div className="space-y-2">{data.sample_better_answers.map((sa, i) => (
              <div key={i}>
                <button onClick={() => setExpandedBetter(expandedBetter === i ? null : i)} className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-primary/5 hover:bg-primary/10">
                  <span className="text-sm text-primary">Question {sa.question_number}</span>
                  {expandedBetter === i ? <ChevronUp className="w-4 h-4 text-primary/40" /> : <ChevronDown className="w-4 h-4 text-primary/40" />}
                </button>
                {expandedBetter === i && <div className="p-3 space-y-2 text-sm"><p className="text-primary/50">{sa.original_answer_summary}</p><p className="text-emerald-700 bg-emerald-50 rounded-lg p-2"><strong>Better:</strong> {sa.improved_answer}</p></div>}
              </div>
            ))}</div>
          </div>
        )}

        {data.final_tip && (
          <div className="bg-accent/5 border-2 border-accent/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Award className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div><p className="font-semibold text-primary text-sm">Key Takeaway</p><p className="text-sm text-primary/70 mt-1">{data.final_tip}</p></div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={onReset} className="btn-secondary">Practice Again</button>
          <Link to="/jobs" className="btn-accent">Browse Jobs</Link>
        </div>
      </motion.div>
    </div>
  )
}

// ==================== MAIN ====================
export default function InterviewPractice() {
  const { user, profile } = useAuth()
  const [phase, setPhase] = useState('setup')
  const [session, setSession] = useState(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [webcamEnabled, setWebcamEnabled] = useState(false)
  const [scorecard, setScorecard] = useState(null)
  const [starting, setStarting] = useState(false)

  async function handleStart(job, voice, webcam) {
    setStarting(true)
    setVoiceEnabled(voice)
    setWebcamEnabled(webcam)
    try {
      const s = await startInterview(job, profile)
      setSession(s)
      setPhase('interview')
    } catch (err) { toast.error('Failed to start: ' + err.message) }
    finally { setStarting(false) }
  }

  async function handleComplete(sc) {
    setScorecard(sc)
    setPhase('scorecard')

    // Save interview to database
    if (user && session) {
      const { error } = await supabase.from('interview_sessions').insert({
        candidate_id: user.uid,
        job_id: session.job?.id || null,
        job_title: session.job?.title || 'Interview',
        company_name: session.job?.company_name || '',
        overall_score: Number(sc.overall_score) || 0,
        grade: sc.grade || null,
        hire_recommendation: sc.hire_recommendation || null,
        summary: sc.summary || null,
        scorecard: sc,
        questions_answered: session.answers?.length || 0,
      })
      if (error) {
        console.error('Failed to save interview:', error.message)
        toast.error('Interview completed but failed to save: ' + error.message)
      } else {
        toast.success('Interview saved to your dashboard!')
      }
    }
  }

  if (starting) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-accent" /><p className="ml-3 text-primary/50">Starting interview...</p></div>
  if (phase === 'setup') return <SetupScreen onStart={handleStart} />
  if (phase === 'interview' && session) return <InterviewChat session={session} voiceEnabled={voiceEnabled} webcamEnabled={webcamEnabled} onComplete={handleComplete} />
  if (phase === 'scorecard') return <Scorecard data={scorecard} jobTitle={session?.job?.title || 'Interview'} onReset={() => { setSession(null); setScorecard(null); setPhase('setup') }} />
  return null
}
