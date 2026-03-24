import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { Sparkles, Upload, Target, Zap, Briefcase, Users, BarChart3, Search, MapPin, ArrowRight, Shield, CheckCircle2, Brain, FileText, MessageSquare, BookOpen, Star, Award, TrendingUp, QrCode, GraduationCap, Building2, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import JobCard from '../components/jobs/JobCard'

// ─── Animated Counter ───
function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef()
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView || !target) return
    let start = 0
    const duration = 1500
    const step = Math.max(1, Math.floor(target / (duration / 16)))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{count}{suffix}</span>
}

// ─── Section wrapper with fade-in ───
function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef()
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [featuredJobs, setFeaturedJobs] = useState([])
  const [stats, setStats] = useState({ jobs: 0, candidates: 0, matches: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')

  useEffect(() => {
    async function load() {
      let jobQuery = supabase.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(30)
      if (profile?.role === 'recruiter' && user) {
        jobQuery = supabase.from('jobs').select('*').eq('recruiter_id', user.uid).order('created_at', { ascending: false }).limit(30)
      }
      let { data: jobs } = await jobQuery
      jobs = jobs || []

      if (profile?.role === 'candidate') {
        const yr = profile.candidate_year
        if (yr) {
          jobs = jobs.filter(job => {
            if (job.target_years?.length > 0 && !job.target_years.includes(yr)) return false
            if (yr <= 3 && job.job_type !== 'internship') return false
            return true
          })
        }
        if (profile?.skills?.length > 0) {
          const mySkills = profile.skills.map(s => s.toLowerCase())
          jobs = jobs.filter(job => {
            const jobSkills = (job.skills_required || []).map(s => s.toLowerCase())
            return jobSkills.some(js => mySkills.some(cs => cs.includes(js) || js.includes(cs)))
          })
        }
      }

      setFeaturedJobs(jobs.slice(0, 6))
      const { count: jobCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
      const { count: candidateCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'candidate')
      const { count: appCount } = await supabase.from('applications').select('*', { count: 'exact', head: true })
      setStats({ jobs: jobCount || 0, candidates: candidateCount || 0, matches: appCount || 0 })
    }
    load()
  }, [user, profile])

  function handleSearch(e) {
    e.preventDefault()
    navigate(`/jobs?q=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(searchLocation)}`)
  }

  return (
    <div className="overflow-hidden">

      {/* ════════════ HERO ════════════ */}
      <section className="relative min-h-[85vh] flex items-center bg-primary text-white overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-accent/15 rounded-full blur-[100px]" />
          <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-[5%] left-[5%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
          <motion.div animate={{ x: [0, 15, 0], y: [0, 15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-full px-5 py-2 text-sm font-medium mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Trusted by campus placement cells across India
            </motion.span>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-white">
              <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="block text-white">
                Where Talent
              </motion.span>
              <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="block text-white">
                Meets <span className="text-accent-300">Trust</span>
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-white/50 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              The only campus hiring platform where every skill is quiz-verified,
              every recruiter is TPO-approved, and AI matches you to the right opportunity.
            </motion.p>

            {/* Search bar */}
            <motion.form
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              onSubmit={handleSearch}
              className="bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto mb-10"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="text" placeholder="Job title, skill, or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 text-sm text-white rounded-xl bg-white/[0.06] border border-white/[0.08] placeholder-white/25 focus:outline-none focus:border-accent/50 focus:bg-white/[0.1] transition-all" />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="text" placeholder="City or remote..." value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 text-sm text-white rounded-xl bg-white/[0.06] border border-white/[0.08] placeholder-white/25 focus:outline-none focus:border-accent/50 focus:bg-white/[0.1] transition-all" />
              </div>
              <button type="submit" className="btn-accent py-3.5 px-8 rounded-xl text-sm font-semibold shadow-accent-lg">Search Jobs</button>
            </motion.form>

            {/* CTA buttons */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="flex gap-3 justify-center flex-wrap">
              {user ? (
                <>
                  <Link to="/dashboard" className="btn-accent py-3 px-7 text-sm">Go to Dashboard <ArrowRight className="w-4 h-4" /></Link>
                  {profile?.role === 'candidate' && <Link to="/resume-match" className="bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] text-white font-medium py-3 px-7 rounded-xl text-sm transition-all inline-flex items-center gap-2">AI Resume Match</Link>}
                  {profile?.role === 'recruiter' && <Link to="/post-job" className="bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] text-white font-medium py-3 px-7 rounded-xl text-sm transition-all inline-flex items-center gap-2">Post a Job</Link>}
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-accent py-3 px-7 text-sm">Get Started Free <ArrowRight className="w-4 h-4" /></Link>
                  <Link to="/jobs" className="bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] text-white font-medium py-3 px-7 rounded-xl text-sm transition-all inline-flex items-center gap-2">Browse All Jobs</Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
      </section>

      {/* ════════════ LIVE STATS ════════════ */}
      <section className="relative -mt-12 z-10 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-lg border border-primary/5 p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-6 sm:gap-10">
            {[
              { icon: Briefcase, label: 'Active Jobs', value: stats.jobs, color: 'text-accent' },
              { icon: Users, label: 'Verified Candidates', value: stats.candidates, color: 'text-purple-600' },
              { icon: BarChart3, label: 'Applications', value: stats.matches, color: 'text-blue-600' },
            ].map(({ icon: Icon, label, value, color }, i) => (
              <FadeIn key={label} delay={i * 0.1} className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  <AnimatedCounter target={value} />
                </p>
                <p className="text-xs sm:text-sm text-primary/40 mt-0.5">{label}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 3 ROLES ════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <FadeIn className="text-center mb-14">
          <span className="badge bg-accent/10 text-accent font-medium mb-4 inline-flex">Built for 3 roles</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-3">One Platform, Three Perspectives</h2>
          <p className="text-primary/40 max-w-xl mx-auto">Every stakeholder in campus placement gets a tailored experience with real-time data and AI assistance.</p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: GraduationCap, role: 'Students', color: 'from-accent to-purple-600',
              features: ['AI resume analysis & ATS score', 'Skill verification via timed quiz', 'AI mock interviews with webcam', 'Job matching & course recommendations', 'Verified digital profile with QR', 'Placement prediction score'],
            },
            {
              icon: Building2, role: 'Recruiters', color: 'from-blue-600 to-cyan-600',
              features: ['Kanban hiring pipeline (drag & drop)', 'AI candidate ranking', 'Verified skill badges on applicants', 'Auto email on status change', 'AI job description generator', 'TPO-verified trust badge'],
            },
            {
              icon: Shield, role: 'TPO', color: 'from-emerald-600 to-teal-600',
              features: ['Recruiter verification (approve/reject)', 'Monitor all jobs & applications', 'Export data to CSV/Sheets', 'Platform-wide analytics', 'Trust & integrity oversight', 'Full placement pipeline visibility'],
            },
          ].map(({ icon: Icon, role, color, features }, i) => (
            <FadeIn key={role} delay={i * 0.12}>
              <div className="card h-full group hover:border-accent/20 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-1">{role}</h3>
                <p className="text-xs text-primary/40 mb-4">Everything {role.toLowerCase()} need</p>
                <ul className="space-y-2.5">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-primary/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-16">
            <span className="badge bg-emerald-100 text-emerald-700 font-medium mb-4 inline-flex">Simple 3-step process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-3">From Resume to Offer</h2>
            <p className="text-primary/40 max-w-lg mx-auto">Your entire placement journey, automated and verified.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20" />

            {[
              { icon: Upload, step: '01', title: 'Upload & Verify', desc: 'Upload your resume. AI extracts skills instantly. Take timed quizzes to prove each skill — no more self-reporting.' },
              { icon: Target, step: '02', title: 'Get AI-Matched', desc: 'Our AI scores you against every job — skills, experience, location. See your match percentage and missing skills.' },
              { icon: Zap, step: '03', title: 'Apply & Track', desc: 'One-click apply with AI cover letters. Track status in real-time. Get email alerts on every update.' },
            ].map(({ icon: Icon, step, title, desc }, i) => (
              <FadeIn key={step} delay={i * 0.15}>
                <div className="text-center relative">
                  <div className="relative inline-flex mb-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-primary/5 shadow-sm">
                      <Icon className="w-8 h-8 text-accent" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-white text-sm font-bold rounded-xl flex items-center justify-center shadow-accent">{step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
                  <p className="text-sm text-primary/50 leading-relaxed max-w-xs mx-auto">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ FEATURE SHOWCASE ════════════ */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-14">
            <span className="badge bg-purple-100 text-purple-700 font-medium mb-4 inline-flex">Packed with features</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-3">Everything You Need to Get Placed</h2>
            <p className="text-primary/40 max-w-lg mx-auto">20+ features built for the modern campus hiring ecosystem.</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: 'AI Resume Scanner', desc: '8-category ATS score with improvement suggestions', color: 'bg-violet-50 text-violet-600' },
              { icon: Shield, title: 'Skill Verification', desc: 'Timed quizzes per skill — 4/5 to pass, no cheating', color: 'bg-emerald-50 text-emerald-600' },
              { icon: MessageSquare, title: 'AI Mock Interview', desc: '6 questions + voice mode + webcam confidence tracking', color: 'bg-blue-50 text-blue-600' },
              { icon: Target, title: 'Smart Job Matching', desc: 'Local + AI scoring blended for accurate match %', color: 'bg-amber-50 text-amber-600' },
              { icon: FileText, title: 'Resume Builder', desc: '3 templates, AI content, PDF export, save to profile', color: 'bg-rose-50 text-rose-600' },
              { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Funnel chart, skill heatmap, ranking, weekly progress', color: 'bg-indigo-50 text-indigo-600' },
              { icon: BookOpen, title: 'Course Recommendations', desc: 'Skill gap analysis with 40+ curated course links', color: 'bg-orange-50 text-orange-600' },
              { icon: Star, title: 'Kanban Pipeline', desc: 'Drag-and-drop hiring board for recruiters (like Trello)', color: 'bg-cyan-50 text-cyan-600' },
              { icon: QrCode, title: 'Verified Profile + QR', desc: 'Shareable public profile with proven skills & QR code', color: 'bg-purple-50 text-purple-600' },
              { icon: TrendingUp, title: 'Placement Prediction', desc: 'ML-weighted score from skills, quizzes, interviews', color: 'bg-teal-50 text-teal-600' },
              { icon: Award, title: 'Aptitude Prep', desc: '12 companies, 4 categories, company-wise PYQ practice', color: 'bg-yellow-50 text-yellow-600' },
              { icon: Sparkles, title: 'Dual AI Agents', desc: 'Career Copilot for students, Hiring Agent for recruiters', color: 'bg-fuchsia-50 text-fuchsia-600' },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <FadeIn key={title} delay={(i % 3) * 0.08}>
                <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-primary/5 hover:border-accent/15 hover:shadow-md transition-all group">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary text-sm mb-0.5">{title}</h3>
                    <p className="text-xs text-primary/45 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ TRUST SECTION ════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-14">
            <span className="badge bg-emerald-100 text-emerald-700 font-medium mb-4 inline-flex"><Shield className="w-3.5 h-3.5 mr-1" /> Trust-first platform</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-3">Why PlaceMate is Different</h2>
            <p className="text-primary/40 max-w-lg mx-auto">Every data point is earned, not self-reported. This is verified hiring.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Skills are quiz-verified', desc: 'Candidates take timed, typed-answer quizzes per skill. No MCQ guessing. 4 out of 5 correct to earn the verified badge.', icon: CheckCircle2, color: 'border-l-emerald-500' },
              { title: 'Recruiters are TPO-approved', desc: 'Every recruiter must be verified by the Training & Placement Officer before posting jobs. No spam, no scams.', icon: Shield, color: 'border-l-blue-500' },
              { title: 'AI scores, humans decide', desc: 'AI provides match scores and rankings, but recruiters make the final call. Transparent, explainable, fair.', icon: Brain, color: 'border-l-purple-500' },
              { title: 'Public verified profiles', desc: 'Candidates get a shareable profile page with QR code. Every skill backed by quiz scores. LinkedIn, but proven.', icon: QrCode, color: 'border-l-accent' },
            ].map(({ title, desc, icon: Icon, color }, i) => (
              <FadeIn key={title} delay={i * 0.1}>
                <div className={`p-6 bg-slate-50 rounded-xl border-l-4 ${color} hover:bg-white hover:shadow-md transition-all`}>
                  <div className="flex items-start gap-4">
                    <Icon className="w-6 h-6 text-primary/30 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-primary mb-1">{title}</h3>
                      <p className="text-sm text-primary/50 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ FEATURED JOBS ════════════ */}
      {featuredJobs.length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="flex justify-between items-end mb-10">
                <div>
                  <span className="badge bg-accent/10 text-accent font-medium mb-3 inline-flex">Live opportunities</span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-primary">
                    {profile?.role === 'recruiter' ? 'Your Postings' : profile?.candidate_year && profile.candidate_year <= 3 ? 'Internship Opportunities' : 'Latest Jobs'}
                  </h2>
                  <p className="text-primary/40 text-sm mt-1">
                    {profile?.role === 'recruiter' ? 'Jobs posted by your company' : profile?.candidate_year && profile.candidate_year <= 3 ? `Showing internships for ${profile.candidate_year}${['st','nd','rd'][profile.candidate_year - 1]} year students` : 'Fresh roles from verified recruiters'}
                  </p>
                </div>
                <Link to="/jobs" className="btn-secondary text-sm hidden sm:inline-flex">View All Jobs <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
            </FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredJobs.map((job, i) => (
                <FadeIn key={job.id} delay={(i % 3) * 0.08}>
                  <JobCard job={job} />
                </FadeIn>
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link to="/jobs" className="btn-secondary text-sm">View All Jobs <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════════ FINAL CTA ════════════ */}
      {!user && (
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-primary" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 text-center text-white">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                Your Next Opportunity<br />is One Click Away
              </h2>
              <p className="text-white/40 text-base sm:text-lg mb-10 max-w-xl mx-auto">
                Join the verified campus hiring ecosystem. Whether you're a student, recruiter, or TPO — PlaceMate has you covered.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link to="/register" className="bg-white text-primary font-semibold py-3.5 px-8 rounded-xl text-sm hover:bg-white/90 transition-all inline-flex items-center gap-2 shadow-lg active:scale-[0.98]">
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/jobs" className="bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] text-white font-medium py-3.5 px-8 rounded-xl text-sm transition-all inline-flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Explore Jobs
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </div>
  )
}
