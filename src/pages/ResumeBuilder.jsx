import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { FileText, Download, Plus, X, Sparkles, Loader2, Eye, Edit3, Save, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

async function aiGenerate(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.5, max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

const EMPTY_EXP = { title: '', company: '', start: '', end: '', bullets: [''] }
const EMPTY_EDU = { degree: '', institution: '', year: '' }
const EMPTY_PROJECT = { name: '', description: '', link: '' }

// ==================== TEMPLATES ====================
function ClassicTemplate({ data }) {
  return (
    <div className="font-['Georgia',serif] text-[11px] leading-relaxed text-gray-900 p-8">
      <div className="text-center mb-4 border-b-2 border-gray-800 pb-3">
        <h1 className="text-2xl font-bold tracking-wide">{data.name || 'Your Name'}</h1>
        <p className="text-xs text-gray-600 mt-1">{[data.email, data.phone, data.location, data.website].filter(Boolean).join(' | ')}</p>
      </div>
      {data.summary && <div className="mb-4"><h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-400 mb-1">Professional Summary</h2><p className="text-gray-700">{data.summary}</p></div>}
      {data.skills.length > 0 && <div className="mb-4"><h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-400 mb-1">Skills</h2><p className="text-gray-700">{data.skills.join(' • ')}</p></div>}
      {data.experience.length > 0 && data.experience[0].title && <div className="mb-4"><h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-400 mb-2">Experience</h2>{data.experience.map((exp, i) => exp.title && <div key={i} className="mb-3"><div className="flex justify-between"><span className="font-bold">{exp.title}</span><span className="text-gray-500">{exp.start}{exp.end ? ` – ${exp.end}` : ''}</span></div><p className="text-gray-600 italic">{exp.company}</p><ul className="list-disc ml-4 mt-1">{exp.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul></div>)}</div>}
      {data.education.length > 0 && data.education[0].degree && <div className="mb-4"><h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-400 mb-2">Education</h2>{data.education.map((edu, i) => edu.degree && <div key={i} className="mb-2"><div className="flex justify-between"><span className="font-bold">{edu.degree}</span><span className="text-gray-500">{edu.year}</span></div><p className="text-gray-600">{edu.institution}</p></div>)}</div>}
      {data.projects.length > 0 && data.projects[0].name && <div><h2 className="text-xs font-bold uppercase tracking-widest border-b border-gray-400 mb-2">Projects</h2>{data.projects.map((p, i) => p.name && <div key={i} className="mb-2"><span className="font-bold">{p.name}</span>{p.link && <span className="text-blue-600 ml-2 text-xs">{p.link}</span>}<p className="text-gray-700">{p.description}</p></div>)}</div>}
    </div>
  )
}

function ModernTemplate({ data }) {
  return (
    <div className="font-sans text-[11px] leading-relaxed text-gray-900 flex min-h-full">
      <div className="w-[35%] bg-[#1a2332] text-white p-6">
        <h1 className="text-xl font-bold mb-1">{data.name || 'Your Name'}</h1>
        <div className="text-xs text-gray-300 space-y-1 mb-5">{data.email && <p>{data.email}</p>}{data.phone && <p>{data.phone}</p>}{data.location && <p>{data.location}</p>}{data.website && <p>{data.website}</p>}</div>
        {data.skills.length > 0 && <div className="mb-5"><h2 className="text-xs font-bold uppercase tracking-widest text-[#c8722a] mb-2">Skills</h2><div className="flex flex-wrap gap-1">{data.skills.map((s, i) => <span key={i} className="bg-white/10 rounded px-2 py-0.5 text-xs">{s}</span>)}</div></div>}
        {data.education.length > 0 && data.education[0].degree && <div><h2 className="text-xs font-bold uppercase tracking-widest text-[#c8722a] mb-2">Education</h2>{data.education.map((edu, i) => edu.degree && <div key={i} className="mb-3"><p className="font-bold text-white">{edu.degree}</p><p className="text-gray-300 text-xs">{edu.institution}</p><p className="text-gray-400 text-xs">{edu.year}</p></div>)}</div>}
      </div>
      <div className="w-[65%] p-6">
        {data.summary && <div className="mb-5"><h2 className="text-xs font-bold uppercase tracking-widest text-[#c8722a] border-b border-gray-200 pb-1 mb-2">About Me</h2><p className="text-gray-700">{data.summary}</p></div>}
        {data.experience.length > 0 && data.experience[0].title && <div className="mb-5"><h2 className="text-xs font-bold uppercase tracking-widest text-[#c8722a] border-b border-gray-200 pb-1 mb-2">Experience</h2>{data.experience.map((exp, i) => exp.title && <div key={i} className="mb-3"><div className="flex justify-between"><span className="font-bold">{exp.title}</span><span className="text-gray-400 text-xs">{exp.start}{exp.end ? ` – ${exp.end}` : ''}</span></div><p className="text-gray-500 text-xs">{exp.company}</p><ul className="list-disc ml-4 mt-1 text-gray-700">{exp.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul></div>)}</div>}
        {data.projects.length > 0 && data.projects[0].name && <div><h2 className="text-xs font-bold uppercase tracking-widest text-[#c8722a] border-b border-gray-200 pb-1 mb-2">Projects</h2>{data.projects.map((p, i) => p.name && <div key={i} className="mb-2"><span className="font-bold">{p.name}</span><p className="text-gray-700">{p.description}</p></div>)}</div>}
      </div>
    </div>
  )
}

function MinimalTemplate({ data }) {
  return (
    <div className="font-sans text-[11px] leading-relaxed text-gray-800 p-8">
      <h1 className="text-3xl font-light text-gray-900 mb-1">{data.name || 'Your Name'}</h1>
      <p className="text-xs text-gray-500 mb-6">{[data.email, data.phone, data.location, data.website].filter(Boolean).join(' · ')}</p>
      {data.summary && <p className="text-gray-600 mb-6 border-l-2 border-[#c8722a] pl-3">{data.summary}</p>}
      {data.skills.length > 0 && <div className="mb-6"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Skills</h2><p>{data.skills.join(', ')}</p></div>}
      {data.experience.length > 0 && data.experience[0].title && <div className="mb-6"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Experience</h2>{data.experience.map((exp, i) => exp.title && <div key={i} className="mb-4"><p className="font-semibold">{exp.title} <span className="font-normal text-gray-500">at {exp.company}</span></p><p className="text-xs text-gray-400">{exp.start}{exp.end ? ` – ${exp.end}` : ''}</p><ul className="mt-1 space-y-0.5">{exp.bullets.filter(Boolean).map((b, j) => <li key={j} className="text-gray-600">— {b}</li>)}</ul></div>)}</div>}
      {data.education.length > 0 && data.education[0].degree && <div className="mb-6"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Education</h2>{data.education.map((edu, i) => edu.degree && <p key={i} className="mb-1"><span className="font-semibold">{edu.degree}</span> — {edu.institution} ({edu.year})</p>)}</div>}
      {data.projects.length > 0 && data.projects[0].name && <div><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Projects</h2>{data.projects.map((p, i) => p.name && <p key={i} className="mb-1"><span className="font-semibold">{p.name}</span> — {p.description}</p>)}</div>}
    </div>
  )
}

const TEMPLATES = [
  { id: 'classic', name: 'Classic', desc: 'Traditional, clean', component: ClassicTemplate },
  { id: 'modern', name: 'Modern', desc: 'Two-column, sidebar', component: ModernTemplate },
  { id: 'minimal', name: 'Minimal', desc: 'Light, spacious', component: MinimalTemplate },
]

// ==================== MAIN PAGE ====================
export default function ResumeBuilder() {
  const { user, profile, updateProfile } = useAuth()
  const [template, setTemplate] = useState('classic')
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(null)
  const previewRef = useRef(null)

  const [data, setData] = useState({
    name: '', email: '', phone: '', location: '', website: '', summary: '',
    skills: [], experience: [{ ...EMPTY_EXP }], education: [{ ...EMPTY_EDU }], projects: [{ ...EMPTY_PROJECT }],
  })
  const [skillInput, setSkillInput] = useState('')

  // Load saved resume data OR pre-fill from profile
  useEffect(() => {
    if (!profile) return

    // If there's previously saved resume data, restore it completely
    if (profile.resume_data) {
      const saved = profile.resume_data
      setData({
        name: saved.name || profile.full_name || '',
        email: saved.email || profile.email || '',
        phone: saved.phone || profile.phone || '',
        location: saved.location || profile.location || '',
        website: saved.website || '',
        summary: saved.summary || '',
        skills: saved.skills || [],
        experience: saved.experience?.length ? saved.experience : [{ ...EMPTY_EXP }],
        education: saved.education?.length ? saved.education : [{ ...EMPTY_EDU }],
        projects: saved.projects?.length ? saved.projects : [{ ...EMPTY_PROJECT }],
      })
      if (saved.template) setTemplate(saved.template)
    } else {
      // First time — pre-fill basics from profile
      setData(prev => ({
        ...prev,
        name: profile.full_name || prev.name,
        email: profile.email || prev.email,
        phone: profile.phone || prev.phone,
        location: profile.location || prev.location,
        education: profile.education ? [{ degree: profile.education, institution: '', year: '' }] : prev.education,
      }))
    }
  }, [profile])

  function set(field, value) { setData(prev => ({ ...prev, [field]: value })) }

  function updateExp(i, field, value) {
    setData(prev => ({ ...prev, experience: prev.experience.map((e, j) => j === i ? { ...e, [field]: value } : e) }))
  }
  function updateExpBullet(i, bi, value) {
    setData(prev => ({ ...prev, experience: prev.experience.map((e, j) => j === i ? { ...e, bullets: e.bullets.map((b, k) => k === bi ? value : b) } : e) }))
  }
  function addExpBullet(i) { setData(prev => ({ ...prev, experience: prev.experience.map((e, j) => j === i ? { ...e, bullets: [...e.bullets, ''] } : e) })) }
  function updateEdu(i, field, value) { setData(prev => ({ ...prev, education: prev.education.map((e, j) => j === i ? { ...e, [field]: value } : e) })) }
  function updateProject(i, field, value) { setData(prev => ({ ...prev, projects: prev.projects.map((p, j) => j === i ? { ...p, [field]: value } : p) })) }

  function addSkill() { if (skillInput.trim() && !data.skills.includes(skillInput.trim())) { set('skills', [...data.skills, skillInput.trim()]); setSkillInput('') } }

  async function aiGenerateSummary() {
    if (!data.name && !data.skills.length) { toast.error('Add your name and skills first'); return }
    setGenerating('summary')
    try {
      const text = await aiGenerate(`Write a 2-3 sentence professional resume summary for ${data.name || 'a candidate'} with skills: ${data.skills.join(', ')} and ${data.experience[0]?.title ? 'experience as ' + data.experience[0].title : 'a fresher'}. Keep it concise and impactful. Return ONLY the summary text, nothing else.`)
      set('summary', text)
    } catch { toast.error('AI generation failed') }
    finally { setGenerating(null) }
  }

  async function aiGenerateBullets(i) {
    const exp = data.experience[i]
    if (!exp?.title) { toast.error('Add job title first'); return }
    setGenerating(`bullets-${i}`)
    try {
      const text = await aiGenerate(`Write 3 resume bullet points for a ${exp.title} at ${exp.company || 'a company'}. Each bullet should start with a strong action verb and include a quantifiable result if possible. Return ONLY the 3 bullets, one per line, no numbering or dashes.`)
      const bullets = text.split('\n').map(b => b.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 3)
      if (bullets.length) setData(prev => ({ ...prev, experience: prev.experience.map((e, j) => j === i ? { ...e, bullets } : e) }))
    } catch { toast.error('AI generation failed') }
    finally { setGenerating(null) }
  }

  async function downloadPDF() {
    const html2pdf = (await import('html2pdf.js')).default
    const element = previewRef.current
    if (!element) { toast.error('Preview not available'); return }
    toast.loading('Generating PDF...')
    try {
      await html2pdf().set({
        margin: 0, filename: `${(data.name || 'resume').replace(/\s+/g, '_')}_resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(element).save()
      toast.dismiss()
      toast.success('Resume downloaded!')
    } catch { toast.dismiss(); toast.error('PDF generation failed') }
  }

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveResume() {
    const html2pdf = (await import('html2pdf.js')).default
    const element = previewRef.current
    if (!element || !user) { toast.error('Cannot save — preview not ready'); return }

    setSaving(true)
    toast.loading('Saving resume to your profile...')
    try {
      // Generate PDF blob
      const pdfBlob = await html2pdf().set({
        margin: 0, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(element).outputPdf('blob')

      // Upload to Supabase Storage
      const fileName = `${user.uid}/${Date.now()}-built-resume.pdf`
      const { error: uploadErr } = await supabase.storage.from('resumes').upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (uploadErr) throw uploadErr

      // Update profile with new resume URL + skills + form data for editing later
      await updateProfile({
        resume_url: fileName,
        skills: data.skills.length > 0 ? data.skills : undefined,
        resume_data: { ...data, template },
      }).catch(() => {})

      toast.dismiss()
      toast.success('Resume saved to your profile! Recruiters can now see it.')
      setSaved(true)
      setTimeout(() => setSaved(false), 5000)
    } catch (err) {
      toast.dismiss()
      toast.error('Failed to save: ' + (err.message || 'Try again'))
    } finally {
      setSaving(false)
    }
  }

  const TemplateComponent = TEMPLATES.find(t => t.id === template)?.component || ClassicTemplate

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Resume Builder</h1>
            <p className="text-primary/50 text-sm">Create a professional resume. Pick a template, fill in details, download as PDF.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowPreview(!showPreview)} className="btn-secondary text-sm py-2 px-4">
              {showPreview ? <><Edit3 className="w-4 h-4" /> Edit</> : <><Eye className="w-4 h-4" /> Preview</>}
            </button>
            <button onClick={saveResume} disabled={saving} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save to Profile</>}
            </button>
            <button onClick={downloadPDF} className="btn-accent text-sm py-2 px-4"><Download className="w-4 h-4" /> Download PDF</button>
          </div>
        </div>

        {/* Template Selector */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all w-36 text-left ${template === t.id ? 'border-accent bg-accent/5' : 'border-primary/10 hover:border-primary/20'}`}>
              <p className="font-semibold text-primary text-sm">{t.name}</p>
              <p className="text-xs text-primary/50">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Form */}
          {!showPreview && (
            <div className="flex-1 space-y-5">
              {/* Personal */}
              <div className="card">
                <h3 className="font-semibold text-primary mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={data.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Full Name *" />
                  <input value={data.email} onChange={e => set('email', e.target.value)} className="input-field" placeholder="Email *" />
                  <input value={data.phone} onChange={e => set('phone', e.target.value)} className="input-field" placeholder="Phone" />
                  <input value={data.location} onChange={e => set('location', e.target.value)} className="input-field" placeholder="Location" />
                  <input value={data.website} onChange={e => set('website', e.target.value)} className="input-field sm:col-span-2" placeholder="Website / LinkedIn (optional)" />
                </div>
              </div>

              {/* Summary */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-primary">Professional Summary</h3>
                  <button onClick={aiGenerateSummary} disabled={generating === 'summary'} className="text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1 disabled:opacity-50">
                    {generating === 'summary' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Generate
                  </button>
                </div>
                <textarea value={data.summary} onChange={e => set('summary', e.target.value)} rows={3} className="input-field" placeholder="A brief professional summary (2-3 sentences)..." />
              </div>

              {/* Skills */}
              <div className="card">
                <h3 className="font-semibold text-primary mb-4">Skills</h3>
                <div className="flex gap-2 mb-2">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} className="input-field" placeholder="Add skill..." />
                  <button onClick={addSkill} className="btn-secondary py-2 px-3"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">{data.skills.map((s, i) => (
                  <span key={i} className="badge bg-accent/10 text-accent py-1 px-2.5 flex items-center gap-1">{s}<button onClick={() => set('skills', data.skills.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button></span>
                ))}</div>
              </div>

              {/* Experience */}
              <div className="card">
                <h3 className="font-semibold text-primary mb-4">Work Experience</h3>
                {data.experience.map((exp, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 mb-3">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={exp.title} onChange={e => updateExp(i, 'title', e.target.value)} className="input-field" placeholder="Job Title" />
                      <input value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} className="input-field" placeholder="Company" />
                      <input value={exp.start} onChange={e => updateExp(i, 'start', e.target.value)} className="input-field" placeholder="Start (e.g., Jan 2023)" />
                      <input value={exp.end} onChange={e => updateExp(i, 'end', e.target.value)} className="input-field" placeholder="End (or 'Present')" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-primary/50">Bullet points</span>
                      <button onClick={() => aiGenerateBullets(i)} disabled={generating === `bullets-${i}`} className="text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-0.5 disabled:opacity-50">
                        {generating === `bullets-${i}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Generate
                      </button>
                    </div>
                    {exp.bullets.map((b, bi) => (
                      <input key={bi} value={b} onChange={e => updateExpBullet(i, bi, e.target.value)} className="input-field mb-1" placeholder="Describe what you did..." />
                    ))}
                    <button onClick={() => addExpBullet(i)} className="text-xs text-accent mt-1">+ Add bullet</button>
                    {data.experience.length > 1 && <button onClick={() => set('experience', data.experience.filter((_, j) => j !== i))} className="text-xs text-red-500 ml-3">Remove</button>}
                  </div>
                ))}
                <button onClick={() => set('experience', [...data.experience, { ...EMPTY_EXP }])} className="btn-secondary text-xs py-1.5 px-3"><Plus className="w-3 h-3" /> Add Experience</button>
              </div>

              {/* Education */}
              <div className="card">
                <h3 className="font-semibold text-primary mb-4">Education</h3>
                {data.education.map((edu, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <input value={edu.degree} onChange={e => updateEdu(i, 'degree', e.target.value)} className="input-field" placeholder="Degree" />
                    <input value={edu.institution} onChange={e => updateEdu(i, 'institution', e.target.value)} className="input-field" placeholder="Institution" />
                    <div className="flex gap-1">
                      <input value={edu.year} onChange={e => updateEdu(i, 'year', e.target.value)} className="input-field" placeholder="Year" />
                      {data.education.length > 1 && <button onClick={() => set('education', data.education.filter((_, j) => j !== i))} className="text-red-500 px-1"><X className="w-4 h-4" /></button>}
                    </div>
                  </div>
                ))}
                <button onClick={() => set('education', [...data.education, { ...EMPTY_EDU }])} className="btn-secondary text-xs py-1.5 px-3"><Plus className="w-3 h-3" /> Add Education</button>
              </div>

              {/* Projects */}
              <div className="card">
                <h3 className="font-semibold text-primary mb-4">Projects (Optional)</h3>
                {data.projects.map((p, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 mb-3 p-3 rounded-lg bg-slate-50">
                    <input value={p.name} onChange={e => updateProject(i, 'name', e.target.value)} className="input-field" placeholder="Project Name" />
                    <input value={p.description} onChange={e => updateProject(i, 'description', e.target.value)} className="input-field" placeholder="Brief description" />
                    <div className="flex gap-1">
                      <input value={p.link} onChange={e => updateProject(i, 'link', e.target.value)} className="input-field" placeholder="Link (optional)" />
                      {data.projects.length > 1 && <button onClick={() => set('projects', data.projects.filter((_, j) => j !== i))} className="text-red-500 px-1"><X className="w-4 h-4" /></button>}
                    </div>
                  </div>
                ))}
                <button onClick={() => set('projects', [...data.projects, { ...EMPTY_PROJECT }])} className="btn-secondary text-xs py-1.5 px-3"><Plus className="w-3 h-3" /> Add Project</button>
              </div>
            </div>
          )}

          {/* Visible Preview */}
          <div className={showPreview ? 'flex-1' : 'w-[45%] hidden lg:block'}>
            <div className="sticky top-20">
              <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ width: '100%', minHeight: '842px', maxWidth: '595px', margin: '0 auto' }}>
                <TemplateComponent data={data} />
              </div>
            </div>
          </div>

          {/* Hidden preview for PDF generation — always rendered offscreen */}
          <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <div ref={previewRef} style={{ width: '595px', minHeight: '842px', background: 'white' }}>
              <TemplateComponent data={data} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
