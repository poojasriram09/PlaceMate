# JobNexus — Intelligent Job Portal

## 🏆 Hackathon Context

- **Event:** Recursion 7.0 — RGIT Hackathon (24 hours)
- **Domain:** Web and App Development
- **Problem Statement 3:** Job Portal Website
- **Goal:** Build a fully functional, AI-powered job portal that transforms job discovery into a searchable, relational ecosystem with intelligent matching between candidates and opportunities.

---

## Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Frontend        | React 18 + Vite + Tailwind CSS    |
| Backend         | Node.js + Express.js              |
| Database        | Supabase (PostgreSQL)             |
| Auth            | Supabase Auth (Email + Google)    |
| File Storage    | Supabase Storage (resume uploads) |
| AI Engine       | Google Gemini API (free tier)     |
| Hosting         | Firebase Hosting + Cloud Functions|

---

## Project Structure

```
jobnexus/
├── client/                        # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   └── Toast.jsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   ├── RegisterForm.jsx
│   │   │   │   └── RoleSelector.jsx
│   │   │   ├── jobs/
│   │   │   │   ├── JobCard.jsx
│   │   │   │   ├── JobList.jsx
│   │   │   │   ├── JobDetail.jsx
│   │   │   │   ├── JobForm.jsx
│   │   │   │   └── JobFilters.jsx
│   │   │   ├── applications/
│   │   │   │   ├── ApplicationCard.jsx
│   │   │   │   ├── ApplicationList.jsx
│   │   │   │   └── ApplicationStatus.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── CandidateDashboard.jsx
│   │   │   │   ├── RecruiterDashboard.jsx
│   │   │   │   └── StatsCard.jsx
│   │   │   └── ai/
│   │   │       ├── ResumeUploader.jsx
│   │   │       ├── MatchResults.jsx
│   │   │       └── ResumeAnalysis.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Jobs.jsx
│   │   │   ├── JobDetailPage.jsx
│   │   │   ├── PostJob.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Applications.jsx
│   │   │   ├── ResumeMatch.jsx
│   │   │   └── Profile.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useJobs.js
│   │   │   └── useApplications.js
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── helpers.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                        # Express backend
│   ├── functions/
│   │   └── index.js               # Firebase Cloud Functions entry
│   ├── src/
│   │   ├── routes/
│   │   │   ├── jobs.js
│   │   │   ├── applications.js
│   │   │   ├── ai.js
│   │   │   └── profile.js
│   │   ├── middleware/
│   │   │   ├── auth.js             # Supabase JWT verification
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── gemini.js           # Gemini API integration
│   │   │   ├── resumeParser.js     # Resume text extraction
│   │   │   └── matchEngine.js      # AI matching logic
│   │   ├── config/
│   │   │   ├── supabase.js
│   │   │   └── gemini.js
│   │   └── app.js
│   ├── package.json
│   └── .env
│
├── firebase.json
├── .firebaserc
└── README.md
```

---

## Database Schema (Supabase PostgreSQL)

Run these SQL statements in the Supabase SQL Editor in order.

### Table: `profiles`
Extends Supabase auth.users with app-specific data.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter')),
  avatar_url TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  -- Candidate-specific
  skills TEXT[],
  experience_years INTEGER,
  education TEXT,
  resume_url TEXT,
  resume_text TEXT,
  -- Recruiter-specific
  company_name TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

### Table: `jobs`

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  skills_required TEXT[] NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'remote')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'INR',
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  is_active BOOLEAN DEFAULT true,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active jobs are viewable by everyone"
  ON jobs FOR SELECT USING (is_active = true);

CREATE POLICY "Recruiters can create jobs"
  ON jobs FOR INSERT WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can update own jobs"
  ON jobs FOR UPDATE USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete own jobs"
  ON jobs FOR DELETE USING (auth.uid() = recruiter_id);
```

### Table: `applications`

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  resume_url TEXT,
  match_score REAL,
  match_reasoning TEXT,
  recruiter_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = candidate_id);

CREATE POLICY "Recruiters can view applications for their jobs"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can apply to jobs"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Recruiters can update application status"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can withdraw applications"
  ON applications FOR UPDATE
  USING (auth.uid() = candidate_id);
```

### Table: `saved_jobs`

```sql
CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved jobs"
  ON saved_jobs FOR ALL USING (auth.uid() = candidate_id);
```

### Supabase Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false);

CREATE POLICY "Users can upload own resume"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can read resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.role() = 'authenticated');
```

### Database Functions & Triggers

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'candidate')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-increment application count on jobs
CREATE OR REPLACE FUNCTION increment_application_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs SET application_count = application_count + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_application_created
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION increment_application_count();

-- Full text search for jobs
CREATE OR REPLACE FUNCTION search_jobs(search_query TEXT)
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM jobs
  WHERE is_active = true
    AND (
      title ILIKE '%' || search_query || '%'
      OR description ILIKE '%' || search_query || '%'
      OR company_name ILIKE '%' || search_query || '%'
      OR search_query = ANY(skills_required)
    )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## API Endpoints (Express Backend)

### Auth Middleware
All protected routes verify the Supabase JWT token from the `Authorization: Bearer <token>` header.

### Jobs Routes (`/api/jobs`)

| Method | Endpoint                | Auth     | Description                          |
| ------ | ----------------------- | -------- | ------------------------------------ |
| GET    | `/api/jobs`             | Public   | List all active jobs (with filters)  |
| GET    | `/api/jobs/:id`         | Public   | Get single job details               |
| POST   | `/api/jobs`             | Recruiter| Create a new job posting             |
| PUT    | `/api/jobs/:id`         | Recruiter| Update a job posting                 |
| DELETE | `/api/jobs/:id`         | Recruiter| Delete/deactivate a job              |
| GET    | `/api/jobs/my-jobs`     | Recruiter| Get recruiter's own job listings     |
| GET    | `/api/jobs/search`      | Public   | Search jobs with filters             |

**Search Query Params:**
- `q` — keyword search (title, description, skills)
- `location` — filter by location
- `job_type` — filter by type (full-time, remote, etc.)
- `experience_min` / `experience_max` — experience range
- `salary_min` / `salary_max` — salary range
- `skills` — comma-separated skills filter
- `sort` — `newest`, `salary_high`, `salary_low`
- `page` / `limit` — pagination

### Applications Routes (`/api/applications`)

| Method | Endpoint                                | Auth      | Description                            |
| ------ | --------------------------------------- | --------- | -------------------------------------- |
| POST   | `/api/applications`                     | Candidate | Apply to a job                         |
| GET    | `/api/applications/my-applications`     | Candidate | Get candidate's applications           |
| GET    | `/api/applications/job/:jobId`          | Recruiter | Get all applications for a job         |
| PATCH  | `/api/applications/:id/status`          | Recruiter | Update application status              |
| PATCH  | `/api/applications/:id/withdraw`        | Candidate | Withdraw application                   |
| GET    | `/api/applications/:id`                 | Auth      | Get single application detail          |

### AI Routes (`/api/ai`)

| Method | Endpoint                        | Auth      | Description                                  |
| ------ | ------------------------------- | --------- | -------------------------------------------- |
| POST   | `/api/ai/parse-resume`          | Candidate | Upload resume → extract skills & experience  |
| POST   | `/api/ai/match-jobs`            | Candidate | Match candidate profile against all jobs     |
| POST   | `/api/ai/match-candidates`      | Recruiter | Rank candidates for a specific job           |
| POST   | `/api/ai/job-description`       | Recruiter | Auto-generate job description from keywords  |

### Profile Routes (`/api/profile`)

| Method | Endpoint               | Auth | Description              |
| ------ | ---------------------- | ---- | ------------------------ |
| GET    | `/api/profile`         | Auth | Get own profile          |
| PUT    | `/api/profile`         | Auth | Update own profile       |
| POST   | `/api/profile/resume`  | Auth | Upload resume to storage |

---

## AI Integration (Google Gemini API)

### 1. Resume Parser (`/api/ai/parse-resume`)

**Input:** PDF resume file uploaded via Supabase Storage

**Gemini Prompt:**
```
You are a resume parser. Analyze the following resume text and extract structured data.

Resume Text:
{extracted_text}

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
}
```

### 2. Job Matcher (`/api/ai/match-jobs`)

**Input:** Candidate's parsed resume data + list of active jobs

**Gemini Prompt:**
```
You are a job matching engine. Compare the candidate profile with the job listings and score each match.

Candidate Profile:
{candidate_profile_json}

Job Listings:
{jobs_array_json}

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
- 90-100: Perfect match, all skills and experience align
- 70-89: Strong match, most skills align
- 50-69: Moderate match, some relevant skills
- Below 50: Weak match
```

### 3. Candidate Ranker (`/api/ai/match-candidates`)

**Input:** Job details + all candidate applications with resume data

**Gemini Prompt:**
```
You are a recruitment AI. Rank these candidates for the given job posting.

Job Posting:
{job_details_json}

Candidates:
{candidates_array_json}

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
]
```

---

## Page-by-Page Specification

### 1. Home Page (`/`)
- Hero section with tagline: "Find Your Perfect Match — AI-Powered Job Discovery"
- Search bar prominently in the center (search by keyword, location)
- "I'm a Candidate" / "I'm a Recruiter" CTA buttons
- Featured/recent job listings (6 cards)
- Stats section: Total jobs, Total candidates, Successful matches
- How it works section (3 steps)

### 2. Auth Pages (`/login`, `/register`)
- Clean login form with email/password + Google OAuth button
- Register form includes role selection (Candidate / Recruiter)
- After registration, redirect to profile completion page
- Use Supabase Auth — `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`

### 3. Jobs Listing Page (`/jobs`)
- Left sidebar with filters: Job type, Location, Experience range, Salary range, Skills
- Main area: Grid/list of JobCards
- Each JobCard: Title, Company, Location, Job Type, Salary Range, Skills tags, Posted date
- Pagination + Sort dropdown (Newest, Salary High→Low, Most Applied)

### 4. Job Detail Page (`/jobs/:id`)
- Full job description with company info
- Skills required as tags
- Salary range, location, experience requirements
- "Apply Now" button (candidates) → apply modal with cover letter + resume upload
- "Edit Job" button (own recruiter only)
- If already applied, show application status instead

### 5. Candidate Dashboard (`/dashboard`)
- Stats cards: Applications sent, Interviews, Shortlisted, Offers
- Recent applications with status badges
- AI Match score overview (if resume uploaded)
- Quick actions: Browse Jobs, Upload Resume, View Applications
- Recommended jobs section (AI-powered)

### 6. Recruiter Dashboard (`/dashboard`)
- Stats cards: Active jobs, Total applications, Shortlisted, Positions filled
- Recent applications for their jobs
- Active job listings with quick stats
- Quick actions: Post New Job, View Applications, AI Rank Candidates

### 7. Applications Page (`/applications`)
**For Candidates:** List of applications with status badges, filter by status
**For Recruiters:** Select a job → view all applicants, change status, AI Rank button

### 8. AI Resume Match Page (`/resume-match`) — BROWNIE POINT FEATURE
- Drag & drop resume upload zone
- AI parses resume → shows extracted skills, experience, summary
- "Find Matching Jobs" button
- Results: Jobs sorted by match % with circular progress, matching/missing skills, AI reasoning
- "Apply" button directly from match results

### 9. Profile Page (`/profile`)
- Editable profile form based on role
- Candidate: Name, skills (tag input), experience, education, resume upload
- Recruiter: Name, company name, company website, company logo
- Profile completion indicator

---

## UI Design Direction

### Colors
- **Primary:** Deep blue `#1E3A5F`
- **Accent:** Vibrant teal `#14B8A6`
- **Background:** Light gray `#F8FAFC` with white cards
- **Text:** Dark slate `#0F172A` primary, `#64748B` secondary

### Typography
- **Headings:** `Plus Jakarta Sans` (Google Fonts)
- **Body:** `Inter`

### Component Patterns
- Rounded corners: 8px cards, 6px buttons
- Subtle shadows: `shadow-sm` to `shadow-md`
- Status badges color-coded: Applied=Blue, Reviewed=Yellow, Shortlisted=Purple, Interview=Orange, Offered=Green, Rejected=Red, Withdrawn=Gray
- Skill tags as rounded pills
- Smooth hover transitions (300ms)
- Skeleton loaders while fetching
- Toast notifications for actions

---

## Implementation Priority (24-Hour Timeline)

### Phase 1: Foundation (Hours 0–3)
1. Initialize Vite + React + Tailwind project
2. Set up Supabase project (tables, auth, storage bucket)
3. Set up Express server skeleton
4. Configure Firebase project (hosting + functions)
5. Implement Supabase client (`lib/supabase.js`)
6. Build auth flow (register with role, login, logout, protected routes)
7. Build Navbar with auth state

### Phase 2: Core Features (Hours 3–10)
1. Profile page (create/edit, resume upload)
2. Job CRUD for recruiters
3. Job listing page with filters and search
4. Job detail page
5. Application system (apply, view, update status)
6. Candidate dashboard
7. Recruiter dashboard

### Phase 3: AI Features — THE DIFFERENTIATOR (Hours 10–16)
1. Set up Gemini API integration
2. Resume upload → text extraction (`pdf-parse` package)
3. AI resume parser (extract skills, experience)
4. AI job matching engine (match resume against jobs with scores)
5. AI candidate ranking for recruiters
6. Resume Match page with visual results

### Phase 4: Polish & Deploy (Hours 16–22)
1. UI polish — animations, loading states, empty states, error handling
2. Responsive design (mobile-friendly)
3. Edge cases (duplicate applications, expired jobs)
4. Build frontend → `npm run build`
5. Deploy to Firebase Hosting + Cloud Functions
6. End-to-end testing on deployed URL

### Phase 5: Demo Prep (Hours 22–24)
1. Seed database with sample data
2. Prepare 2-minute demo script
3. Test AI matching with a real resume
4. Backup screenshots/recordings for demo safety

---

## Environment Variables

### Client (`client/.env`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-firebase-project.web.app/api
```

### Server (`server/.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
PORT=5000
```

---

## Key Implementation Code

### Supabase Client (`client/src/lib/supabase.js`)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Auth Context (`client/src/context/AuthContext.jsx`)
- Wrap app in AuthProvider
- Store user + profile in context
- Listen to `supabase.auth.onAuthStateChange()`
- On login, fetch profile from `profiles` table
- Expose: `user`, `profile`, `role`, `signIn()`, `signUp()`, `signOut()`, `loading`

### Auth Middleware (`server/src/middleware/auth.js`)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
};
```

### Gemini Service (`server/src/services/gemini.js`)
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function generateContent(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### Firebase Config (`firebase.json`)
```json
{
  "hosting": {
    "public": "client/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "server",
    "runtime": "nodejs18"
  }
}
```

### Cloud Functions Entry (`server/functions/index.js`)
```javascript
const functions = require('firebase-functions');
const app = require('../src/app');

exports.api = functions.https.onRequest(app);
```

---

## NPM Packages

### Client
```
react react-dom react-router-dom @supabase/supabase-js lucide-react react-hot-toast react-dropzone framer-motion
```
Dev: `@vitejs/plugin-react tailwindcss postcss autoprefixer vite`

### Server
```
express cors @supabase/supabase-js @google/generative-ai pdf-parse multer firebase-functions firebase-admin dotenv
```

---

## Quick Setup Commands

```bash
# Client
cd client
npm create vite@latest . -- --template react
npm install @supabase/supabase-js react-router-dom lucide-react react-hot-toast react-dropzone framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Server
cd server
npm init -y
npm install express cors @supabase/supabase-js @google/generative-ai pdf-parse multer dotenv
npm install firebase-functions firebase-admin

# Firebase
npm install -g firebase-tools
firebase login
firebase init  # Select Hosting + Functions

# Dev
cd client && npm run dev
cd server && node src/app.js

# Deploy
cd client && npm run build
firebase deploy
```

---

## Seed Data for Demo

Create `server/seed.js` to populate:
- 3 recruiter accounts (TechCorp India, InnovateLabs, DataDrive)
- 5 candidate accounts with varied skill profiles
- 15-20 job listings: Frontend Dev, Backend Engineer, Full Stack, Data Scientist, DevOps, Mobile Dev, UI/UX Designer, ML Engineer
- 10-15 sample applications with varying statuses

---

## Demo Flow Script (3–5 minutes — PRACTICE THIS!)

1. **Open landing page** — show the polished UI, explain the problem briefly (30 sec)
2. **Sign up as a Recruiter** — post 2 job listings quickly (pre-fill if needed)
3. **Switch to Candidate account** — browse jobs, show search and filters working
4. **Upload Resume** — show AI parsing in action, extracted skills appear (THIS GETS ATTENTION)
5. **AI Job Matching** — show match scores with reasoning (🔥 WOW MOMENT #1)
6. **Apply to top match** — show application submission with cover letter
7. **Switch back to Recruiter** — show dashboard with applications received
8. **AI Candidate Ranking** — show ranked candidates with scores and recommendations (🔥 WOW MOMENT #2)
9. **Update application status** — show status flow: applied → shortlisted → interview
10. **Conclude** — "We built an intelligent job ecosystem, not just a listing board"

**Key pitch line:** "We turned a static job board into an intelligent matching engine. Every interaction is AI-enhanced — from resume parsing to candidate ranking — making job discovery efficient for both sides."

**Pro tip:** Have two browser windows open (one candidate, one recruiter) so you can switch instantly during the demo. Pre-upload a real resume before the demo starts as backup.

---

## Key Deliverables Mapping (Problem Statement → Implementation)

| Problem Statement Requirement | Our Implementation |
|-------------------------------|-------------------|
| **1. Opportunity Registry** — Create and manage structured job entities | PostJob page + Jobs CRUD + Supabase `jobs` table with constraints |
| **2. Application Graph Engine** — Map candidate applications to opportunities | `applications` table with candidate↔job relationships + status tracking + UNIQUE constraint |
| **3. Adaptive Search Layer** — Intelligent filtering and discovery | Jobs page with full-text search (`search_jobs` function), multi-filter sidebar, sort options |
| **4. Application Visibility Module** — Track and retrieve all applications | Candidate MyApplications page + Recruiter application viewer + status management pipeline |

| Brownie Point | Our Implementation |
|---------------|-------------------|
| **Resume Analysis + Job Matching** | Gemini API parses resumes → extracts skills → matches against all active jobs with % scores and reasoning |
| **Candidate Ranking for Recruiters** | AI ranks all applicants for a job by fit score with strengths, concerns, and hire recommendation |
| **Auto-generated Job Descriptions** | Recruiter enters keywords → Gemini generates full job description (time permitting) |
| ~~AI Interview Simulator~~ | **SKIP** — not enough time in 24hrs, matching is more impressive |

---

## Common Pitfalls to Avoid

1. **Don't over-engineer auth** — Supabase handles it, just plug it in
2. **Don't build a rich text editor** — Simple textarea for job descriptions is fine
3. **Don't try to add real-time chat** — Not in scope, wastes hours
4. **Don't perfect mobile before desktop works** — Desktop first, it's what you demo on
5. **Don't forget to seed data** — Empty databases kill demos
6. **Don't wait until hour 20 to deploy** — Deploy a basic version by hour 12
7. **Don't use Redux or complex state management** — React Context + useState is enough
8. **Don't build the AI interview simulator** — Match scoring is more impressive in less time
9. **Don't write tests** — Not for a 24-hour hackathon, test manually
10. **Don't use TypeScript** — Extra setup time, plain JS is faster for a hackathon

---

## CRITICAL REMINDERS

1. **DO NOT over-engineer.** Build MVP first, polish later. Working > Perfect.
2. **Supabase does heavy lifting.** Use Supabase JS client directly from React for CRUD. Express only for AI routes.
3. **AI is the differentiator.** Resume matching wins hackathons. Prioritize it after core CRUD.
4. **Mobile responsive matters.** Judges check on phones. Use Tailwind responsive classes.
5. **Seed realistic data.** Empty apps look unfinished.
6. **Handle loading & error states.** Skeleton loaders + toasts = professional feel.
7. **Deploy early.** Don't wait until hour 23. Deploy basic version by hour 10.
