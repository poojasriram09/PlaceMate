import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { callGroq } from '../lib/ai'
import { BookOpen, Clock, CheckCircle2, XCircle, Loader2, ArrowRight, Building2, Target, Brain, Calculator, Code, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const COMPANIES = [
  { id: 'tcs', name: 'TCS', logo: '🏢' },
  { id: 'infosys', name: 'Infosys', logo: '🔷' },
  { id: 'wipro', name: 'Wipro', logo: '🌿' },
  { id: 'cognizant', name: 'Cognizant', logo: '🔵' },
  { id: 'accenture', name: 'Accenture', logo: '▶' },
  { id: 'amazon', name: 'Amazon', logo: '📦' },
  { id: 'google', name: 'Google', logo: '🔍' },
  { id: 'microsoft', name: 'Microsoft', logo: '🪟' },
  { id: 'deloitte', name: 'Deloitte', logo: '🟢' },
  { id: 'capgemini', name: 'Capgemini', logo: '🔹' },
  { id: 'hcl', name: 'HCL', logo: '💻' },
  { id: 'techm', name: 'Tech Mahindra', logo: '🔴' },
]

const CATEGORIES = [
  { id: 'quantitative', name: 'Quantitative Aptitude', icon: Calculator, desc: 'Percentages, profit/loss, time & work, probability' },
  { id: 'logical', name: 'Logical Reasoning', icon: Brain, desc: 'Puzzles, seating arrangement, syllogisms, blood relations' },
  { id: 'verbal', name: 'Verbal Ability', icon: MessageSquare, desc: 'Reading comprehension, grammar, sentence correction' },
  { id: 'coding', name: 'Coding / Technical', icon: Code, desc: 'DSA, output prediction, pseudo code, programming basics' },
]

const TIME_PER_QUESTION = 60

export default function AptitudePrep() {
  const { profile } = useAuth()
  const [phase, setPhase] = useState('select') // select | quiz | results
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [loading, setLoading] = useState(false)
  const [showExplanation, setShowExplanation] = useState({})

  // Timer
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

  async function generatePYQs() {
    setLoading(true)
    try {
      const qs = await callGroq(`Generate 10 aptitude test questions in the style of ${selectedCompany.name}'s campus placement exam.

Category: ${selectedCategory.name}
Company: ${selectedCompany.name}

IMPORTANT RULES:
- Questions must be in the EXACT style and difficulty level of ${selectedCompany.name}'s actual placement test
- For ${selectedCategory.id === 'quantitative' ? 'Quantitative: include percentages, ratios, time-speed-distance, profit/loss, averages, number series, probability. Show the math problem clearly.' : selectedCategory.id === 'logical' ? 'Logical Reasoning: include seating arrangements, coding-decoding, blood relations, direction sense, syllogisms, puzzles, pattern recognition.' : selectedCategory.id === 'verbal' ? 'Verbal Ability: include sentence correction, fill in the blanks, synonyms/antonyms, reading comprehension, para jumbles, error spotting.' : 'Coding/Technical: include output prediction, time complexity, data structure questions, pseudo code analysis, basic programming concepts.'}
- Each question must have exactly 4 options with ONE correct answer
- Include a clear EXPLANATION for each answer (2-3 sentences explaining the solution step by step)
- "correct" is the INDEX (0-3) of the right option
- Make questions progressively harder (first 3 easy, next 4 medium, last 3 hard)
- These should feel like REAL previous year questions from ${selectedCompany.name}

Return ONLY valid JSON array:
[
  {
    "question": "The question text with all necessary data",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 2,
    "explanation": "Step-by-step solution explaining why option C is correct",
    "difficulty": "easy",
    "topic": "specific topic like Percentages or Seating Arrangement"
  }
]`)

      if (!Array.isArray(qs) || qs.length < 5) throw new Error('Bad response')
      const valid = qs.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number')
      if (valid.length < 5) throw new Error('Not enough questions')
      setQuestions(valid.slice(0, 10))
      setPhase('quiz')
      setCurrentQ(0)
      setResults([])
      setTimeLeft(TIME_PER_QUESTION)
    } catch (err) {
      toast.error('Failed to generate questions: ' + (err.message || 'Try again'))
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = useCallback((optionIndex) => {
    const q = questions[currentQ]
    if (!q) return
    const correct = optionIndex === q.correct
    const answerText = optionIndex != null ? q.options[optionIndex] : '(timed out)'

    setResults(prev => [...prev, { question: q.question, answer: answerText, expected: q.options[q.correct], correct, explanation: q.explanation, topic: q.topic, timeUsed: TIME_PER_QUESTION - timeLeft }])

    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
      setTimeLeft(TIME_PER_QUESTION)
    } else {
      setPhase('results')
    }
  }, [currentQ, questions, timeLeft])

  // ====== SELECT SCREEN ======
  if (phase === 'select') return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><BookOpen className="w-8 h-8 text-accent" /></div>
          <h1 className="text-xl sm:text-3xl font-bold text-primary">Aptitude Test Prep</h1>
          <p className="text-primary/50 mt-2">Practice company-wise previous year questions. Select a company and category.</p>
        </div>

        {/* Company Selection */}
        <div className="card mb-6">
          <h3 className="font-semibold text-primary mb-4">Select Company</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {COMPANIES.map(c => (
              <button key={c.id} onClick={() => setSelectedCompany(c)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${selectedCompany?.id === c.id ? 'border-accent bg-accent/5' : 'border-primary/10 hover:border-primary/20'}`}>
                <span className="text-2xl block mb-1">{c.logo}</span>
                <p className="text-sm font-medium text-primary">{c.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        <div className="card mb-6">
          <h3 className="font-semibold text-primary mb-4">Select Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${selectedCategory?.id === cat.id ? 'border-accent bg-accent/5' : 'border-primary/10 hover:border-primary/20'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedCategory?.id === cat.id ? 'bg-accent/10' : 'bg-primary/5'}`}>
                  <cat.icon className={`w-5 h-5 ${selectedCategory?.id === cat.id ? 'text-accent' : 'text-primary/40'}`} />
                </div>
                <div>
                  <p className="font-medium text-primary text-sm">{cat.name}</p>
                  <p className="text-xs text-primary/50 mt-0.5">{cat.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={generatePYQs} disabled={!selectedCompany || !selectedCategory || loading}
          className="btn-accent w-full py-3 disabled:opacity-40">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating {selectedCompany?.name} questions...</> : <>Start Practice <ArrowRight className="w-4 h-4" /></>}
        </button>

        {selectedCompany && selectedCategory && (
          <p className="text-center text-xs text-primary/40 mt-3">
            10 questions &middot; {TIME_PER_QUESTION}s each &middot; {selectedCompany.name} {selectedCategory.name} PYQ style
          </p>
        )}
      </motion.div>
    </div>
  )

  // ====== QUIZ ======
  if (phase === 'quiz') {
    const q = questions[currentQ]
    if (!q) return null

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedCompany.logo}</span>
              <span className="font-semibold text-primary text-sm">{selectedCompany.name}</span>
              <span className="badge bg-accent/10 text-accent text-xs">{selectedCategory.name}</span>
            </div>
            <p className="text-sm text-primary/50 mt-1">Question {currentQ + 1} of {questions.length}</p>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timeLeft <= 15 ? 'text-red-600 animate-pulse' : 'text-primary/70'}`}>
            <Clock className="w-4 h-4" /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>

        <div className="w-full bg-primary/10 rounded-full h-1 mb-6">
          <div className="bg-accent rounded-full h-1 transition-all" style={{ width: `${(currentQ / questions.length) * 100}%` }} />
        </div>

        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge bg-slate-100 text-primary/60 text-xs capitalize">{q.difficulty}</span>
            {q.topic && <span className="badge bg-primary/5 text-primary/40 text-xs">{q.topic}</span>}
          </div>
          <h3 className="text-base font-semibold text-primary mb-5 leading-relaxed whitespace-pre-wrap">{q.question}</h3>

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

        {results.length > 0 && (
          <div className="flex gap-1.5 mt-4 justify-center">
            {results.map((r, i) => <div key={i} className={`w-3 h-3 rounded-full ${r.correct ? 'bg-emerald-500' : 'bg-red-500'}`} />)}
            {Array.from({ length: questions.length - results.length }).map((_, i) => <div key={`p-${i}`} className="w-3 h-3 rounded-full bg-primary/10" />)}
          </div>
        )}
      </div>
    )
  }

  // ====== RESULTS ======
  if (phase === 'results') {
    const correctCount = results.filter(r => r.correct).length
    const percentage = Math.round((correctCount / results.length) * 100)
    const avgTime = Math.round(results.reduce((s, r) => s + r.timeUsed, 0) / results.length)

    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Score Header */}
          <div className="text-center mb-8">
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto mb-4 ${percentage >= 70 ? 'bg-emerald-50 border-emerald-300' : percentage >= 50 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
              <div>
                <span className={`text-3xl font-bold font-mono ${percentage >= 70 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{percentage}%</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-primary">{selectedCompany.name} — {selectedCategory.name}</h2>
            <p className="text-primary/50 text-sm mt-1">{correctCount}/{results.length} correct &middot; Avg {avgTime}s per question</p>
          </div>

          {/* Topic-wise breakdown */}
          {(() => {
            const topics = {}
            results.forEach(r => {
              const t = r.topic || 'General'
              if (!topics[t]) topics[t] = { correct: 0, total: 0 }
              topics[t].total++
              if (r.correct) topics[t].correct++
            })
            return Object.keys(topics).length > 1 ? (
              <div className="card mb-6">
                <h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-accent" /> Topic-wise Performance</h3>
                <div className="space-y-2">
                  {Object.entries(topics).map(([topic, data]) => (
                    <div key={topic} className="flex items-center justify-between">
                      <span className="text-sm text-primary/70">{topic}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-primary/10 rounded-full h-2"><div className={`rounded-full h-2 ${data.correct / data.total >= 0.7 ? 'bg-emerald-500' : data.correct / data.total >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${(data.correct / data.total) * 100}%` }} /></div>
                        <span className="text-xs font-mono text-primary/50 w-10 text-right">{data.correct}/{data.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* Question-by-question with explanations */}
          <div className="space-y-3 mb-6">
            {results.map((r, i) => (
              <div key={i} className={`card !p-4 border-l-4 ${r.correct ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                <div className="flex items-start gap-2 mb-2">
                  {r.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm text-primary/80 font-medium">Q{i + 1}. {r.question}</p>
                    <div className="mt-1 text-xs">
                      <span className="text-primary/40">Your answer: </span>
                      <span className={r.correct ? 'text-emerald-700' : 'text-red-600'}>{r.answer}</span>
                    </div>
                    {!r.correct && <div className="text-xs"><span className="text-primary/40">Correct: </span><span className="text-emerald-700">{r.expected}</span></div>}
                  </div>
                  <button onClick={() => setShowExplanation(prev => ({ ...prev, [i]: !prev[i] }))} className="text-xs text-accent hover:text-accent-dark font-medium flex-shrink-0">
                    {showExplanation[i] ? 'Hide' : 'Explain'}
                  </button>
                </div>
                {showExplanation[i] && r.explanation && (
                  <div className="mt-2 bg-accent/5 border border-accent/10 rounded-lg p-3 text-xs text-primary/70 leading-relaxed">
                    <strong className="text-accent">Explanation:</strong> {r.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => { setPhase('select'); setQuestions([]); setResults([]); setShowExplanation({}) }} className="btn-secondary">Change Company/Category</button>
            <button onClick={() => { setLoading(true); generatePYQs() }} className="btn-accent">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Practice More'} {selectedCompany.name}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
