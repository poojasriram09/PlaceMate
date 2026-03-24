import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { calculateMatchScore } from '../lib/scoring'
import JobCard from '../components/jobs/JobCard'
import JobFilters from '../components/jobs/JobFilters'
import { SkeletonList } from '../components/common/Skeleton'
import { SlidersHorizontal, X, Search, Sparkles, Loader2, TrendingUp, GraduationCap, Briefcase, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

const EMPTY_FILTERS = { search: '', jobTypes: [], expMin: null, expMax: null, location: '', salaryMin: '', salaryMax: '', skills: [] }
const PER_PAGE = 12

export default function Jobs() {
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [savedJobIds, setSavedJobIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    search: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
  })
  const [sortBy, setSortBy] = useState(profile?.role === 'candidate' ? 'relevance' : 'newest')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [trendingSkills, setTrendingSkills] = useState([])

  const isRecruiter = profile?.role === 'recruiter'
  const isTPO = profile?.role === 'tpo'
  const isCandidate = profile?.role === 'candidate'

  useEffect(() => { fetchJobs() }, [filters, sortBy, page, profile?.role, user?.uid])
  useEffect(() => { if (user) fetchSavedJobs() }, [user])
  useEffect(() => { if (isCandidate) loadTrendingSkills() }, [isCandidate])

  // Load trending skills from all active jobs
  async function loadTrendingSkills() {
    const { data } = await supabase.from('jobs').select('skills_required').eq('is_active', true)
    if (!data?.length) return
    const counts = {}
    data.forEach(j => (j.skills_required || []).forEach(s => { counts[s] = (counts[s] || 0) + 1 }))
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    setTrendingSkills(sorted)
  }

  // AI Natural Language Search
  async function handleAISearch() {
    if (!aiQuery.trim()) return
    setAiSearching(true)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', temperature: 0, max_tokens: 200,
          messages: [{ role: 'user', content: `Parse this job search query into structured filters. Query: "${aiQuery}"

Return ONLY valid JSON:
{
  "search": "keyword or job title or empty string",
  "location": "city name or empty string",
  "jobTypes": ["full-time"] or empty array (options: full-time, part-time, contract, internship),
  "salaryMin": number or empty string (in INR per year, e.g. 800000 for 8 LPA),
  "salaryMax": number or empty string,
  "expMin": number or null (years),
  "expMax": number or null,
  "skills": ["skill1"] or empty array
}

Examples:
"remote react jobs" → {"search":"","location":"remote","jobTypes":[],"salaryMin":"","salaryMax":"","expMin":null,"expMax":null,"skills":["React"]}
"frontend jobs in mumbai above 10 lpa" → {"search":"frontend","location":"mumbai","jobTypes":[],"salaryMin":1000000,"salaryMax":"","expMin":null,"expMax":null,"skills":[]}
"internship for freshers" → {"search":"","location":"","jobTypes":["internship"],"salaryMin":"","salaryMax":"","expMin":0,"expMax":1,"skills":[]}` }],
        }),
      })
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || ''
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      applyFilters({ ...EMPTY_FILTERS, ...parsed })
      setAiQuery('')
      toast.success('AI applied filters from your search!')
    } catch {
      toast.error('AI search failed — try using filters manually')
    } finally {
      setAiSearching(false)
    }
  }

  async function fetchJobs() {
    setLoading(true)
    let query = supabase.from('jobs').select('*, profiles!jobs_recruiter_id_fkey(verification_status)', { count: 'exact' })

    // Role-based visibility
    if (isRecruiter && user) {
      // Recruiters see ONLY their own jobs
      query = query.eq('recruiter_id', user.uid)
    } else if (isTPO) {
      // TPO sees all jobs (active and inactive)
    } else {
      // Candidates see only active jobs that match their skills
      query = query.eq('is_active', true)
    }

    // Text search — title, company, description
    if (filters.search) {
      const s = filters.search.trim()
      query = query.or(`title.ilike.%${s}%,company_name.ilike.%${s}%,description.ilike.%${s}%`)
    }

    // Job type filter
    if (filters.jobTypes?.length) {
      query = query.in('job_type', filters.jobTypes)
    }

    // Year-based target filtering (if candidate has year set, filter by target_years)
    // This is handled client-side along with job_type filtering

    // Location filter
    if (filters.location) {
      query = query.ilike('location', `%${filters.location.trim()}%`)
    }

    // Salary overlap: job's salary range overlaps with user's desired range
    if (filters.salaryMin) {
      // Job must have salary_max >= user's min (or salary_max is null but salary_min >= user's min)
      query = query.or(`salary_max.gte.${Number(filters.salaryMin)},salary_min.gte.${Number(filters.salaryMin)}`)
    }
    if (filters.salaryMax) {
      query = query.lte('salary_min', Number(filters.salaryMax))
    }

    // Skills filter — job must have at least one matching skill
    if (filters.skills?.length) {
      query = query.overlaps('skills_required', filters.skills)
    }

    // Sort
    if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
    else if (sortBy === 'salary_high') query = query.order('salary_max', { ascending: false, nullsFirst: false })
    else if (sortBy === 'salary_low') query = query.order('salary_min', { ascending: true, nullsFirst: false })
    else if (sortBy === 'applications') query = query.order('application_count', { ascending: false })

    // Pagination
    query = query.range(page * PER_PAGE, (page + 1) * PER_PAGE - 1)

    let { data, count } = await query
    let results = data || []

    // Year-based filtering
    if (isCandidate && profile?.candidate_year) {
      const yr = profile.candidate_year
      results = results.filter(job => {
        // If job specifies target years, candidate must be in one of them
        if (job.target_years?.length > 0 && !job.target_years.includes(yr)) return false
        // 2nd/3rd year can only see internships
        if (yr <= 3 && job.job_type !== 'internship') return false
        return true
      })
    }

    // Client-side case-insensitive skill matching + relevance scoring for candidates
    const candidateSkills = (profile?.skills || []).map(s => s.toLowerCase())
    if (isCandidate && candidateSkills.length > 0) {
      results = results.filter(job => {
        const jobSkills = (job.skills_required || []).map(s => s.toLowerCase())
        return jobSkills.some(js => candidateSkills.some(cs => cs.includes(js) || js.includes(cs)))
      })

      // Calculate match score per job for relevance sorting
      if (sortBy === 'relevance' && profile) {
        results = results.map(job => {
          const match = calculateMatchScore(profile, job)
          return { ...job, _matchScore: match.score, _matchReasoning: match.reasoning }
        }).sort((a, b) => b._matchScore - a._matchScore)
      }

      count = results.length
    }

    setJobs(results)
    setTotalCount(count || 0)
    setLoading(false)
  }

  async function fetchSavedJobs() {
    const { data } = await supabase.from('saved_jobs').select('job_id').eq('candidate_id', user.uid)
    setSavedJobIds(new Set(data?.map((s) => s.job_id) || []))
  }

  async function toggleSave(jobId) {
    if (!user) return
    if (savedJobIds.has(jobId)) {
      await supabase.from('saved_jobs').delete().eq('candidate_id', user.uid).eq('job_id', jobId)
      setSavedJobIds((prev) => { const s = new Set(prev); s.delete(jobId); return s })
    } else {
      await supabase.from('saved_jobs').insert({ candidate_id: user.uid, job_id: jobId })
      setSavedJobIds((prev) => new Set(prev).add(jobId))
    }
  }

  function applyFilters(newFilters) {
    setFilters(newFilters)
    setPage(0)
  }

  // Compute active filter chips for display
  const activeChips = []
  if (filters.search) activeChips.push({ label: `"${filters.search}"`, clear: () => applyFilters({ ...filters, search: '' }) })
  if (filters.jobTypes?.length) filters.jobTypes.forEach(t => activeChips.push({ label: t, clear: () => applyFilters({ ...filters, jobTypes: filters.jobTypes.filter(x => x !== t) }) }))
  if (filters.expMin != null) activeChips.push({ label: `${filters.expMin}-${filters.expMax} yrs`, clear: () => applyFilters({ ...filters, expMin: null, expMax: null }) })
  if (filters.location) activeChips.push({ label: filters.location, clear: () => applyFilters({ ...filters, location: '' }) })
  if (filters.salaryMin || filters.salaryMax) activeChips.push({ label: `₹${filters.salaryMin || '0'}-${filters.salaryMax || '∞'}`, clear: () => applyFilters({ ...filters, salaryMin: '', salaryMax: '' }) })
  if (filters.skills?.length) filters.skills.forEach(s => activeChips.push({ label: s, clear: () => applyFilters({ ...filters, skills: filters.skills.filter(x => x !== s) }) }))

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Year-based visibility banner */}
      {isCandidate && profile?.candidate_year && (
        <div className={`mb-4 rounded-xl p-4 flex items-center gap-3 ${
          profile.candidate_year <= 3
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-emerald-50 border border-emerald-200'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            profile.candidate_year <= 3 ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            <GraduationCap className={`w-5 h-5 ${profile.candidate_year <= 3 ? 'text-amber-600' : 'text-emerald-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${profile.candidate_year <= 3 ? 'text-amber-800' : 'text-emerald-800'}`}>
              {profile.candidate_year}{['st','nd','rd','th'][Math.min(profile.candidate_year - 1, 3)]} Year Student
            </p>
            <p className={`text-xs ${profile.candidate_year <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {profile.candidate_year <= 3
                ? 'Showing internship opportunities only. Full-time jobs will unlock in 4th year.'
                : 'Showing all opportunities — internships, full-time, contract, and part-time roles.'}
            </p>
          </div>
          <div className={`hidden sm:flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
            profile.candidate_year <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <Briefcase className="w-3.5 h-3.5" />
            {profile.candidate_year <= 3 ? 'Internships' : 'All Jobs'}
          </div>
        </div>
      )}

      {/* No year set banner */}
      {isCandidate && !profile?.candidate_year && (
        <div className="mb-4 rounded-xl p-4 flex items-center gap-3 bg-blue-50 border border-blue-200">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Set your <a href="/profile" className="font-semibold underline">year of study</a> in your profile to see opportunities relevant to your year.
          </p>
        </div>
      )}

      {/* AI Search — candidates only */}
      {isCandidate && (
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
              <input type="text" value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAISearch() }}
                placeholder="Try: remote react jobs above 10 LPA..."
                className="input-field pl-10 text-sm" disabled={aiSearching} />
            </div>
            <button onClick={handleAISearch} disabled={aiSearching || !aiQuery.trim()} className="btn-accent py-2 px-3 sm:px-4 text-xs sm:text-sm disabled:opacity-40">
              {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">AI Search</span></>}
            </button>
          </div>
        </div>
      )}

      {/* Trending Skills — candidates only */}
      {isCandidate && trendingSkills.length > 0 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          <TrendingUp className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span className="text-xs text-primary/40 flex-shrink-0">Trending:</span>
          {trendingSkills.map(([skill, count]) => (
            <button key={skill} onClick={() => applyFilters({ ...EMPTY_FILTERS, skills: [skill] })}
              className="badge bg-slate-100 text-primary/60 text-xs py-0.5 px-2 flex-shrink-0 hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors">
              {skill} <span className="text-primary/30 ml-0.5">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-primary">{isRecruiter ? 'My Job Postings' : 'Browse Jobs'}</h1>
          {!loading && <p className="text-primary/50 mt-1 text-sm">
            {totalCount} job{totalCount !== 1 ? 's' : ''} {isRecruiter ? 'posted by you' : sortBy === 'relevance' ? 'ranked by relevance' : 'found'}
          </p>}
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0) }} className="input-field py-2 text-xs sm:text-sm w-auto">
            {isCandidate && <option value="relevance">Best Match</option>}
            <option value="newest">Newest First</option>
            <option value="salary_high">Salary: High → Low</option>
            <option value="salary_low">Salary: Low → High</option>
            <option value="applications">Most Applied</option>
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden btn-secondary py-2 px-3">
            {showFilters ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeChips.map((chip, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-accent-50 text-accent-700 text-xs font-medium py-1 px-2.5 rounded-full">
              {chip.label}
              <button onClick={chip.clear} className="hover:text-red-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button onClick={() => applyFilters(EMPTY_FILTERS)} className="text-xs text-red-500 hover:text-red-600 font-medium py-1 px-2">
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-72 flex-shrink-0`}>
          <div className="sticky top-20 card">
            <h3 className="font-bold text-slate-900 mb-4">Filters</h3>
            <JobFilters filters={filters} onApply={applyFilters} />
          </div>
        </div>

        {/* Job List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <SkeletonList count={6} />
          ) : jobs.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-primary/20 mx-auto mb-4" />
              <p className="text-lg text-primary/50 mb-2">
                {isRecruiter ? 'No jobs posted yet' : (!profile?.skills?.length ? 'Upload your resume first' : 'No matching jobs found')}
              </p>
              <p className="text-sm text-primary/30 mb-4">
                {isRecruiter ? 'Post your first job to get started' : (!profile?.skills?.length ? 'We need your skills to show relevant jobs' : 'Try adjusting your filters or add more skills to your profile')}
              </p>
              {isRecruiter ? (
                <Link to="/post-job" className="btn-accent text-sm">Post a Job</Link>
              ) : !profile?.skills?.length ? (
                <Link to="/resume-match" className="btn-accent text-sm">Upload Resume</Link>
              ) : (
                <button onClick={() => applyFilters(EMPTY_FILTERS)} className="btn-secondary text-sm">Clear All Filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} saved={savedJobIds.has(job.id)} onToggleSave={!isRecruiter && user ? toggleSave : undefined} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Show pages around current page
                    let pageNum = i
                    if (totalPages > 5) {
                      const start = Math.max(0, Math.min(page - 2, totalPages - 5))
                      pageNum = start + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 text-sm font-medium rounded-md ${
                          page === pageNum ? 'bg-accent text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
