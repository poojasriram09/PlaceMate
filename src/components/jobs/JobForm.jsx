import { useState } from 'react'
import { X, Plus, Sparkles, GraduationCap } from 'lucide-react'
import { JOB_TYPES } from '../../utils/helpers'
import { generateJobDescription } from '../../lib/ai'
import toast from 'react-hot-toast'

export default function JobForm({ onSubmit, initialData = {}, loading, submitLabel = 'Post Job' }) {
  const [form, setForm] = useState({
    title: initialData.title || '',
    company_name: initialData.company_name || '',
    description: initialData.description || '',
    requirements: initialData.requirements || '',
    skills_required: initialData.skills_required || [],
    location: initialData.location || '',
    job_type: initialData.job_type || 'internship',
    target_years: initialData.target_years || [],
    salary_min: initialData.salary_min || '',
    salary_max: initialData.salary_max || '',
    deadline: initialData.deadline || '',
  })
  const [skillInput, setSkillInput] = useState('')
  const [generating, setGenerating] = useState(false)

  async function generateWithAI() {
    if (!form.title) { toast.error('Enter a job title first'); return }
    setGenerating(true)
    try {
      const result = await generateJobDescription(
        form.title,
        form.skills_required,
        form.target_years.length > 0 ? `For ${form.target_years.map(y => y + ['st','nd','rd','th'][Math.min(y-1,3)] + ' year').join(', ')} students` : null,
      )
      setForm((prev) => ({
        ...prev,
        description: result.description || prev.description,
        requirements: result.requirements || prev.requirements,
      }))
      toast.success('AI generated description!')
    } catch (err) {
      toast.error(err.message || 'AI generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function toggleYear(year) {
    setForm(prev => ({
      ...prev,
      target_years: prev.target_years.includes(year)
        ? prev.target_years.filter(y => y !== year)
        : [...prev.target_years, year].sort()
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      ...form,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      target_years: form.target_years,
    })
  }

  function addSkill() {
    if (skillInput.trim() && !form.skills_required.includes(skillInput.trim())) {
      setForm((prev) => ({ ...prev, skills_required: [...prev.skills_required, skillInput.trim()] }))
      setSkillInput('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Frontend Developer Intern" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
        <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input-field" placeholder="e.g. TechCorp India" />
      </div>

      {/* AI Generate Button */}
      <button
        type="button"
        onClick={generateWithAI}
        disabled={generating || !form.title}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border-2 border-dashed border-accent text-accent hover:bg-accent-50 font-medium text-sm transition-all duration-300 disabled:opacity-50"
      >
        <Sparkles className="w-4 h-4" />
        {generating ? 'Generating with AI...' : 'Auto-generate Description & Requirements with AI'}
      </button>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
        <textarea required rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Describe the role, responsibilities..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Requirements *</label>
        <textarea required rows={4} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="input-field" placeholder="List the requirements for this role..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills *</label>
        <div className="flex gap-2 mb-2">
          <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input-field" placeholder="Type a skill and press Enter" />
          <button type="button" onClick={addSkill} className="btn-secondary py-2 px-3"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.skills_required.map((skill) => (
            <span key={skill} className="badge bg-accent-50 text-accent-700 flex items-center gap-1 py-1 px-2.5">
              {skill}
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, skills_required: prev.skills_required.filter((s) => s !== skill) }))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
          <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="e.g. Mumbai, Remote" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job Type</label>
          <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="input-field">
            {JOB_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
      </div>

      {/* Target Year — which students can see this job */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          <GraduationCap className="w-4 h-4 inline mr-1 text-accent" />
          Eligible Year of Study
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(y => (
            <button key={y} type="button" onClick={() => toggleYear(y)}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                form.target_years.includes(y)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-slate-200 text-slate-400 hover:border-slate-300'
              }`}>
              {y}{['st','nd','rd','th'][Math.min(y-1,3)]} Year
            </button>
          ))}
        </div>
        <p className="text-xs text-primary/40 mt-1.5">
          {form.target_years.length === 0
            ? 'Select which year students can apply. Leave empty for all years.'
            : `Visible to ${form.target_years.map(y => y + ['st','nd','rd','th'][Math.min(y-1,3)] + ' year').join(', ')} students`}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Salary Range (₹ per annum, optional)</label>
        <div className="flex gap-2">
          <input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} className="input-field" placeholder="Min" />
          <input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} className="input-field" placeholder="Max" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Application Deadline *</label>
        <input type="date" required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="input-field" min={new Date().toISOString().split('T')[0]} />
      </div>

      <button type="submit" disabled={loading} className="btn-accent w-full">
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
