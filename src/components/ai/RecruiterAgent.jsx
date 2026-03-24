import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { X, Send, Loader2, Zap, Bot } from 'lucide-react'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

const SUGGESTIONS = [
  'Screen all applicants for my latest job',
  'Who are my top 3 candidates?',
  'Draft rejection emails for weak applicants',
  'Generate interview questions for top picks',
  'Summarize my hiring pipeline',
]

async function askAI(systemPrompt, chatHistory, userMessage) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: userMessage },
      ],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Something went wrong. Try again.'
}

export default function RecruiterAgent() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [context, setContext] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => { if (open && !context && user && profile?.role === 'recruiter') loadContext() }, [open, user, profile])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  if (!user || profile?.role !== 'recruiter') return null

  async function loadContext() {
    const { data: myJobs } = await supabase.from('jobs').select('id, title, company_name, skills_required, location, job_type, application_count, is_active').eq('recruiter_id', user.uid).order('created_at', { ascending: false })
    const jobIds = (myJobs || []).map(j => j.id)

    let apps = []
    if (jobIds.length > 0) {
      const { data } = await supabase.from('applications')
        .select('id, status, match_score, match_reasoning, cover_letter, created_at, job_id, jobs(title), profiles(full_name, email, skills, candidate_year, education, skills_verified, quiz_scores)')
        .in('job_id', jobIds)
        .order('match_score', { ascending: false, nullsFirst: false })
        .limit(50)
      apps = data || []
    }

    setContext({ jobs: myJobs || [], apps })
    setMessages([{
      role: 'ai',
      text: `Hi ${profile?.full_name?.split(' ')[0]}! I'm your Hiring Agent. I can see your ${(myJobs || []).length} job posting(s) and ${apps.length} total application(s). Ask me to screen candidates, draft emails, or generate interview questions.`,
    }])
  }

  function buildSystemPrompt() {
    return `You are a Hiring Agent AI for PlaceMate. You work for recruiter "${profile?.full_name}" at "${profile?.company_name || 'their company'}". You have COMPLETE real data about their jobs and all applicants. Use ACTUAL names, skills, and scores in every response.

═══ RECRUITER'S JOB POSTINGS ═══
${(context?.jobs || []).map(j => `• "${j.title}" | ${j.location} | ${j.job_type} | Skills needed: ${(j.skills_required || []).join(', ')} | ${j.application_count || 0} applicants | ${j.is_active ? 'ACTIVE' : 'INACTIVE'}`).join('\n') || 'No jobs posted'}

═══ ALL APPLICANTS (with full profile data) ═══
${(context?.apps || []).map(a => {
  const p = a.profiles
  const quizInfo = p?.quiz_scores ? Object.entries(p.quiz_scores).map(([skill, q]) => `${skill}: ${q.score}/${q.total} ${q.passed ? '✅' : '❌'}`).join(', ') : 'No quizzes'
  return `• ${p?.full_name || '?'} (${p?.email || '?'}) applied for "${a.jobs?.title || '?'}"
  Status: ${a.status} | Match: ${a.match_score ? Math.round(a.match_score) + '%' : 'N/A'}
  Skills: ${(p?.skills || []).join(', ')} | Verified: ${(p?.skills_verified || []).join(', ') || 'None'}
  Year: ${p?.candidate_year ? p.candidate_year + (['st','nd','rd','th'][Math.min(p.candidate_year - 1, 3)]) + ' year' : '?'} | Education: ${p?.education || '?'}
  Quiz results: ${quizInfo}
  Cover letter: ${a.cover_letter ? 'Yes — "' + a.cover_letter.substring(0, 100) + '..."' : 'None'}
  ${a.match_reasoning ? 'AI reasoning: ' + a.match_reasoning : ''}`
}).join('\n\n') || 'No applications yet'}

═══ YOUR INSTRUCTIONS ═══
1. ALWAYS use real candidate names, real job titles, real scores from above.
2. When screening: rank candidates by match score + verified skills + quiz results. Be decisive — "HIRE", "CONSIDER", or "PASS" for each.
3. When drafting emails: use the candidate's actual name, the actual job title, and personalize based on their profile.
4. When generating interview questions: tailor to the specific job's skills AND the specific candidate's background.
5. When summarizing: give actual numbers — "3 applied, 1 shortlisted, 2 pending review".
6. Highlight verified skills (passed quiz) vs unverified claims — this is a KEY trust signal.
7. If a candidate has high match score but no verified skills, flag it: "Strong on paper but unverified".
8. Keep responses under 300 words. Use bullet points and clear formatting.`
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const aiText = await askAI(buildSystemPrompt(), messages, text)
      setMessages(prev => [...prev, { role: 'ai', text: aiText }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Try again.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary-dark transition-colors group">
            <Zap className="w-6 h-6 text-accent group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl border border-primary/10 flex flex-col overflow-hidden">

            <div className="bg-primary px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-accent" /></div>
                <div><p className="text-white font-semibold text-sm">Hiring Agent</p><p className="text-white/40 text-xs">Knows your jobs + all applicants</p></div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!context && <div className="text-center py-8"><Loader2 className="w-6 h-6 text-accent animate-spin mx-auto mb-2" /><p className="text-xs text-primary/40">Loading hiring data...</p></div>}
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex gap-2'}>
                  {msg.role === 'ai' && <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Zap className="w-3.5 h-3.5 text-primary" /></div>}
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-white rounded-br-md' : 'bg-slate-100 text-primary rounded-bl-md'}`}>{msg.text}</div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-primary" /></div>
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md px-3 py-2 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {messages.length <= 1 && context && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, i) => <button key={i} onClick={() => setInput(s)} className="text-xs bg-primary/5 text-primary/70 border border-primary/10 rounded-full px-2.5 py-1 hover:bg-primary/10">{s}</button>)}
              </div>
            )}

            <div className="border-t border-primary/10 px-3 py-2 flex gap-2 flex-shrink-0">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                disabled={sending || !context} placeholder="Ask your hiring agent..."
                className="flex-1 text-sm border border-primary/10 rounded-lg px-3 py-2 bg-slate-50 placeholder-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20" />
              <button onClick={handleSend} disabled={sending || !input.trim() || !context}
                className="bg-primary text-white rounded-lg p-2 disabled:opacity-40 hover:bg-primary-dark transition-colors">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
