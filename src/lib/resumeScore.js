/**
 * Resume status — simple binary checks.
 * No fake scores. No arbitrary thresholds. No letter grades.
 * The only score that matters is skill verification via quiz.
 */

export function getResumeStatus(profile) {
  const skills = profile?.skills || []
  return {
    hasResume: !!profile?.resume_url,
    hasSkills: skills.length > 0,
    hasEducation: !!profile?.education,
    hasYear: profile?.candidate_year != null,
    skillCount: skills.length,
    verifiedCount: (profile?.skills_verified || []).length,
    complete: !!profile?.resume_url && skills.length > 0,
  }
}
