import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { MessageSquare, X, Send, Loader2, Sparkles, Bot } from 'lucide-react'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

const SUGGESTIONS = [
  'What jobs match my skills?',
  'What skills should I learn next?',
  'Write me a cover letter',
  'Prepare me for an interview',
  'How can I improve my profile?',
]

async function askAI(systemPrompt, chatHistory, userMessage) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: userMessage },
      ],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Sorry, something went wrong. Try again.'
}

export default function CareerCopilot() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [context, setContext] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (!open || context || !user || profile?.role !== 'candidate') return
    loadContext()
  }, [open, user, profile])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  if (!user || profile?.role !== 'candidate') return null

  async function loadContext() {
    const [{ data: jobs }, { data: apps }, { data: quizzes }] = await Promise.all([
      supabase.from('jobs').select('title, company_name, skills_required, location, job_type, target_years, salary_min, salary_max').eq('is_active', true).limit(30),
      supabase.from('applications').select('status, match_score, match_reasoning, jobs(title, company_name)').eq('candidate_id', user.uid).order('created_at', { ascending: false }).limit(10),
      supabase.from('skill_quizzes').select('skill, score, total, passed').eq('candidate_id', user.uid).order('created_at', { ascending: false }).limit(20),
    ])
    setContext({ jobs: jobs || [], apps: apps || [], quizzes: quizzes || [] })
    setMessages([{
      role: 'ai',
      text: `Hi ${profile?.full_name?.split(' ')[0] || 'there'}! I'm your Career Copilot. I can see your profile, ${(profile?.skills || []).length} skills, ${(apps || []).length} applications, and ${(jobs || []).length} jobs on the platform. Ask me anything!`,
    }])
  }

  function buildSystemPrompt() {
    return `You are a Career Copilot AI for PlaceMate campus hiring platform. You have COMPLETE real-time data about this candidate and every job on the platform. Use this data in EVERY response — never give generic advice.

═══ CANDIDATE PROFILE ═══
Name: ${profile?.full_name || 'Unknown'}
Email: ${profile?.email || '?'}
Skills: ${(profile?.skills || []).join(', ') || 'NONE — tell them to upload resume'}
Verified Skills (passed quiz): ${(profile?.skills_verified || []).join(', ') || 'None verified yet'}
Year of Study: ${profile?.candidate_year ? profile.candidate_year + (['st','nd','rd','th'][Math.min(profile.candidate_year - 1, 3)]) + ' year' : 'Not specified'}
Education: ${profile?.education || 'Not specified'}
Location: ${profile?.location || 'Not specified'}
Resume: ${profile?.resume_url ? 'Uploaded' : 'NOT uploaded — this is critical, tell them to upload'}

═══ QUIZ RESULTS ═══
${(context?.quizzes || []).map(q => `• ${q.skill}: ${q.score}/${q.total} ${q.passed ? '✅ PASSED' : '❌ FAILED'}`).join('\n') || 'No quizzes taken yet'}

═══ THEIR APPLICATIONS ═══
${(context?.apps || []).map(a => `• ${a.jobs?.title} at ${a.jobs?.company_name} — Status: ${a.status.toUpperCase()}, Match: ${a.match_score ? Math.round(a.match_score) + '%' : 'N/A'}${a.match_reasoning ? ' (' + a.match_reasoning + ')' : ''}`).join('\n') || 'No applications submitted yet'}

═══ ALL ACTIVE JOBS ON PLATFORM (${(context?.jobs || []).length} total) ═══
${(context?.jobs || []).map(j => `• "${j.title}" at ${j.company_name} | Location: ${j.location} | Type: ${j.job_type} | Skills: ${(j.skills_required || []).join(', ')} | For: ${(j.target_years || []).length > 0 ? j.target_years.map(y => y + ['st','nd','rd','th'][Math.min(y-1,3)] + ' yr').join(', ') : 'All years'} | Salary: ${j.salary_min ? '₹' + j.salary_min + (j.salary_max ? '-₹' + j.salary_max : '+') : 'Not disclosed'}`).join('\n') || 'No jobs available'}

═══ YOUR INSTRUCTIONS ═══
1. ALWAYS reference the real data above. Name actual jobs, actual skills, actual scores.
2. When they ask about matching jobs, compare THEIR skills against each job's skills_required and list the best matches.
3. When they ask about skill gaps, compare their skills vs what the TOP jobs need and identify what's missing.
4. When they ask for a cover letter, use their ACTUAL skills, experience, and education — and the ACTUAL job details.
5. When they ask about interview prep, use the ACTUAL job description and company name.
6. Be specific: "You should learn Docker because 4 out of 12 jobs require it and you don't have it" — not "consider learning new skills".
7. If they haven't uploaded a resume, PUSH them to do it first.
8. If they have unverified skills, tell them which ones to verify via quiz.
9. Keep responses under 250 words. Use bullet points.`
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
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Please try again.' }])
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
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent rounded-full shadow-lg shadow-accent/30 flex items-center justify-center hover:bg-accent-dark transition-colors group">
            <Sparkles className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl border border-primary/10 flex flex-col overflow-hidden">

            <div className="bg-primary px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
                <div><p className="text-white font-semibold text-sm">Career Copilot</p><p className="text-white/50 text-xs">Knows your profile + all platform jobs</p></div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!context && <div className="text-center py-8"><Loader2 className="w-6 h-6 text-accent animate-spin mx-auto mb-2" /><p className="text-xs text-primary/40">Loading your career data...</p></div>}
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex gap-2'}>
                  {msg.role === 'ai' && <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Bot className="w-3.5 h-3.5 text-accent" /></div>}
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-accent text-white rounded-br-md' : 'bg-slate-100 text-primary rounded-bl-md'}`}>{msg.text}</div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-accent" /></div>
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md px-3 py-2 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {messages.length <= 1 && context && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, i) => <button key={i} onClick={() => setInput(s)} className="text-xs bg-accent/5 text-accent border border-accent/15 rounded-full px-2.5 py-1 hover:bg-accent/10">{s}</button>)}
              </div>
            )}

            <div className="border-t border-primary/10 px-3 py-2 flex gap-2 flex-shrink-0">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                disabled={sending || !context} placeholder="Ask me anything..."
                className="flex-1 text-sm border border-primary/10 rounded-lg px-3 py-2 bg-slate-50 placeholder-primary/30 focus:outline-none focus:ring-1 focus:ring-accent/30" />
              <button onClick={handleSend} disabled={sending || !input.trim() || !context}
                className="bg-accent text-white rounded-lg p-2 disabled:opacity-40 hover:bg-accent-dark transition-colors">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
