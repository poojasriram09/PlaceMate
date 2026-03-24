import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { CheckCircle2, AlertTriangle, Award, Target, Sparkles, ChevronDown, ChevronUp, Camera, ArrowLeft } from 'lucide-react'

const SCORE_COLOR = (s) => { const n = Number(s) || 0; return n >= 80 ? 'text-emerald-600' : n >= 60 ? 'text-blue-600' : n >= 40 ? 'text-amber-600' : 'text-red-600' }
const SCORE_BG = (s) => { const n = Number(s) || 0; return n >= 80 ? 'bg-emerald-50 border-emerald-200' : n >= 60 ? 'bg-blue-50 border-blue-200' : n >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200' }

export default function InterviewResult() {
  const { id } = useParams()
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedBetter, setExpandedBetter] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', id)
        .eq('candidate_id', user.uid)
        .single()
      setSession(data)
      setLoading(false)
    }
    if (user) load()
  }, [id, user])

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />
  if (!session) return <div className="text-center py-20"><p className="text-primary/50">Interview not found.</p><Link to="/dashboard" className="btn-accent mt-4 inline-block">Back to Dashboard</Link></div>

  const data = session.scorecard || {}
  const cats = data.category_scores || {}
  const overallScore = Number(data.overall_score || session.overall_score) || 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-primary/50 hover:text-accent mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto mb-4 ${SCORE_BG(overallScore)}`}>
            <div><span className={`text-3xl font-bold font-mono ${SCORE_COLOR(overallScore)}`}>{overallScore}</span><span className="text-xs text-primary/40 block">/100</span></div>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            {(data.grade || session.grade) && <span className={`badge py-1 px-3 text-sm font-bold ${SCORE_BG(overallScore)}`}>{data.grade || session.grade}</span>}
            {(data.hire_recommendation || session.hire_recommendation) && <span className="badge bg-primary/10 text-primary/70 py-1 px-3 text-sm">{data.hire_recommendation || session.hire_recommendation}</span>}
          </div>
          <h2 className="text-xl font-bold text-primary">{session.job_title} at {session.company_name}</h2>
          <p className="text-xs text-primary/40 mt-1">{session.questions_answered || 0} questions &middot; {new Date(session.created_at).toLocaleDateString()}</p>
          {(data.summary || session.summary) && <p className="text-primary/50 mt-3 text-sm max-w-lg mx-auto">{data.summary || session.summary}</p>}
        </div>

        {/* Category Scores */}
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

        {/* Webcam */}
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

        {/* Strengths */}
        {data.top_strengths?.length > 0 && (
          <div className="card border-l-4 border-l-emerald-500 mb-4">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Top Strengths</h3>
            <ul className="space-y-1.5">{data.top_strengths.map((s, i) => <li key={i} className="text-sm text-primary/70">&bull; {s}</li>)}</ul>
          </div>
        )}

        {/* Areas to Improve */}
        {data.areas_to_improve?.length > 0 && (
          <div className="card border-l-4 border-l-amber-500 mb-4">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> Areas to Improve</h3>
            <div className="space-y-3">{data.areas_to_improve.map((a, i) => <div key={i}><p className="text-sm font-medium text-primary">{a.area}</p><p className="text-xs text-primary/50">{a.suggestion}</p></div>)}</div>
          </div>
        )}

        {/* Better Answers */}
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

        {/* Final Tip */}
        {data.final_tip && (
          <div className="bg-accent/5 border-2 border-accent/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Award className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div><p className="font-semibold text-primary text-sm">Key Takeaway</p><p className="text-sm text-primary/70 mt-1">{data.final_tip}</p></div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
          <Link to="/interview" className="btn-accent">Practice Again</Link>
        </div>
      </motion.div>
    </div>
  )
}
