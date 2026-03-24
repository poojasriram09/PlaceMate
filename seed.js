import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// --- Recruiter Profiles ---
const recruiters = [
  { id: 'recruiter-techcorp', email: 'hr@techcorp.in', full_name: 'Priya Sharma', role: 'recruiter', company_name: 'TechCorp India', company_website: 'https://techcorp.in', location: 'Mumbai, India', bio: 'Leading tech company building enterprise SaaS products.' },
  { id: 'recruiter-innovate', email: 'talent@innovatelabs.io', full_name: 'Rahul Verma', role: 'recruiter', company_name: 'InnovateLabs', company_website: 'https://innovatelabs.io', location: 'Bangalore, India', bio: 'AI-first startup disrupting the fintech space.' },
  { id: 'recruiter-datadrive', email: 'jobs@datadrive.co', full_name: 'Ananya Patel', role: 'recruiter', company_name: 'DataDrive Analytics', company_website: 'https://datadrive.co', location: 'Hyderabad, India', bio: 'Data analytics company powering insights for Fortune 500 clients.' },
]

// --- Candidate Profiles ---
const candidates = [
  { id: 'candidate-arjun', email: 'arjun.dev@gmail.com', full_name: 'Arjun Mehta', role: 'candidate', location: 'Mumbai, India', skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'], experience_years: 3, education: 'B.Tech CSE - IIT Bombay', bio: 'Full-stack developer passionate about building scalable web apps.' },
  { id: 'candidate-sneha', email: 'sneha.ml@gmail.com', full_name: 'Sneha Kulkarni', role: 'candidate', location: 'Pune, India', skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Docker', 'MLOps'], experience_years: 4, education: 'M.Tech AI - IIIT Hyderabad', bio: 'ML Engineer with experience in NLP and computer vision.' },
  { id: 'candidate-vikram', email: 'vikram.design@gmail.com', full_name: 'Vikram Singh', role: 'candidate', location: 'Delhi, India', skills: ['Figma', 'React', 'Tailwind CSS', 'Adobe XD', 'Framer'], experience_years: 2, education: 'B.Des - NID Ahmedabad', bio: 'UI/UX designer who codes. Design systems enthusiast.' },
  { id: 'candidate-neha', email: 'neha.backend@gmail.com', full_name: 'Neha Gupta', role: 'candidate', location: 'Bangalore, India', skills: ['Java', 'Spring Boot', 'Kubernetes', 'PostgreSQL', 'Redis', 'Kafka'], experience_years: 5, education: 'B.Tech CSE - NIT Trichy', bio: 'Senior backend engineer specializing in microservices and distributed systems.' },
  { id: 'candidate-rohan', email: 'rohan.fresh@gmail.com', full_name: 'Rohan Desai', role: 'candidate', location: 'Mumbai, India', skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Git'], experience_years: 0, education: 'B.E. IT - RGIT Mumbai', bio: 'Fresh graduate eager to start a career in web development.' },
]

// --- Job Listings ---
const jobs = [
  { recruiter_id: 'recruiter-techcorp', title: 'Senior Frontend Developer', company_name: 'TechCorp India', description: 'We are looking for an experienced Frontend Developer to lead our UI team. You will architect and build complex React applications serving millions of users. Work closely with designers and backend engineers to deliver pixel-perfect, performant interfaces.', requirements: '5+ years of frontend experience\nExpert in React and TypeScript\nExperience with state management (Redux/Zustand)\nStrong understanding of web performance optimization\nExperience mentoring junior developers', skills_required: ['React', 'TypeScript', 'Redux', 'Tailwind CSS', 'Jest'], location: 'Mumbai, India', job_type: 'full-time', salary_min: 1800000, salary_max: 2800000, experience_min: 5, experience_max: 8 },
  { recruiter_id: 'recruiter-techcorp', title: 'Backend Engineer', company_name: 'TechCorp India', description: 'Join our backend team to build robust APIs and microservices. You will design database schemas, implement business logic, and ensure our systems handle high traffic with low latency.', requirements: '3+ years backend development\nProficient in Node.js or Java\nExperience with PostgreSQL and Redis\nUnderstanding of REST and GraphQL APIs\nFamiliarity with Docker and CI/CD', skills_required: ['Node.js', 'PostgreSQL', 'Redis', 'Docker', 'REST API'], location: 'Mumbai, India', job_type: 'full-time', salary_min: 1200000, salary_max: 2000000, experience_min: 3, experience_max: 6 },
  { recruiter_id: 'recruiter-techcorp', title: 'DevOps Engineer', company_name: 'TechCorp India', description: 'Manage and improve our cloud infrastructure on AWS. Automate deployments, monitor system health, and ensure 99.9% uptime for our SaaS platform.', requirements: '3+ years DevOps experience\nAWS certified preferred\nExperience with Terraform/Ansible\nKubernetes and Docker expertise\nCI/CD pipeline management', skills_required: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Jenkins', 'Linux'], location: 'Mumbai, India', job_type: 'full-time', salary_min: 1400000, salary_max: 2200000, experience_min: 3, experience_max: 7 },
  { recruiter_id: 'recruiter-techcorp', title: 'Frontend Intern', company_name: 'TechCorp India', description: 'Great opportunity for fresh graduates to learn React development in a production environment. You will work alongside senior engineers on real features used by thousands of customers.', requirements: 'Currently pursuing or completed B.Tech/B.E.\nBasic knowledge of HTML, CSS, JavaScript\nFamiliarity with React is a plus\nEager to learn and grow\nGood communication skills', skills_required: ['HTML', 'CSS', 'JavaScript', 'React', 'Git'], location: 'Mumbai, India', job_type: 'internship', salary_min: 15000, salary_max: 25000, experience_min: 0, experience_max: 1 },
  { recruiter_id: 'recruiter-innovate', title: 'ML Engineer', company_name: 'InnovateLabs', description: 'Build and deploy machine learning models for our AI-powered fintech products. Work on NLP for document processing, fraud detection, and credit scoring models.', requirements: '3+ years ML experience\nStrong Python skills\nExperience with TensorFlow or PyTorch\nUnderstanding of MLOps and model deployment\nPublication in top conferences is a plus', skills_required: ['Python', 'TensorFlow', 'PyTorch', 'NLP', 'MLOps', 'Docker'], location: 'Bangalore, India', job_type: 'full-time', salary_min: 2000000, salary_max: 3500000, experience_min: 3, experience_max: 7 },
  { recruiter_id: 'recruiter-innovate', title: 'Full Stack Developer', company_name: 'InnovateLabs', description: 'Work across the entire stack to build our next-generation fintech platform. From React frontends to Node.js APIs to PostgreSQL databases — you will own features end to end.', requirements: '2+ years full-stack experience\nReact + Node.js proficiency\nDatabase design skills\nExperience with payment APIs is a plus\nStartup mindset — move fast, ship often', skills_required: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST API'], location: 'Bangalore, India', job_type: 'full-time', salary_min: 1000000, salary_max: 1800000, experience_min: 2, experience_max: 5 },
  { recruiter_id: 'recruiter-innovate', title: 'React Native Developer', company_name: 'InnovateLabs', description: 'Build our mobile app used by millions of users for instant payments and financial management. Ship features fast with React Native and integrate with native modules.', requirements: '2+ years React Native experience\nPublished apps on App Store/Play Store\nExperience with state management\nKnowledge of native bridge APIs\nPerformance optimization skills', skills_required: ['React Native', 'JavaScript', 'TypeScript', 'Redux', 'Firebase'], location: 'Remote', job_type: 'remote', salary_min: 1200000, salary_max: 2000000, experience_min: 2, experience_max: 5 },
  { recruiter_id: 'recruiter-innovate', title: 'Product Design Intern', company_name: 'InnovateLabs', description: 'Join our design team to create beautiful, intuitive interfaces for our fintech products. Learn from experienced designers while working on real projects.', requirements: 'Pursuing or completed design degree\nProficiency in Figma\nBasic understanding of design systems\nPortfolio showcasing UI/UX work\nInterest in fintech', skills_required: ['Figma', 'Adobe XD', 'UI Design', 'Prototyping'], location: 'Bangalore, India', job_type: 'internship', salary_min: 20000, salary_max: 30000, experience_min: 0, experience_max: 1 },
  { recruiter_id: 'recruiter-datadrive', title: 'Data Scientist', company_name: 'DataDrive Analytics', description: 'Analyze large datasets to extract actionable insights for our Fortune 500 clients. Build predictive models, create dashboards, and present findings to stakeholders.', requirements: '3+ years data science experience\nStrong statistical background\nPython and SQL expertise\nExperience with Tableau or Power BI\nExcellent communication skills', skills_required: ['Python', 'SQL', 'Pandas', 'Tableau', 'Machine Learning', 'Statistics'], location: 'Hyderabad, India', job_type: 'full-time', salary_min: 1500000, salary_max: 2500000, experience_min: 3, experience_max: 6 },
  { recruiter_id: 'recruiter-datadrive', title: 'Data Engineer', company_name: 'DataDrive Analytics', description: 'Design and maintain our data pipelines processing terabytes of data daily. Build ETL workflows, manage data warehouses, and ensure data quality across the organization.', requirements: '3+ years data engineering experience\nExperience with Spark/Airflow\nSQL and Python proficiency\nCloud data warehouse experience (Snowflake/BigQuery)\nUnderstanding of data modeling', skills_required: ['Python', 'Apache Spark', 'Airflow', 'SQL', 'Snowflake', 'AWS'], location: 'Hyderabad, India', job_type: 'full-time', salary_min: 1400000, salary_max: 2200000, experience_min: 3, experience_max: 7 },
  { recruiter_id: 'recruiter-datadrive', title: 'Business Analyst', company_name: 'DataDrive Analytics', description: 'Bridge the gap between business requirements and technical solutions. Work with clients to understand their data needs and translate them into actionable projects.', requirements: '2+ years business analysis experience\nStrong SQL skills\nExperience with data visualization tools\nExcellent presentation skills\nDomain knowledge in retail or banking preferred', skills_required: ['SQL', 'Excel', 'Tableau', 'Power BI', 'Data Analysis'], location: 'Hyderabad, India', job_type: 'full-time', salary_min: 800000, salary_max: 1400000, experience_min: 2, experience_max: 5 },
  { recruiter_id: 'recruiter-datadrive', title: 'QA Engineer', company_name: 'DataDrive Analytics', description: 'Ensure the quality of our analytics platform through comprehensive testing. Write automated tests, perform regression testing, and maintain test infrastructure.', requirements: '2+ years QA experience\nAutomation testing with Selenium/Cypress\nAPI testing experience\nSQL knowledge for data validation\nAgile methodology experience', skills_required: ['Selenium', 'Cypress', 'JavaScript', 'SQL', 'API Testing', 'Jira'], location: 'Hyderabad, India', job_type: 'full-time', salary_min: 700000, salary_max: 1200000, experience_min: 2, experience_max: 5 },
  { recruiter_id: 'recruiter-techcorp', title: 'UI/UX Designer', company_name: 'TechCorp India', description: 'Design intuitive and beautiful user interfaces for our enterprise SaaS products. Conduct user research, create wireframes and prototypes, and maintain our design system.', requirements: '3+ years UI/UX experience\nExpert in Figma\nExperience with design systems\nUser research and usability testing skills\nAbility to code basic HTML/CSS is a plus', skills_required: ['Figma', 'Adobe XD', 'Design Systems', 'User Research', 'Prototyping'], location: 'Mumbai, India', job_type: 'full-time', salary_min: 1000000, salary_max: 1800000, experience_min: 3, experience_max: 6 },
  { recruiter_id: 'recruiter-innovate', title: 'Site Reliability Engineer', company_name: 'InnovateLabs', description: 'Keep our fintech platform running at 99.99% uptime. Design resilient architectures, implement monitoring and alerting, and lead incident response.', requirements: '4+ years SRE/DevOps experience\nKubernetes and cloud-native expertise\nExperience with Prometheus/Grafana\nStrong scripting skills (Python/Bash)\nOn-call experience', skills_required: ['Kubernetes', 'AWS', 'Prometheus', 'Grafana', 'Python', 'Terraform'], location: 'Bangalore, India', job_type: 'full-time', salary_min: 1800000, salary_max: 3000000, experience_min: 4, experience_max: 8 },
  { recruiter_id: 'recruiter-datadrive', title: 'Part-Time Content Writer', company_name: 'DataDrive Analytics', description: 'Write technical blog posts, case studies, and documentation for our analytics platform. Help establish DataDrive as a thought leader in the data analytics space.', requirements: 'Strong technical writing skills\nUnderstanding of data/analytics concepts\nSEO knowledge is a plus\nPortfolio of published articles\nFlexible schedule — 20 hours/week', skills_required: ['Technical Writing', 'SEO', 'Data Analytics', 'Content Strategy'], location: 'Remote', job_type: 'part-time', salary_min: 300000, salary_max: 500000, experience_min: 1, experience_max: 5 },
]

// --- Applications ---
const applications = [
  { candidate_id: 'candidate-arjun', status: 'shortlisted', cover_letter: 'I am excited to apply for this role. My 3 years of React experience make me a strong fit.', match_score: 82 },
  { candidate_id: 'candidate-sneha', status: 'applied', cover_letter: 'While my primary expertise is in ML, I have strong Python and data skills relevant to this role.', match_score: 45 },
  { candidate_id: 'candidate-vikram', status: 'interview', cover_letter: 'As a designer who codes, I bring a unique perspective to frontend development.', match_score: 68 },
  { candidate_id: 'candidate-rohan', status: 'applied', cover_letter: 'I am a fresh graduate eager to learn and contribute. I have built several React projects during my studies.', match_score: 55 },
  { candidate_id: 'candidate-neha', status: 'reviewed', cover_letter: 'I bring 5 years of backend experience and am looking to transition into a senior engineering role.', match_score: 38 },
]

async function seed() {
  console.log('Seeding profiles...')
  const { error: profErr } = await supabase.from('profiles').upsert([...recruiters, ...candidates])
  if (profErr) { console.error('Profile error:', profErr.message); return }
  console.log(`  ✓ ${recruiters.length} recruiters + ${candidates.length} candidates`)

  console.log('Seeding jobs...')
  const { data: insertedJobs, error: jobErr } = await supabase.from('jobs').insert(jobs).select('id, title')
  if (jobErr) { console.error('Job error:', jobErr.message); return }
  console.log(`  ✓ ${insertedJobs.length} jobs`)

  console.log('Seeding applications...')
  // Apply first 5 candidates to the first job
  const firstJobId = insertedJobs[0].id
  const appsToInsert = applications.map(a => ({ ...a, job_id: firstJobId }))

  // Also add some cross-applications
  if (insertedJobs.length > 1) {
    appsToInsert.push({ job_id: insertedJobs[1].id, candidate_id: 'candidate-neha', status: 'shortlisted', match_score: 91, cover_letter: 'My backend expertise in Node.js and PostgreSQL makes me an ideal fit.' })
    appsToInsert.push({ job_id: insertedJobs[1].id, candidate_id: 'candidate-arjun', status: 'applied', match_score: 72, cover_letter: 'I have experience with Node.js APIs and would love to grow as a backend engineer.' })
  }
  if (insertedJobs.length > 4) {
    appsToInsert.push({ job_id: insertedJobs[4].id, candidate_id: 'candidate-sneha', status: 'interview', match_score: 95, cover_letter: 'My 4 years of ML experience with TensorFlow and PyTorch align perfectly with this role.' })
  }
  if (insertedJobs.length > 5) {
    appsToInsert.push({ job_id: insertedJobs[5].id, candidate_id: 'candidate-arjun', status: 'offered', match_score: 88, cover_letter: 'Full-stack development is my strength — React + Node.js is my daily stack.' })
    appsToInsert.push({ job_id: insertedJobs[5].id, candidate_id: 'candidate-rohan', status: 'applied', match_score: 52, cover_letter: 'I am eager to learn full-stack development in a startup environment.' })
  }
  if (insertedJobs.length > 3) {
    appsToInsert.push({ job_id: insertedJobs[3].id, candidate_id: 'candidate-rohan', status: 'shortlisted', match_score: 78, cover_letter: 'As a recent RGIT graduate, I am ready to start my career with this internship.' })
    appsToInsert.push({ job_id: insertedJobs[3].id, candidate_id: 'candidate-vikram', status: 'applied', match_score: 60, cover_letter: 'I have frontend skills and would love to grow as a developer.' })
  }
  if (insertedJobs.length > 12) {
    appsToInsert.push({ job_id: insertedJobs[12].id, candidate_id: 'candidate-vikram', status: 'interview', match_score: 92, cover_letter: 'UI/UX design is my passion and I have 2 years of Figma experience.' })
  }

  const { error: appErr } = await supabase.from('applications').insert(appsToInsert)
  if (appErr) { console.error('Application error:', appErr.message); return }
  console.log(`  ✓ ${appsToInsert.length} applications`)

  // Update application counts on jobs
  for (const job of insertedJobs) {
    const count = appsToInsert.filter(a => a.job_id === job.id).length
    if (count > 0) {
      await supabase.from('jobs').update({ application_count: count }).eq('id', job.id)
    }
  }

  console.log('\n✅ Seed complete! Database populated with demo data.')
}

seed()
