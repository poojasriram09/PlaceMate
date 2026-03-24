import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ResumeUploader from '../components/ai/ResumeUploader'
import MatchResults from '../components/ai/MatchResults'
import { extractPDFText, parseResume, matchJobs, generateATSScore } from '../lib/ai'
import { scoreJobsForCandidate } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Sparkles, User, Mail, MapPin, Briefcase, GraduationCap, CheckCircle2, XCircle, ArrowRight, Shield, AlertTriangle, FileText, TrendingUp, BookOpen, ExternalLink, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

// Curated course recommendations — affiliate link concept (realistic courses + prices)
const COURSE_CATALOG = {
  'react': { name: 'React — The Complete Guide 2025', platform: 'Udemy', price: '₹449', rating: 4.7, students: '890K+', url: 'https://udemy.com/course/react-the-complete-guide', icon: '⚛️' },
  'node': { name: 'The Complete Node.js Developer Course', platform: 'Udemy', price: '₹449', rating: 4.6, students: '620K+', url: 'https://udemy.com/course/the-complete-nodejs-developer-course', icon: '🟢' },
  'node.js': { name: 'The Complete Node.js Developer Course', platform: 'Udemy', price: '₹449', rating: 4.6, students: '620K+', url: 'https://udemy.com/course/the-complete-nodejs-developer-course', icon: '🟢' },
  'python': { name: '100 Days of Code: Python Pro Bootcamp', platform: 'Udemy', price: '₹449', rating: 4.7, students: '1.5M+', url: 'https://udemy.com/course/100-days-of-code', icon: '🐍' },
  'javascript': { name: 'The Complete JavaScript Course 2025', platform: 'Udemy', price: '₹449', rating: 4.7, students: '920K+', url: 'https://udemy.com/course/the-complete-javascript-course', icon: '💛' },
  'typescript': { name: 'Understanding TypeScript — 2025 Edition', platform: 'Udemy', price: '₹449', rating: 4.7, students: '280K+', url: 'https://udemy.com/course/understanding-typescript', icon: '🔷' },
  'docker': { name: 'Docker & Kubernetes: The Practical Guide', platform: 'Udemy', price: '₹449', rating: 4.7, students: '340K+', url: 'https://udemy.com/course/docker-kubernetes-the-practical-guide', icon: '🐳' },
  'kubernetes': { name: 'Kubernetes for Absolute Beginners', platform: 'Udemy', price: '₹449', rating: 4.6, students: '180K+', url: 'https://udemy.com/course/learn-kubernetes', icon: '☸️' },
  'aws': { name: 'AWS Certified Solutions Architect Associate', platform: 'Udemy', price: '₹549', rating: 4.7, students: '1M+', url: 'https://udemy.com/course/aws-certified-solutions-architect-associate', icon: '☁️' },
  'java': { name: 'Java Programming Masterclass', platform: 'Udemy', price: '₹449', rating: 4.6, students: '780K+', url: 'https://udemy.com/course/java-the-complete-java-developer-course', icon: '☕' },
  'sql': { name: 'The Complete SQL Bootcamp', platform: 'Udemy', price: '₹449', rating: 4.7, students: '850K+', url: 'https://udemy.com/course/the-complete-sql-bootcamp', icon: '🗃️' },
  'mongodb': { name: 'MongoDB — The Complete Developer Guide', platform: 'Udemy', price: '₹449', rating: 4.7, students: '190K+', url: 'https://udemy.com/course/mongodb-the-complete-developers-guide', icon: '🍃' },
  'git': { name: 'Git & GitHub — The Practical Guide', platform: 'Udemy', price: '₹399', rating: 4.6, students: '150K+', url: 'https://udemy.com/course/git-github-practical-guide', icon: '🔀' },
  'machine learning': { name: 'Machine Learning A-Z: AI & Python', platform: 'Udemy', price: '₹549', rating: 4.5, students: '1.1M+', url: 'https://udemy.com/course/machinelearning', icon: '🤖' },
  'data science': { name: 'The Data Science Course: Complete Data Science', platform: 'Udemy', price: '₹549', rating: 4.6, students: '670K+', url: 'https://udemy.com/course/the-data-science-course-complete-data-science-bootcamp', icon: '📊' },
  'angular': { name: 'Angular — The Complete Guide (2025)', platform: 'Udemy', price: '₹449', rating: 4.6, students: '690K+', url: 'https://udemy.com/course/the-complete-guide-to-angular-2', icon: '🅰️' },
  'vue': { name: 'Vue — The Complete Guide (incl. Pinia)', platform: 'Udemy', price: '₹449', rating: 4.7, students: '330K+', url: 'https://udemy.com/course/vuejs-2-the-complete-guide', icon: '💚' },
  'flutter': { name: 'Flutter & Dart — The Complete Guide', platform: 'Udemy', price: '₹449', rating: 4.6, students: '290K+', url: 'https://udemy.com/course/learn-flutter-dart-to-build-ios-android-apps', icon: '📱' },
  'c++': { name: 'Beginning C++ Programming', platform: 'Udemy', price: '₹449', rating: 4.6, students: '310K+', url: 'https://udemy.com/course/beginning-c-plus-plus-programming', icon: '⚙️' },
  'go': { name: 'Go: The Complete Developer Guide', platform: 'Udemy', price: '₹449', rating: 4.6, students: '130K+', url: 'https://udemy.com/course/go-the-complete-developers-guide', icon: '🔵' },
  'rust': { name: 'Ultimate Rust Crash Course', platform: 'Udemy', price: '₹399', rating: 4.7, students: '45K+', url: 'https://udemy.com/course/ultimate-rust-crash-course', icon: '🦀' },
  'spring boot': { name: 'Spring Boot 3 & Spring Framework 6', platform: 'Udemy', price: '₹449', rating: 4.7, students: '220K+', url: 'https://udemy.com/course/spring-hibernate-tutorial', icon: '🌱' },
  'django': { name: 'Python Django — The Practical Guide', platform: 'Udemy', price: '₹449', rating: 4.6, students: '110K+', url: 'https://udemy.com/course/python-django-the-practical-guide', icon: '🎸' },
  'express': { name: 'Just Express (with Node.js)', platform: 'Udemy', price: '₹399', rating: 4.5, students: '90K+', url: 'https://udemy.com/course/just-express-with-a-bunch-of-node-and-http-in-detail', icon: '🚀' },
  'tailwind': { name: 'Tailwind CSS From Scratch', platform: 'Udemy', price: '₹399', rating: 4.7, students: '95K+', url: 'https://udemy.com/course/tailwind-css-from-scratch', icon: '🎨' },
  'css': { name: 'Advanced CSS and Sass: Flexbox, Grid, Animations', platform: 'Udemy', price: '₹449', rating: 4.8, students: '380K+', url: 'https://udemy.com/course/advanced-css-and-sass', icon: '🎨' },
  'html': { name: 'Build Responsive Websites with HTML5 & CSS3', platform: 'Udemy', price: '₹399', rating: 4.7, students: '420K+', url: 'https://udemy.com/course/design-and-develop-a-killer-website-with-html5-and-css3', icon: '🌐' },
  'firebase': { name: 'Firebase & Firestore Masterclass', platform: 'Udemy', price: '₹449', rating: 4.5, students: '50K+', url: 'https://udemy.com/course/build-a-web-app-with-react-firebase', icon: '🔥' },
  'graphql': { name: 'GraphQL with React: The Complete Guide', platform: 'Udemy', price: '₹449', rating: 4.5, students: '65K+', url: 'https://udemy.com/course/graphql-with-react-course', icon: '◈' },
  'redis': { name: 'Redis: The Complete Developer Guide', platform: 'Udemy', price: '₹449', rating: 4.7, students: '55K+', url: 'https://udemy.com/course/redis-the-complete-developers-guide-p', icon: '🔴' },
  'linux': { name: 'Linux Mastery: Master the Linux Command Line', platform: 'Udemy', price: '₹399', rating: 4.7, students: '140K+', url: 'https://udemy.com/course/linux-mastery', icon: '🐧' },
  'devops': { name: 'DevOps Beginners to Advanced with Projects', platform: 'Udemy', price: '₹549', rating: 4.6, students: '170K+', url: 'https://udemy.com/course/decodingdevops', icon: '♾️' },
  'tensorflow': { name: 'TensorFlow Developer Certificate in 2025', platform: 'Udemy', price: '₹549', rating: 4.6, students: '120K+', url: 'https://udemy.com/course/tensorflow-developer-certificate-machine-learning-zero-to-mastery', icon: '🧠' },
  'deep learning': { name: 'Deep Learning A-Z 2025: Neural Networks & AI', platform: 'Udemy', price: '₹549', rating: 4.5, students: '450K+', url: 'https://udemy.com/course/deeplearning', icon: '🧠' },
  'power bi': { name: 'Microsoft Power BI Desktop for Business Intelligence', platform: 'Udemy', price: '₹449', rating: 4.6, students: '210K+', url: 'https://udemy.com/course/microsoft-power-bi-up-running-with-power-bi-desktop', icon: '📈' },
  'excel': { name: 'Microsoft Excel — Advanced Excel Formulas & Functions', platform: 'Udemy', price: '₹399', rating: 4.7, students: '390K+', url: 'https://udemy.com/course/excel-for-analysts', icon: '📗' },
  'figma': { name: 'Complete Web & Mobile Designer: UI/UX + Figma', platform: 'Udemy', price: '₹449', rating: 4.6, students: '120K+', url: 'https://udemy.com/course/complete-web-designer-mobile-designer-zero-to-mastery', icon: '🎨' },
  'next.js': { name: 'Next.js 14 & React — The Complete Guide', platform: 'Udemy', price: '₹449', rating: 4.7, students: '210K+', url: 'https://udemy.com/course/nextjs-react-the-complete-guide', icon: '▲' },
  'postgresql': { name: 'SQL and PostgreSQL: The Complete Guide', platform: 'Udemy', price: '₹449', rating: 4.7, students: '170K+', url: 'https://udemy.com/course/sql-and-postgresql', icon: '🐘' },
  'rest api': { name: 'REST APIs with Flask and Python', platform: 'Udemy', price: '₹449', rating: 4.6, students: '160K+', url: 'https://udemy.com/course/rest-api-flask-and-python', icon: '🔌' },
  'cybersecurity': { name: 'The Complete Cyber Security Course', platform: 'Udemy', price: '₹549', rating: 4.5, students: '580K+', url: 'https://udemy.com/course/the-complete-internet-security-privacy-course-volume-1', icon: '🔒' },
}

// Find course for a skill (case-insensitive fuzzy match)
function findCourse(skill) {
  const s = skill.toLowerCase().trim()
  if (COURSE_CATALOG[s]) return COURSE_CATALOG[s]
  // Try partial match
  const key = Object.keys(COURSE_CATALOG).find(k => s.includes(k) || k.includes(s))
  return key ? COURSE_CATALOG[key] : null
}

// Aggregate skill gaps across all matched jobs
function computeSkillGaps(matches, candidateSkills) {
  const gapMap = {} // skill → { count, jobs[] }
  const mySkills = (candidateSkills || []).map(s => s.toLowerCase())

  for (const match of (matches || [])) {
    for (const skill of (match.missing_skills || [])) {
      const sl = skill.toLowerCase()
      // Skip if candidate already has this skill
      if (mySkills.some(cs => cs.includes(sl) || sl.includes(cs))) continue
      if (!gapMap[skill]) gapMap[skill] = { count: 0, jobs: [] }
      gapMap[skill].count++
      if (gapMap[skill].jobs.length < 3) gapMap[skill].jobs.push(match.job_title || match.title || 'Job')
    }
  }

  return Object.entries(gapMap)
    .map(([skill, data]) => ({ skill, ...data, course: findCourse(skill) }))
    .sort((a, b) => b.count - a.count)
}

const LOADING_STEPS = [
  'Extracting text from resume...',
  'AI analyzing skills and experience...',
  'Running ATS compatibility scan...',
  'Matching with available jobs...',
]

function isSkillVerified(skill, verifiedList) {
  const s = skill.toLowerCase()
  return (verifiedList || []).some(v => v.toLowerCase() === s || v.toLowerCase().includes(s) || s.includes(v.toLowerCase()))
}

export default function ResumeMatch() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [parsed, setParsed] = useState(null)
  const [atsResult, setAtsResult] = useState(null)
  const [matches, setMatches] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [resumeText, setResumeText] = useState('')

  const unverifiedSkills = (parsed?.skills || []).filter(s => !isSkillVerified(s, profile?.skills_verified))

  async function handleUpload(selectedFile) {
    setFile(selectedFile)
    setLoading(true)
    setParsed(null)
    setAtsResult(null)
    setMatches(null)
    setAiError(null)

    try {
      // Step 1: Extract text
      setStep(0)
      const extractedText = await extractPDFText(selectedFile)
      if (!extractedText?.trim()) throw new Error('Could not extract text from PDF. Make sure it contains selectable text, not scanned images.')
      setResumeText(extractedText)

      // Step 2: AI parse
      setStep(1)
      let parsedData
      try {
        parsedData = await parseResume(extractedText)
      } catch (err) {
        throw new Error('AI failed to parse resume: ' + (err.message || 'Unknown error. Try again.'))
      }

      // Validate parsed data
      if (!parsedData || typeof parsedData !== 'object') throw new Error('AI returned invalid data. Try uploading again.')
      if (!parsedData.skills || !Array.isArray(parsedData.skills)) parsedData.skills = []
      // experience_years from resume is informational only — campus students use candidate_year

      setParsed(parsedData)

      // Step 3: ATS Score
      setStep(2)
      try {
        const ats = await generateATSScore(parsedData, extractedText)
        if (ats?.ats_score != null) setAtsResult(ats)
      } catch {} // ATS is optional — don't block the flow

      // Save to profile
      if (user) {
        const fileName = `${user.uid}/${Date.now()}-resume.pdf`
        try { await supabase.storage.from('resumes').upload(fileName, selectedFile, { contentType: 'application/pdf', upsert: true }) } catch {}
        await updateProfile({
          skills: parsedData.skills,
          education: parsedData.education || null,
          resume_url: fileName,
        }).catch(() => {})
      }

      // Step 4: Match jobs
      setStep(3)
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company_name, location, skills_required, target_years, job_type, description, salary_min, salary_max')
        .eq('is_active', true)
        .limit(50)

      if (!jobs?.length) {
        setMatches([])
        toast.success('Resume analyzed! No active jobs available right now.')
        return
      }

      // Always compute local scores first (instant, reliable)
      const localScores = scoreJobsForCandidate(parsedData, jobs)
      setMatches(localScores.slice(0, 10))

      // Try AI matching for richer reasoning (may fail on rate limit)
      try {
        const aiResults = await matchJobs(parsedData, jobs)
        if (Array.isArray(aiResults) && aiResults.length > 0) {
          const merged = aiResults
            .map(ai => {
              // Find the actual job — AI might hallucinate IDs
              const job = jobs.find(j => j.id === ai.job_id)
              if (!job) return null // skip hallucinated jobs

              const local = localScores.find(l => l.job_id === ai.job_id)
              const aiScore = typeof ai.match_score === 'number' ? ai.match_score : 0
              const localScore = local?.score || 0
              const blended = Math.round(aiScore * 0.6 + localScore * 0.4)

              return {
                job_id: job.id,
                job_title: job.title,
                company: job.company_name,
                location: job.location,
                score: blended,
                match_score: blended,
                reasoning: ai.reasoning || local?.reasoning || '',
                matching_skills: ai.matching_skills || local?.matching_skills || [],
                missing_skills: ai.missing_skills || local?.missing_skills || [],
              }
            })
            .filter(Boolean) // remove nulls from hallucinated jobs
            .sort((a, b) => b.score - a.score)

          if (merged.length > 0) {
            setMatches(merged.slice(0, 10))
          }
          // If AI returned results but all were hallucinated, keep local scores
        }
      } catch (err) {
        // AI failed (rate limit, bad response, etc.) — local scores already displayed
        const msg = err.message || ''
        if (msg.includes('Rate limit') || msg.includes('rate limit')) {
          setAiError('AI rate limit reached. Showing local match scores instead.')
        }
        // Don't throw — local scores are fine
      }

      toast.success('Resume analyzed!')
    } catch (err) {
      toast.error(err.message || 'Failed to analyze resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-4 py-1.5 text-sm text-accent font-medium mb-4">
          <Sparkles className="w-4 h-4" /> AI Resume Scanner
        </div>
        <h1 className="text-xl sm:text-3xl font-bold text-primary">Resume Analysis & Matching</h1>
        <p className="text-primary/50 mt-2">Upload your resume. We extract skills, match you to jobs, and you verify skills to apply.</p>
      </div>

      <ResumeUploader onUpload={handleUpload} loading={loading} file={file} />

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 card text-center py-8">
            <Sparkles className="w-10 h-10 text-accent animate-pulse mx-auto mb-4" />
            <p className="text-lg font-bold text-primary mb-4">Scanning your resume...</p>
            <div className="space-y-3 max-w-xs mx-auto">
              {LOADING_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${i <= step ? 'text-accent font-medium' : 'text-primary/30'}`}>
                  <div className={`w-2 h-2 rounded-full ${i < step ? 'bg-emerald-500' : i === step ? 'bg-accent animate-pulse' : 'bg-primary/15'}`} />
                  {s}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extracted Profile */}
      {parsed && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary">Extracted Profile</h3>
            <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Resume Processed</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {parsed.full_name && <p className="flex items-center gap-2 text-sm text-primary/70"><User className="w-4 h-4 text-primary/40" /> {parsed.full_name}</p>}
            {parsed.email && <p className="flex items-center gap-2 text-sm text-primary/70"><Mail className="w-4 h-4 text-primary/40" /> {parsed.email}</p>}
            {parsed.location && <p className="flex items-center gap-2 text-sm text-primary/70"><MapPin className="w-4 h-4 text-primary/40" /> {parsed.location}</p>}
            {parsed.experience_years != null && <p className="flex items-center gap-2 text-sm text-primary/70"><Briefcase className="w-4 h-4 text-primary/40" /> {parsed.experience_years} years (from resume)</p>}
          </div>

          {parsed.skills?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-primary mb-2">{parsed.skills.length} Skills Detected</h4>
              <div className="flex flex-wrap gap-2">
                {parsed.skills.map((s) => {
                  const verified = isSkillVerified(s, profile?.skills_verified)
                  return (
                    <span key={s} className={`badge py-1 px-2.5 ${verified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-primary/70'}`}>
                      {verified && <CheckCircle2 className="w-3 h-3 mr-0.5" />}{s}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {parsed.education && (
            <p className="flex items-center gap-2 text-sm text-primary/70"><GraduationCap className="w-4 h-4 text-primary/40" /> {parsed.education}</p>
          )}
        </motion.div>
      )}

      {/* ATS Score */}
      {atsResult && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2"><FileText className="w-5 h-5 text-accent" /> ATS Compatibility Score</h3>
            <div className={`w-14 h-14 rounded-full border-3 flex items-center justify-center ${atsResult.ats_score >= 70 ? 'border-emerald-300 bg-emerald-50' : atsResult.ats_score >= 50 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
              <span className={`text-xl font-bold font-mono ${atsResult.ats_score >= 70 ? 'text-emerald-600' : atsResult.ats_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{atsResult.ats_score}</span>
            </div>
          </div>

          {atsResult.overall_feedback && <p className="text-sm text-primary/60 mb-4">{atsResult.overall_feedback}</p>}

          {/* Category breakdown */}
          {atsResult.category_scores && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {Object.entries(atsResult.category_scores).map(([key, val]) => {
                const score = Number(val?.score) || 0
                return (
                  <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono ${score >= 70 ? 'bg-emerald-100 text-emerald-700' : score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-primary/50 truncate">{val?.feedback}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Improvements */}
          {atsResult.improvements?.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" /> What to Improve</h4>
              <div className="space-y-1.5">
                {atsResult.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-primary/70 bg-amber-50 rounded-lg px-3 py-2">
                    <XCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" /> {imp}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {atsResult.strengths?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Strengths</h4>
              <div className="space-y-1">
                {atsResult.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-primary/70">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Error Notice */}
      {aiError && !loading && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {aiError}
        </div>
      )}

      {/* Skill Verification Prompt */}
      {parsed && !loading && unverifiedSkills.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4">
          <div className="bg-accent/5 border-2 border-accent/20 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-primary mb-1">Verify Your Skills to Apply for Jobs</h3>
                <p className="text-sm text-primary/60 mb-3">
                  Jobs require verified skills. Take a quick 5-question typed-answer quiz per skill.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {unverifiedSkills.slice(0, 8).map(s => (
                    <button key={s} onClick={() => navigate(`/skill-quiz?skill=${encodeURIComponent(s)}`)}
                      className="badge bg-white border border-primary/10 text-primary/70 py-1.5 px-3 cursor-pointer hover:border-accent hover:text-accent transition-colors">
                      {s} <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate(`/skill-quiz?skill=${encodeURIComponent(unverifiedSkills[0])}`)} className="btn-accent text-sm py-2 px-5">
                  Start Verification <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* All verified */}
      {parsed && !loading && unverifiedSkills.length === 0 && parsed.skills?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-900">All {parsed.skills.length} skills verified!</p>
              <p className="text-sm text-emerald-700">You can apply to any matching job.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Job Matches */}
      {matches && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8">
          <h3 className="text-xl font-bold text-primary mb-4">
            {matches.length > 0 ? `Top ${matches.length} Job Matches` : 'No Matches Found'}
          </h3>
          {matches.length > 0 ? <MatchResults matches={matches} /> : <p className="text-primary/50 text-center py-8">No active jobs match your profile.</p>}
        </motion.div>
      )}

      {/* Skill Gap → Course Recommendations */}
      {matches && !loading && matches.length > 0 && (() => {
        const gaps = computeSkillGaps(matches, parsed?.skills)
        if (gaps.length === 0) return null
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 mb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Skill Gap Analysis</h3>
                <p className="text-sm text-primary/50">Skills in demand that you're missing — bridge the gap to unlock more jobs</p>
              </div>
            </div>

            <div className="space-y-3">
              {gaps.slice(0, 6).map(({ skill, count, jobs, course }) => (
                <div key={skill} className="card border border-primary/5 hover:border-accent/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Gap info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge bg-red-50 text-red-600 text-xs font-medium">Missing</span>
                        <span className="font-semibold text-primary">{skill}</span>
                      </div>
                      <p className="text-sm text-primary/50">
                        Required by <span className="font-medium text-accent">{count} job{count > 1 ? 's' : ''}</span>
                        {jobs.length > 0 && <span> — {jobs.slice(0, 2).join(', ')}{count > 2 ? ` +${count - 2} more` : ''}</span>}
                      </p>
                    </div>

                    {/* Course recommendation */}
                    {course ? (
                      <a href={course.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-gradient-to-r from-accent/5 to-purple-50 border border-accent/15 rounded-xl p-3 sm:max-w-xs hover:border-accent/30 hover:shadow-sm transition-all group cursor-pointer">
                        <span className="text-2xl flex-shrink-0">{course.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-primary leading-tight line-clamp-1 group-hover:text-accent transition-colors">{course.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-primary/40">{course.platform}</span>
                            <span className="text-xs text-primary/20">•</span>
                            <span className="text-xs font-medium text-accent">{course.price}</span>
                            <span className="text-xs text-primary/20">•</span>
                            <span className="text-xs text-amber-600">★ {course.rating}</span>
                          </div>
                          <p className="text-xs text-primary/35 mt-0.5">{course.students} students</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-primary/20 group-hover:text-accent flex-shrink-0 transition-colors" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-primary/40 bg-slate-50 rounded-xl px-4 py-3">
                        <BookOpen className="w-4 h-4" />
                        <span>Search "{skill}" on Udemy</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue flywheel callout */}
            <div className="mt-4 bg-gradient-to-r from-accent/5 via-purple-50 to-accent/5 border border-accent/15 rounded-xl p-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary">Bridge your skill gaps, unlock more jobs</p>
                <p className="text-xs text-primary/50 mt-1">
                  Learning these {gaps.length} skill{gaps.length > 1 ? 's' : ''} could unlock up to {gaps.reduce((sum, g) => sum + g.count, 0)} more job opportunities.
                  Complete a course, then verify your skill to apply.
                </p>
              </div>
            </div>
          </motion.div>
        )
      })()}
    </div>
  )
}
