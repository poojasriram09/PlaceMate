# PlaceMate — Complete Project Documentation

## For Beginners: Everything You Need to Know

---

## 1. What We Built

**PlaceMate** is a verified campus hiring platform where:
- **Students** upload resumes, verify skills through AI-proctored quizzes, and apply only to jobs that match their proven abilities
- **Recruiters** post jobs, get AI-assisted candidate screening, and manage applications with email notifications
- **TPO (Training & Placement Officer)** verifies recruiters, monitors the entire platform, and exports hiring data

It's not just a job portal — it's a **trust-based hiring ecosystem** with AI on every layer.

---

## 2. The Thinking Process

### The Problem
Campus hiring is broken:
- Fake job postings scam students
- Students spam-apply to everything without checking eligibility
- Recruiters get 100 applications from unqualified candidates
- Resumes are unreliable — anyone can claim "5 years of React"
- No oversight — nobody ensures the process is fair

### Our Solution — Three Layers of Trust

**Layer 1: TPO Verification**
Every recruiter must be approved by the college's TPO before posting jobs. No verification = no access. This eliminates fake job postings.

**Layer 2: Skill Verification**
Students don't just claim skills — they prove them. Upload your resume → AI extracts skills → take a typed-answer quiz per skill (not multiple choice — you type the actual answer). Pass 4/5 questions in 45 seconds each. Only verified skills count when applying.

**Layer 3: AI on Both Sides**
Candidates get a Career Copilot that knows their profile and all jobs. Recruiters get a Hiring Agent that knows all applicants. Both use real platform data, not generic advice.

### How We Approached It

**Step 1:** Built the foundation — auth, database, job CRUD, applications
**Step 2:** Added the search and filter system for job discovery
**Step 3:** Built the AI layer — resume parsing, job matching, candidate ranking
**Step 4:** Added the trust layer — TPO verification, skill quizzes, eligibility gates
**Step 5:** Built the interview simulator — AI questions with voice and webcam
**Step 6:** Built the dual AI agents — Career Copilot + Hiring Agent
**Step 7:** Added email notifications and CSV export
**Step 8:** Polished UI, fixed bugs, deployed

---

## 3. Tech Stack Explained

### Frontend (What Users See)

| Technology | What It Does | Why We Chose It |
|-----------|-------------|----------------|
| **React 18** | JavaScript library for building user interfaces | Industry standard, component-based, huge community |
| **Vite** | Build tool that bundles our code | Extremely fast dev server, instant hot reload |
| **Tailwind CSS v3** | Utility-first CSS framework | Write styles directly in JSX, no separate CSS files |
| **React Router DOM v6** | Client-side page routing | Navigate between pages without full page reloads |
| **Framer Motion** | Animation library | Smooth page transitions and micro-interactions |
| **Lucide React** | Icon library | Clean, consistent SVG icons |
| **React Hot Toast** | Notification popups | Success/error messages |
| **React Dropzone** | Drag-and-drop file upload | Resume upload UX |

### Backend / Services (What Powers It)

| Technology | What It Does | Why We Chose It |
|-----------|-------------|----------------|
| **Firebase Auth** | User login (Google + email/password) | Free, reliable, Google sign-in built in |
| **Firebase Hosting** | Serves the website globally | Free CDN, SSL, fast |
| **Supabase** | PostgreSQL database + file storage | Free tier, instant REST API, real-time capable |
| **Groq API (Llama 3.3 70B)** | AI brain for everything | Free tier, extremely fast, no GPU needed |
| **pdfjs-dist** | Extracts text from PDF resumes in browser | No server needed, works offline |
| **EmailJS** | Sends emails on status changes | Free tier (200/month), no backend needed |
| **Web Speech API** | Voice input/output for interviews | Built into Chrome, zero cost |
| **face-api.js** | Webcam face detection for interviews | Real-time confidence/engagement tracking |

### Languages Used

| Language | Where |
|---------|-------|
| **JavaScript (JSX)** | All frontend code — React components, pages, AI logic |
| **CSS (via Tailwind)** | Styling as utility classes |
| **SQL** | Database schema, triggers, functions |
| **HTML** | Single `index.html` entry point |

---

## 4. How Everything Connects

```
User's Browser
    │
    ├── React App (Vite serves this)
    │     │
    │     ├── Firebase Auth ──→ Google/Email login (3 roles: student/recruiter/TPO)
    │     │
    │     ├── Supabase Client ──→ PostgreSQL Database
    │     │     ├── profiles (users with skills, verification status)
    │     │     ├── jobs (postings with requirements)
    │     │     ├── applications (candidate↔job links with status)
    │     │     ├── skill_quizzes (quiz history with scores)
    │     │     ├── verification_requests (TPO approval flow)
    │     │     └── saved_jobs (bookmarks)
    │     │
    │     ├── Supabase Storage ──→ Resume PDF files
    │     │
    │     ├── Groq API ──→ AI for everything:
    │     │     ├── Resume parsing (extract skills from PDF text)
    │     │     ├── Job matching (score candidate vs job)
    │     │     ├── Candidate ranking (rank all applicants)
    │     │     ├── Quiz generation (typed-answer questions)
    │     │     ├── Answer grading (fuzzy match + AI check)
    │     │     ├── Interview questions (6-question mock interview)
    │     │     ├── Interview scoring (per-answer + final scorecard)
    │     │     ├── Career Copilot (personalized career advice)
    │     │     ├── Hiring Agent (recruiter screening assistant)
    │     │     └── Job description generator
    │     │
    │     ├── EmailJS ──→ Status change emails to candidates
    │     ├── Web Speech API ──→ Voice mode for interviews
    │     ├── face-api.js ──→ Webcam confidence tracking
    │     └── pdfjs-dist ──→ PDF text extraction in browser
    │
    └── Firebase Hosting (serves the built files globally)
```

**Key insight:** There is NO traditional backend server. Everything runs in the browser or calls external APIs directly. This is called a **serverless architecture**.

---

## 5. User Roles & What Each Can Do

### Student (Candidate)
1. Register → complete profile → upload resume
2. AI extracts skills from resume
3. Take skill verification quiz (typed answers, 45s per question)
4. Browse jobs that match their verified skills (no matching jobs = hidden)
5. See eligibility status per job (how many skills verified vs required)
6. Apply to jobs (only if enough skills verified)
7. Track applications with status updates
8. Practice mock interviews (AI questions + voice + webcam)
9. Chat with Career Copilot for personalized advice

### Recruiter
1. Register → submit company details → wait for TPO approval
2. Once verified → post jobs (with AI description generator)
3. View applicants with match scores + verified skill badges
4. AI rank candidates with one click
5. Change application status → candidate gets email automatically
6. Edit/deactivate/delete job postings
7. Chat with Hiring Agent for screening and interview questions

### TPO (Training & Placement Officer)
1. Register as TPO
2. View pending recruiter verification requests
3. Approve/reject recruiters with reasons
4. Monitor all jobs on the platform
5. View all recruiters, revoke access if needed
6. See platform-wide stats (students, recruiters, placements)
7. Export all application data to CSV for reports

---

## 6. Database Design

### `profiles` — Who are the users?
```
id (Firebase UID)     | email      | full_name   | role (candidate/recruiter/tpo)
skills[]              | skills_verified[]  | quiz_scores (JSON)
experience_years      | education  | location    | bio
resume_url            | company_name       | company_website
verification_status   | verified_by        | verification_note
trust_score           | trust_flags[]
```

### `jobs` — What positions are available?
```
id (UUID)             | recruiter_id → profiles  | title    | company_name
description           | requirements              | skills_required[]
location              | job_type (full-time/part-time/contract/internship)
salary_min/max        | experience_min/max         | is_active
application_count     | created_at
```

### `applications` — Who applied where?
```
id (UUID)             | job_id → jobs  | candidate_id → profiles
status (applied→reviewed→shortlisted→interview→offered/rejected/withdrawn)
match_score           | match_reasoning    | cover_letter
trust_score           | trust_flags[]      | skills_quiz_summary
UNIQUE(job_id, candidate_id)  ← one application per job per candidate
```

### `skill_quizzes` — Quiz history
```
id (UUID)             | candidate_id → profiles  | skill
questions (JSON)      | answers (JSON)           | score | total | passed
integrity_score       | integrity_flags          | time_taken_seconds
```

### `verification_requests` — TPO approval flow
```
id (UUID)             | recruiter_id → profiles
company_name          | company_website   | company_email
status (pending/approved/rejected)        | reason
reviewed_by           | reviewed_at
```

### Database Triggers
- When someone applies → `application_count` auto-increments on the job
- `search_jobs(text)` function for full-text search across title, description, company, skills

---

## 7. The Skill Verification System

This is the core innovation. Here's exactly how it works:

### Step 1: Resume Upload
```
Candidate uploads PDF → pdfjs-dist extracts raw text in browser
→ Groq AI parses: name, email, skills[], experience, education
→ Skills saved to profile
```

### Step 2: Skill Quiz (per skill)
```
Candidate clicks a skill to verify → AI generates 5 questions:
  - Code output: "What does this code print?" (type the answer)
  - Fill-in-blank: "const [count, ___] = useState(0)"
  - Bug finding: "What line has the error?"
  - Function result: "What does fn([3,1,4]) return?"
  - Concept: "What React hook handles side effects?"

Rules:
  - 45 seconds per question (tight enough to prevent Googling)
  - Type the answer — NOT multiple choice
  - AI grades with fuzzy matching (handles typos)
  - Need 4/5 correct to pass (80%)
  - Passed skills get "Verified" badge
```

### Step 3: Eligibility Gate
```
Job requires: [React, Node, PostgreSQL, Docker, AWS]
Threshold: ceil(5 × 0.6) = 3 skills must be verified

Candidate verified: [React ✅, Node ✅]
Status: "Verify 1 more skill to apply" → Apply button LOCKED

Candidate verifies PostgreSQL ✅
Status: "Eligible to apply!" → Apply button UNLOCKED
```

### Why This Matters
A candidate can't fake their way in. They can claim any skill on their resume, but they can't apply unless they PROVE it through the quiz. MCQ quizzes are useless (ChatGPT answers them in 5 seconds). Typed-answer questions with 45-second timers are genuinely hard to cheat.

---

## 8. The AI Systems

### 8.1 Career Copilot (For Candidates)
A floating chat button (copper sparkle ✨) on every page.

**What it knows:**
- Candidate's complete profile, skills, verified skills
- Every quiz result with exact scores
- All their applications with statuses and match scores
- Every active job on the platform with requirements

**What it does:**
- "What jobs match my skills?" → lists REAL jobs from the platform
- "Write me a cover letter for [job]" → uses YOUR skills + job's requirements
- "What should I learn next?" → analyzes gap between your skills and top jobs
- "Prepare me for an interview at [company]" → generates company-specific questions

### 8.2 Hiring Agent (For Recruiters)
A floating chat button (navy zap ⚡) on every page.

**What it knows:**
- All recruiter's job postings
- Every applicant with full profile, skills, quiz results, match scores, cover letters

**What it does:**
- "Screen all applicants for my React role" → ranked list with HIRE/CONSIDER/PASS
- "Who are my top 3 candidates?" → detailed analysis with reasons
- "Draft rejection email for [name]" → personalized, professional email
- "Generate interview questions for [candidate]" → tailored to their background

### 8.3 Interview Simulator
A full mock interview system at `/interview`.

**How it works:**
1. Select a job to practice for
2. AI asks 6 role-specific questions (behavioral → technical → problem-solving → closing)
3. Each answer scored on relevance, depth, communication, confidence
4. Questions reference previous answers (feels like real conversation)
5. Final scorecard: overall score, grade, hire recommendation, category breakdowns, model answers

**Voice Mode:** Speak answers using Web Speech API, hear questions read aloud
**Webcam Mode:** face-api.js tracks confidence, eye contact, engagement in real-time

### 8.4 Other AI Features
- **Resume Parsing:** Groq extracts structured data from PDF text
- **Job Matching:** 60% AI score + 40% local scoring (skills/exp/location/type)
- **Candidate Ranking:** Rank all applicants with strengths, concerns, recommendation
- **Job Description Generator:** Enter title + skills → full description generated
- **Quiz Question Generation:** 5 typed-answer questions per skill
- **Answer Grading:** Exact match first, then AI fuzzy check

---

## 9. Email Notification System

When a recruiter changes an application status, the candidate gets an email via EmailJS:

| Status | Email Subject |
|--------|-------------|
| Reviewed | "Your application has been reviewed" |
| Shortlisted | "Congratulations! You have been shortlisted" |
| Interview | "You are invited for an interview" |
| Offered | "Congratulations! You have received a job offer" |
| Rejected | "Update on your application" |

Each email includes: candidate name, job title, company name, personalized message.

---

## 10. Role-Based Data Visibility

| Data | Candidate Sees | Recruiter Sees | TPO Sees |
|------|---------------|---------------|----------|
| Jobs | Only matching their skills | Only their own postings | All jobs (via TPO Panel) |
| Applications | Only their own | Only for their jobs | All (+ CSV export) |
| Profiles | Only their own | Applicants' profiles | All recruiters |
| Navbar | Jobs, Applications, AI Match, Interview | My Jobs, Post Job | TPO Panel, Jobs |

---

## 11. Complete File Structure

```
Job Portal/
│
├── index.html              ← Entry point
├── package.json            ← Dependencies
├── vite.config.js          ← Build config
├── tailwind.config.js      ← Colors (navy + copper), fonts, shadows
├── postcss.config.js       ← Tailwind + Autoprefixer
├── firebase.json           ← Hosting config
├── .firebaserc             ← Firebase project link
├── .env                    ← API keys (Firebase, Supabase, Groq, EmailJS)
├── supabase-schema.sql     ← Original database schema
├── migration-final.sql     ← Run this for all features (verification, quizzes, trust)
├── seed.js                 ← Populate demo data
├── PROJECT_DOCUMENTATION.md ← This file
│
├── src/
│   ├── main.jsx            ← Entry (renders App with providers)
│   ├── App.jsx             ← Router + CareerCopilot + RecruiterAgent
│   ├── index.css           ← Global styles + Tailwind
│   │
│   ├── context/
│   │   └── AuthContext.jsx  ← Firebase Auth + Supabase profile management
│   │
│   ├── lib/
│   │   ├── firebase.js      ← Firebase config + auth instance
│   │   ├── supabase.js      ← Supabase client
│   │   ├── api.js           ← HTTP helper (for Cloud Functions if needed)
│   │   ├── ai.js            ← Groq API: resume parsing, job matching, ranking, quiz generation, answer grading
│   │   ├── scoring.js       ← Local match score engine (skills 40%, experience 30%, location 15%, type 15%)
│   │   ├── eligibility.js   ← Skill verification threshold (60% of required, minimum 1)
│   │   ├── resumeScore.js   ← Simple binary resume checks (has resume, has skills)
│   │   ├── interview.js     ← Interview engine: start, submit answer, generate scorecard
│   │   └── email.js         ← EmailJS: send status change notifications
│   │
│   ├── hooks/
│   │   ├── useVoice.js      ← Speech-to-text + text-to-speech (Web Speech API)
│   │   └── useWebcam.js     ← face-api.js: confidence, eye contact, engagement tracking
│   │
│   ├── utils/
│   │   └── helpers.js       ← Date formatting, salary formatting, status colors, job types
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.jsx       ← Dark nav, role-based links, user dropdown
│   │   │   ├── Footer.jsx       ← Dark footer, 4-column layout
│   │   │   ├── ProtectedRoute.jsx ← Auth + role guard
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── Skeleton.jsx     ← Loading skeleton cards
│   │   ├── jobs/
│   │   │   ├── JobCard.jsx      ← Job card with match score + eligibility indicator
│   │   │   ├── JobFilters.jsx   ← Tag-based filters with Apply button
│   │   │   └── JobForm.jsx      ← Job posting form with AI description generator
│   │   ├── applications/
│   │   │   ├── ApplicationCard.jsx  ← Application with status badge
│   │   │   └── ApplicationStatus.jsx ← Status dropdown
│   │   ├── dashboard/
│   │   │   └── StatsCard.jsx    ← Stat card with icon
│   │   └── ai/
│   │       ├── ResumeUploader.jsx   ← Drag-and-drop PDF upload
│   │       ├── MatchResults.jsx     ← Job match results with scores
│   │       ├── CareerCopilot.jsx    ← Floating AI chat for candidates
│   │       └── RecruiterAgent.jsx   ← Floating AI chat for recruiters
│   │
│   └── pages/
│       ├── Home.jsx             ← Landing page (hero, search, stats, jobs)
│       ├── Login.jsx            ← Email/password + Google OAuth
│       ├── Register.jsx         ← 3-role registration (Student/Recruiter/TPO)
│       ├── Jobs.jsx             ← Role-based job listing with filters
│       ├── JobDetailPage.jsx    ← Job detail with eligibility panel + apply
│       ├── PostJob.jsx          ← Post job (verified recruiters only)
│       ├── EditJob.jsx          ← Edit existing job
│       ├── Dashboard.jsx        ← Candidate stats / Recruiter applicant management
│       ├── Applications.jsx     ← Candidate application tracker
│       ├── ResumeMatch.jsx      ← AI resume upload → parse → match
│       ├── SkillQuiz.jsx        ← Typed-answer quiz with AI grading
│       ├── InterviewPractice.jsx ← Mock interview + voice + webcam + scorecard
│       ├── Profile.jsx          ← Editable profile
│       ├── TPODashboard.jsx     ← TPO: verify recruiters, monitor, export
│       └── NotFound.jsx         ← 404 page
│
├── functions/                   ← Firebase Cloud Functions (backup, needs Blaze)
│   ├── index.js
│   └── package.json
│
└── dist/                        ← Production build (auto-generated)
```

---

## 12. How to Run This Project

### Prerequisites
- Node.js 18+
- A Firebase project (free)
- A Supabase project (free)
- A Groq API key (free at console.groq.com)
- An EmailJS account (free at emailjs.com)

### Setup Steps

1. **Install dependencies:**
   ```bash
   cd "Job Portal"
   npm install
   ```

2. **Set up Supabase:**
   - Create project at supabase.com
   - Run `supabase-schema.sql` in SQL Editor (creates base tables)
   - Run `migration-final.sql` in SQL Editor (adds verification, quiz, trust fields)
   - Disable RLS on all tables (Settings → Authentication)

3. **Set up Firebase:**
   - Create project at firebase.google.com
   - Enable Authentication → Email/Password + Google
   - Enable Hosting

4. **Set up Groq:**
   - Sign up at console.groq.com → create API key

5. **Set up EmailJS:**
   - Sign up at emailjs.com → add Gmail service → create template
   - Template variables: `{{to_email}}`, `{{to_name}}`, `{{subject}}`, `{{job_title}}`, `{{company_name}}`, `{{status}}`, `{{message}}`

6. **Configure .env:**
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_GROQ_API_KEY=...
   VITE_EMAILJS_SERVICE_ID=...
   VITE_EMAILJS_TEMPLATE_ID=...
   VITE_EMAILJS_PUBLIC_KEY=...
   ```

7. **Run locally:**
   ```bash
   npm run dev
   ```

8. **Deploy:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 13. Key Concepts for Beginners

### What is React?
A JavaScript library for building user interfaces. You write "components" — reusable pieces of UI. Each component is a function that returns JSX (HTML-like syntax).

### What is JSX?
```jsx
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>
}
```

### What is Tailwind CSS?
Instead of writing CSS in separate files, you write utility classes directly:
```jsx
<button className="bg-blue-500 py-2 px-4 rounded-lg text-white">Click</button>
```

### What is Supabase?
A PostgreSQL database with an instant REST API. Query directly from JavaScript:
```javascript
const { data } = await supabase.from('jobs').select('*').eq('is_active', true)
```

### What is Firebase Auth?
Handles user login securely. You never store passwords:
```javascript
await signInWithEmailAndPassword(auth, email, password)
```

### What is an API?
How two systems talk. We send a prompt to Groq's API, it sends back AI-generated text.

### What is "Serverless"?
No backend server to manage. We use Firebase (hosting), Supabase (database), Groq (AI), EmailJS (emails) — all managed services called from the browser.

### What are React Hooks?
Functions that let components have state and side effects:
- `useState` — store data that changes (like form inputs)
- `useEffect` — run code when something changes (like fetching data)
- `useRef` — reference a DOM element (like a video tag)
- `useCallback` — memoize a function to prevent re-creation

---

## 14. Design Decisions & Why

| Decision | Why |
|---------|-----|
| Single font (Inter) | Professional, consistent across all pages |
| Dark navy navbar + footer | Trustworthy, professional feel |
| Warm copper accent | Stands out, feels premium, good contrast on dark |
| Cream background | Softer than white, easier on eyes |
| No separate backend | Faster to build, free hosting, simpler architecture |
| Client-side AI | No Blaze plan needed, instant deployment |
| Typed-answer quizzes (not MCQ) | MCQs are trivially cheatable with ChatGPT |
| 45-second timer | Too tight for Google round-trips, enough for someone who knows |
| 60% skill threshold | Strict enough to filter, fair enough to not block everyone |
| Dual AI agents | Competitive differentiator — AI on both sides of marketplace |
| EmailJS over custom backend | Zero backend needed, works from browser |
| face-api.js from CDN | Only loads when webcam toggled on, saves bundle size |
| Firebase Auth over Supabase Auth | Better Google sign-in UX, easier popup handling |
| RLS disabled | Hackathon trade-off — app-level checks are sufficient |

---

## 15. What Makes This Different

| Feature | Regular Job Portal | PlaceMate |
|---------|-------------------|-----------|
| Job posting | Anyone can post | Only TPO-verified recruiters |
| Applying | Anyone can spam-apply | Must verify skills through quiz first |
| Resume | Self-reported, unverified | AI-parsed + skill quiz verified |
| Matching | Keyword-based | AI scoring (skills + experience + location + type) |
| Recruiter screening | Manual review | AI Hiring Agent auto-screens with reasons |
| Career advice | None | AI Career Copilot with full platform context |
| Interview prep | External tools | Built-in AI mock interview with voice + webcam |
| Status updates | Check dashboard | Real-time email notifications |
| Data visibility | Everyone sees everything | Role-based: students see matching jobs, recruiters see own jobs, TPO sees all |
| Trust | None | Verified recruiters + verified skills + eligibility gates |

---

## 16. Demo Script (3-5 minutes)

**Minute 1 — The Trust Layer:**
1. "We solve fake job postings. Every recruiter must be verified by the TPO."
2. Show TPO dashboard → approve a recruiter → recruiter can now post jobs

**Minute 2 — The Student Experience:**
1. Upload resume → AI extracts 8 skills
2. Take a typed-answer quiz for React (show code output question)
3. Browse jobs → only matching jobs visible → see "3/5 verified, verify 1 more to apply"
4. Click Career Copilot → "What should I learn next?" → AI analyzes real skill gaps

**Minute 3 — The Recruiter Experience:**
1. View applicants → see verified skill badges + match scores
2. Click Hiring Agent → "Screen all applicants" → AI ranks with HIRE/CONSIDER/PASS
3. Change status to Shortlisted → candidate gets EMAIL automatically
4. Click AI Rank → all applicants scored and sorted

**Minute 4 — The Wow Factor:**
1. Start mock interview → voice mode on → speak answer → AI evaluates
2. Turn on webcam → show confidence tracking in real-time
3. Show the scorecard → grade, category scores, model answers

**Closing Line:**
> "Their platform finds jobs. Ours VERIFIES skills, COACHES careers, AUTOMATES screening, and ENSURES trust. Every role has its own AI. Every application is skill-verified. Every recruiter is TPO-approved. It's not a job portal — it's a hiring pipeline."

---

## 17. Future Improvements (If We Had More Time)

1. Enable Supabase RLS for proper row-level security
2. Move Groq API calls to Firebase Cloud Functions (hide API key)
3. Real-time notifications using Supabase Realtime subscriptions
4. WhatsApp integration for status updates
5. Admin analytics dashboard with charts (Chart.js)
6. Resume builder tool
7. Calendar integration for interview scheduling
8. Mobile app with React Native
9. Blockchain-verified skill certificates
10. Employer reference verification system
