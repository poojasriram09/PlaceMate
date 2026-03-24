/**
 * Calculate match score between a candidate profile and a job.
 * Returns { score: 0-100, breakdown: {...}, reasoning: string }
 *
 * Weights:
 *   Skills overlap:      40%
 *   Experience fit:      30%
 *   Location match:      15%
 *   Job type fit:        15%
 */

export function calculateMatchScore(profile, job) {
  const breakdown = {
    skills: calcSkillsScore(profile, job),
    experience: calcExperienceScore(profile, job),
    location: calcLocationScore(profile, job),
    jobType: calcJobTypeScore(profile, job),
  }

  const score = Math.round(
    breakdown.skills.score * 0.40 +
    breakdown.experience.score * 0.30 +
    breakdown.location.score * 0.15 +
    breakdown.jobType.score * 0.15
  )

  const reasons = []
  if (breakdown.skills.matched.length > 0) reasons.push(`${breakdown.skills.matched.length}/${(job.skills_required || []).length} skills match`)
  if (breakdown.experience.score >= 80) reasons.push('Experience level aligns well')
  else if (breakdown.experience.score < 40) reasons.push('Experience gap detected')
  if (breakdown.location.score === 100) reasons.push('Location matches')
  if (breakdown.skills.missing.length > 0) reasons.push(`Missing: ${breakdown.skills.missing.slice(0, 3).join(', ')}`)

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    reasoning: reasons.join('. ') || 'General match based on profile',
    matching_skills: breakdown.skills.matched,
    missing_skills: breakdown.skills.missing,
  }
}

function calcSkillsScore(profile, job) {
  const candidateSkills = (profile?.skills || []).map(s => s.toLowerCase().trim())
  const requiredSkills = (job?.skills_required || []).map(s => s.toLowerCase().trim())

  if (requiredSkills.length === 0) return { score: 50, matched: [], missing: [] }

  const matched = []
  const missing = []

  for (const req of requiredSkills) {
    // Fuzzy match: check if candidate has the skill or a close variant
    const found = candidateSkills.some(cs =>
      cs === req ||
      cs.includes(req) ||
      req.includes(cs) ||
      // Common abbreviations
      (cs === 'js' && req === 'javascript') ||
      (cs === 'javascript' && req === 'js') ||
      (cs === 'ts' && req === 'typescript') ||
      (cs === 'typescript' && req === 'ts') ||
      (cs === 'node' && req === 'node.js') ||
      (cs === 'node.js' && req === 'node') ||
      (cs === 'react.js' && req === 'react') ||
      (cs === 'react' && req === 'react.js') ||
      (cs === 'postgres' && req === 'postgresql') ||
      (cs === 'postgresql' && req === 'postgres')
    )
    if (found) matched.push(req)
    else missing.push(req)
  }

  const ratio = matched.length / requiredSkills.length
  // Non-linear scoring: having 3/5 skills is better than 60%
  const score = Math.round(ratio * 100 * (0.7 + 0.3 * ratio))

  return {
    score: Math.min(100, score),
    matched: matched.map(s => job.skills_required.find(r => r.toLowerCase() === s) || s),
    missing: missing.map(s => job.skills_required.find(r => r.toLowerCase() === s) || s),
  }
}

function calcExperienceScore(profile, job) {
  const year = profile?.candidate_year ?? null
  const jobType = job?.job_type || ''
  const targetYears = job?.target_years || []

  if (year == null) return { score: 50, detail: 'Year not specified' }

  // If job specifies target years, check match
  if (targetYears.length > 0) {
    if (targetYears.includes(year)) return { score: 100, detail: `Job targets ${year}${['st','nd','rd','th'][Math.min(year-1,3)]} year students — perfect match` }
    return { score: 20, detail: `Job targets ${targetYears.join(', ')}${['st','nd','rd','th'][0]} year students` }
  }

  // Fallback: year vs job type
  if (jobType === 'internship') {
    if (year <= 3) return { score: 95, detail: 'Perfect for internship' }
    return { score: 80, detail: 'Internship still relevant for 4th year' }
  }
  if (year === 4) return { score: 90, detail: 'Ready for full-time roles' }
  if (year === 3) return { score: 50, detail: 'Full-time may be early' }
  return { score: 20, detail: 'Too early for full-time' }
}

function calcLocationScore(profile, job) {
  const candidateLoc = (profile?.location || '').toLowerCase().trim()
  const jobLoc = (job?.location || '').toLowerCase().trim()

  if (!candidateLoc || !jobLoc) return { score: 50, detail: 'Location not specified' }

  // Remote location match
  if (jobLoc.includes('remote')) return { score: 100, detail: 'Remote job' }

  // Exact city match
  if (candidateLoc === jobLoc) return { score: 100, detail: 'Same location' }

  // Partial match (same city in different format)
  const candidateParts = candidateLoc.split(/[,\s]+/).filter(Boolean)
  const jobParts = jobLoc.split(/[,\s]+/).filter(Boolean)
  const overlap = candidateParts.some(p => jobParts.some(jp => jp.includes(p) || p.includes(jp)))

  if (overlap) return { score: 80, detail: 'Location partially matches' }

  // Same country
  const sameCountry = candidateParts.some(p => ['india', 'in'].includes(p)) && jobParts.some(p => ['india', 'in'].includes(p))
  if (sameCountry) return { score: 40, detail: 'Same country, different city' }

  return { score: 20, detail: 'Different location' }
}

function calcJobTypeScore(profile, job) {
  const type = job?.job_type || ''
  const year = profile?.candidate_year ?? 4

  if (type === 'internship') {
    if (year <= 3) return { score: 95, detail: 'Internship — ideal for your year' }
    return { score: 75, detail: 'Internship — available for 4th year too' }
  }
  if (type === 'full-time') {
    if (year === 4) return { score: 90, detail: 'Full-time — ready for placement' }
    return { score: 30, detail: 'Full-time — may require 4th year' }
  }
  if (type === 'contract') return { score: 60, detail: 'Contract position' }
  if (type === 'part-time') return { score: 50, detail: 'Part-time position' }
  return { score: 50, detail: 'Unknown type' }
}

/**
 * Score all jobs for a candidate and return sorted results
 */
export function scoreJobsForCandidate(profile, jobs) {
  return jobs
    .map(job => {
      const result = calculateMatchScore(profile, job)
      return {
        job_id: job.id,
        job_title: job.title,
        company: job.company_name,
        location: job.location,
        ...result,
      }
    })
    .sort((a, b) => b.score - a.score)
}
