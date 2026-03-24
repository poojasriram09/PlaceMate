import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker from local bundle
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

export async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || 'AI request failed'
    if (res.status === 429) throw new Error('Rate limit reached. Please wait a few minutes and try again.')
    throw new Error(msg)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```\w*\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to extract JSON from the response if there's extra text around it
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    throw new Error('AI returned invalid response. Please try again.')
  }
}

export async function generateQuizQuestions(skill) {
  const s = skill.trim()

  return callGroq(`You are generating a multiple-choice skill verification quiz. The skill is: "${s}"

ABSOLUTE RULE: EVERY question must be ONLY about "${s}".
- HTML quiz → ONLY HTML tags, attributes, semantics. NOT CSS, NOT JavaScript.
- CSS quiz → ONLY CSS properties, selectors, layout. NOT HTML, NOT JS.
- Python quiz → ONLY Python syntax, built-ins. NOT Java, NOT JS.
- React quiz → ONLY React hooks, components, JSX. NOT vanilla JS.
- SQL quiz → ONLY SQL queries, joins, clauses. NOT MongoDB.
- Git quiz → ONLY Git commands, branching. NOT GitHub UI.
- Docker quiz → ONLY Docker commands, Dockerfile. NOT Kubernetes.
- Apply this for ANY skill: 100% within "${s}" scope only.

FORMAT: Multiple choice with exactly 4 options (A, B, C, D). One correct answer.

RULES:
- Make wrong options PLAUSIBLE (not obviously wrong garbage)
- Wrong options should be from the SAME domain as "${s}" (e.g., for HTML, wrong options should be real HTML concepts, just wrong for this question)
- VERIFY the correct answer index is accurate
- "correct" field is the INDEX (0-3) of the correct option
- Make 2 easy, 2 medium, 1 hard
- For coding skills, include code snippets where appropriate
- Randomize the position of the correct answer (don't always put it as option A)

Generate exactly 5 questions for "${s}".

Return ONLY valid JSON array:
[
  {
    "question": "What HTML tag creates a numbered list?",
    "code": null,
    "options": ["<ul>", "<ol>", "<li>", "<dl>"],
    "correct": 1,
    "difficulty": "easy"
  }
]

For code questions, put code in "code" field with \\n for newlines. For non-code, set "code" to null.`)
}

export async function gradeAnswer(expectedAnswer, candidateAnswer, acceptVariants = []) {
  if (!candidateAnswer?.trim()) return false

  const normalize = s => s.toLowerCase().trim().replace(/['"`;{}\s]/g, '').replace(/\.0$/, '')
  const candidate = normalize(candidateAnswer)
  const expected = normalize(expectedAnswer)

  // Fast path: exact match
  if (candidate === expected) return true
  if (acceptVariants.some(v => normalize(v) === candidate)) return true

  // Numeric equivalence: "3" === "3.0"
  const numC = Number(candidateAnswer.trim())
  const numE = Number(expectedAnswer.trim())
  if (!isNaN(numC) && !isNaN(numE) && numC === numE) return true

  // Boolean equivalence
  if (['true', 'false'].includes(candidate) && candidate === expected) return true

  // If lengths are wildly different, likely wrong — skip AI
  if (candidate.length > 3 && expected.length > 0) {
    const ratio = Math.min(candidate.length, expected.length) / Math.max(candidate.length, expected.length)
    if (ratio < 0.25) return false
  }

  // AI grading — STRICT, uses YES/NO (not "correct"/"incorrect" which was buggy)
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `Grade this quiz answer STRICTLY.

Expected: "${expectedAnswer}"
Candidate wrote: "${candidateAnswer}"
${acceptVariants.length ? `Also accept: ${acceptVariants.join(', ')}` : ''}

Rules:
- Must match in MEANING and VALUE
- Typos OK ("lenght" = "length")
- Format differences OK ("3" = "3.0")
- WRONG values = WRONG ("4" when expected "3" = WRONG)
- Vague/unrelated = WRONG
- When in doubt = WRONG

Reply EXACTLY one word: YES or NO` }],
        temperature: 0, max_tokens: 5,
      }),
    })
    const data = await res.json()
    const reply = (data.choices?.[0]?.message?.content || '').trim().toUpperCase()
    // STRICT: only accept explicit YES
    return reply === 'YES' || reply === 'YES.'
  } catch {
    return false
  }
}

export async function generateATSScore(parsedResume, rawText) {
  return callGroq(`You are an ATS (Applicant Tracking System) resume scanner. Score this resume and give specific, actionable feedback.

Parsed Resume Data:
${JSON.stringify(parsedResume)}

Raw Resume Text (first 2000 chars):
${(rawText || '').substring(0, 2000)}

Score the resume on these ATS criteria (each 0-100):

1. CONTACT INFO: Does it have name, email, phone, location? Missing = low score.
2. SKILLS FORMAT: Are skills clearly listed? ATS needs explicit skill keywords, not buried in paragraphs.
3. EXPERIENCE CLARITY: Are job titles, companies, and dates clearly structured? ATS parses these.
4. EDUCATION: Is degree, institution, and year clearly stated?
5. KEYWORD DENSITY: Does the resume have enough industry keywords that ATS scanners look for?
6. FORMAT & STRUCTURE: Is it well-organized with clear sections? Tables, images, columns confuse ATS.
7. SUMMARY/OBJECTIVE: Does it have a professional summary at the top?
8. QUANTIFIABLE ACHIEVEMENTS: Does it include numbers/metrics (e.g., "increased sales by 30%")?

Return ONLY valid JSON:
{
  "ats_score": 72,
  "category_scores": {
    "contact_info": { "score": 90, "feedback": "specific feedback" },
    "skills_format": { "score": 75, "feedback": "specific feedback" },
    "experience_clarity": { "score": 60, "feedback": "specific feedback" },
    "education": { "score": 80, "feedback": "specific feedback" },
    "keyword_density": { "score": 65, "feedback": "specific feedback" },
    "format_structure": { "score": 70, "feedback": "specific feedback" },
    "summary": { "score": 50, "feedback": "specific feedback" },
    "quantifiable_achievements": { "score": 40, "feedback": "specific feedback" }
  },
  "improvements": [
    "Add a professional summary at the top of your resume",
    "Include metrics — e.g., 'Built app used by 500+ users' instead of 'Built app'",
    "List skills in a dedicated section, not scattered in job descriptions"
  ],
  "strengths": [
    "Clear contact information",
    "Good skill variety"
  ],
  "overall_feedback": "2-3 sentence summary of the resume quality and what to prioritize fixing"
}

Be specific and actionable. Reference actual content from the resume.`)
}

export async function extractPDFText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(' ') + '\n'
  }
  return text.trim()
}

export async function parseResume(resumeText) {
  return callGroq(`You are a resume parser. Analyze the following resume text and extract structured data.

Resume Text:
${resumeText}

Return ONLY valid JSON with this exact structure:
{
  "full_name": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "skills": ["skill1", "skill2"],
  "experience_years": number,
  "education": "highest degree - institution",
  "work_experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "summary": "2-3 sentence professional summary"
}`)
}

export async function matchJobs(candidateProfile, jobs) {
  const jobsSummary = jobs.map(j => ({
    id: j.id, title: j.title, company_name: j.company_name, location: j.location,
    skills_required: j.skills_required, target_years: j.target_years,
    job_type: j.job_type,
    description: j.description?.substring(0, 200),
  }))

  return callGroq(`You are a job matching engine. Compare the candidate profile with the job listings and score each match.

Candidate Profile:
${JSON.stringify(candidateProfile)}

Job Listings:
${JSON.stringify(jobsSummary)}

For each job, return ONLY valid JSON array:
[
  {
    "job_id": "uuid",
    "match_score": 0-100,
    "reasoning": "1-2 sentence explanation",
    "matching_skills": ["skill1", "skill2"],
    "missing_skills": ["skill3"]
  }
]

Sort by match_score descending. Return top 10 matches only.
- 90-100: Perfect match
- 70-89: Strong match
- 50-69: Moderate match
- Below 50: Weak match`)
}

export async function rankCandidates(job, candidates) {
  return callGroq(`You are a recruitment AI. Rank these candidates for the given job posting.

Job Posting:
${JSON.stringify({ title: job.title, company_name: job.company_name, skills_required: job.skills_required, target_years: job.target_years, job_type: job.job_type, description: job.description?.substring(0, 300) })}

Candidates:
${JSON.stringify(candidates)}

Return ONLY valid JSON array sorted by rank:
[
  {
    "candidate_id": "string",
    "rank": 1,
    "score": 0-100,
    "strengths": ["strength1", "strength2"],
    "concerns": ["concern1"],
    "recommendation": "Strong Hire / Hire / Maybe / Pass"
  }
]`)
}

export async function generateJobDescription(title, skills, experience) {
  return callGroq(`Generate a professional job description for a "${title}" position requiring skills: ${skills?.join(', ') || 'general'}. Experience: ${experience || 'any level'}. Return ONLY a JSON object with: {"description": "full job description text", "requirements": "requirements text"}`)
}
