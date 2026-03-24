/**
 * Eligibility engine — determines if a candidate can apply to a job.
 * Simple rule: verify at least 60% of required skills (minimum 1).
 * No backdoors. No "apply anyway". Either eligible or not.
 */

const SKILL_ALIASES = {
  'js': 'javascript', 'javascript': 'js',
  'ts': 'typescript', 'typescript': 'ts',
  'node': 'node.js', 'node.js': 'node',
  'react': 'react.js', 'react.js': 'react',
  'vue': 'vue.js', 'vue.js': 'vue',
  'next': 'next.js', 'next.js': 'next',
  'postgres': 'postgresql', 'postgresql': 'postgres',
  'mongo': 'mongodb', 'mongodb': 'mongo',
  'k8s': 'kubernetes', 'kubernetes': 'k8s',
  'ml': 'machine learning', 'machine learning': 'ml',
}

function fuzzyMatch(a, b) {
  const la = a.toLowerCase().trim()
  const lb = b.toLowerCase().trim()
  if (la === lb) return true
  if (la.includes(lb) || lb.includes(la)) return true
  if (SKILL_ALIASES[la] === lb || SKILL_ALIASES[lb] === la) return true
  return false
}

export function computeEligibility(profile, job) {
  const requiredSkills = job?.skills_required || []
  const candidateSkills = profile?.skills || []
  const verifiedSkills = profile?.skills_verified || []

  if (requiredSkills.length === 0) {
    return { eligible: true, verifiedCount: 0, totalRequired: 0, threshold: 0, needed: 0, skills: [] }
  }

  if (candidateSkills.length === 0) {
    return {
      eligible: false, verifiedCount: 0, totalRequired: requiredSkills.length,
      threshold: Math.max(1, Math.ceil(requiredSkills.length * 0.6)), needed: Math.max(1, Math.ceil(requiredSkills.length * 0.6)),
      skills: requiredSkills.map(s => ({ skill: s, claimed: false, verified: false })),
    }
  }

  const skills = requiredSkills.map(reqSkill => ({
    skill: reqSkill,
    claimed: candidateSkills.some(cs => fuzzyMatch(cs, reqSkill)),
    verified: verifiedSkills.some(vs => fuzzyMatch(vs, reqSkill)),
  }))

  const verifiedCount = skills.filter(s => s.verified).length
  const threshold = Math.max(1, Math.ceil(requiredSkills.length * 0.6))
  const eligible = verifiedCount >= threshold

  return {
    eligible,
    verifiedCount,
    totalRequired: requiredSkills.length,
    threshold,
    needed: Math.max(0, threshold - verifiedCount),
    skills,
  }
}
