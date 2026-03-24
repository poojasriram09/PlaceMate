const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const Groq = require("groq-sdk").default;

// --- Init Firebase Admin ---
admin.initializeApp();

// --- Config ---
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || functions.config().supabase?.url,
  process.env.SUPABASE_SERVICE_ROLE_KEY || functions.config().supabase?.service_role_key
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || functions.config().groq?.api_key,
});

// --- Helpers ---
async function generateJSON(prompt) {
  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: 4096,
  });
  const text = completion.choices[0]?.message?.content || "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

async function verifyAuth(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) throw new Error("No token provided");
  const decoded = await admin.auth().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}

// --- Express App ---
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// POST /parse-resume
app.post("/parse-resume", upload.single("resume"), async (req, res) => {
  try {
    const user = await verifyAuth(req);
    if (!req.file) return res.status(400).json({ message: "No resume file uploaded" });

    // Extract text from PDF
    const pdf = require("pdf-parse/lib/pdf-parse.js");
    const pdfData = await pdf(req.file.buffer);
    const resumeText = pdfData.text;
    if (!resumeText?.trim()) return res.status(400).json({ message: "Could not extract text from PDF" });

    const parsed = await generateJSON(`You are a resume parser. Analyze the following resume text and extract structured data.

Resume Text:
${resumeText}

Return ONLY valid JSON with this exact structure:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
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
}`);

    // Upload resume to Supabase Storage
    const fileName = `${user.uid}/${Date.now()}-resume.pdf`;
    await supabaseAdmin.storage.from("resumes").upload(fileName, req.file.buffer, { contentType: "application/pdf", upsert: true });

    // Update profile
    await supabaseAdmin.from("profiles").update({
      resume_url: fileName,
      resume_text: resumeText,
      skills: parsed.skills || [],
      experience_years: parsed.experience_years || null,
      education: parsed.education || null,
    }).eq("id", user.uid);

    res.json({ parsed, resume_url: fileName });
  } catch (err) {
    console.error("parse-resume error:", err);
    res.status(err.message === "No token provided" || err.message === "Invalid token" ? 401 : 500).json({ message: err.message });
  }
});

// POST /match-jobs
app.post("/match-jobs", async (req, res) => {
  try {
    await verifyAuth(req);
    const { profile: candidateProfile } = req.body;

    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("id, title, company_name, location, skills_required, experience_min, experience_max, job_type, description")
      .eq("is_active", true)
      .limit(50);

    if (!jobs?.length) return res.json({ matches: [] });

    const matches = await generateJSON(`You are a job matching engine. Compare the candidate profile with the job listings and score each match.

Candidate Profile:
${JSON.stringify(candidateProfile)}

Job Listings:
${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, company_name: j.company_name, location: j.location, skills_required: j.skills_required, experience_min: j.experience_min, experience_max: j.experience_max, job_type: j.job_type, description: j.description?.substring(0, 200) })))}

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

Sort by match_score descending. Scoring guide:
- 90-100: Perfect match
- 70-89: Strong match
- 50-69: Moderate match
- Below 50: Weak match

Return top 10 matches only.`);

    const enrichedMatches = matches.map((m) => {
      const job = jobs.find((j) => j.id === m.job_id);
      return { ...m, job_title: job?.title, company: job?.company_name, location: job?.location };
    });

    res.json({ matches: enrichedMatches });
  } catch (err) {
    console.error("match-jobs error:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /match-candidates
app.post("/match-candidates", async (req, res) => {
  try {
    await verifyAuth(req);
    const { job, candidates } = req.body;

    const rankings = await generateJSON(`You are a recruitment AI. Rank these candidates for the given job posting.

Job Posting:
${JSON.stringify({ title: job.title, company_name: job.company_name, skills_required: job.skills_required, experience_min: job.experience_min, experience_max: job.experience_max, description: job.description?.substring(0, 300) })}

Candidates:
${JSON.stringify(candidates)}

Return ONLY valid JSON array sorted by rank:
[
  {
    "candidate_id": "uuid",
    "rank": 1,
    "score": 0-100,
    "strengths": ["strength1", "strength2"],
    "concerns": ["concern1"],
    "recommendation": "Strong Hire / Hire / Maybe / Pass"
  }
]`);

    res.json({ rankings });
  } catch (err) {
    console.error("match-candidates error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Export as Firebase Cloud Function
exports.api = functions.https.onRequest(app);
