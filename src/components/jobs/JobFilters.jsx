import { useState } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { JOB_TYPES } from '../../utils/helpers'

export default function JobFilters({ filters, onApply }) {
  const [local, setLocal] = useState(filters)
  const [skillInput, setSkillInput] = useState('')

  function set(key, value) {
    setLocal((prev) => ({ ...prev, [key]: value }))
  }

  function toggleJobType(type) {
    setLocal((prev) => {
      const arr = prev.jobTypes || []
      return { ...prev, jobTypes: arr.includes(type) ? arr.filter((t) => t !== type) : [...arr, type] }
    })
  }

  function addSkill() {
    const s = skillInput.trim()
    if (s && !(local.skills || []).includes(s)) {
      setLocal((prev) => ({ ...prev, skills: [...(prev.skills || []), s] }))
      setSkillInput('')
    }
  }

  function removeSkill(skill) {
    setLocal((prev) => ({ ...prev, skills: (prev.skills || []).filter((s) => s !== skill) }))
  }

  function handleApply() {
    onApply(local)
  }

  function handleClear() {
    const cleared = { search: '', jobTypes: [], expMin: null, expMax: null, location: '', salaryMin: '', salaryMax: '', skills: [] }
    setLocal(cleared)
    onApply(cleared)
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') handleApply()
  }

  const hasFilters = local.search || local.jobTypes?.length || local.location || local.salaryMin || local.salaryMax || local.skills?.length

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search jobs..."
          value={local.search || ''}
          onChange={(e) => set('search', e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="input-field pl-10"
        />
      </div>

      {/* Job Type */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Job Type</h4>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleJobType(type)}
              className={`badge py-1.5 px-3 capitalize cursor-pointer transition-colors duration-200 ${
                local.jobTypes?.includes(type) ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Location</h4>
        <input
          type="text"
          placeholder="e.g. Mumbai, Remote"
          value={local.location || ''}
          onChange={(e) => set('location', e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="input-field"
        />
      </div>

      {/* Salary */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Salary Range (₹/year)</h4>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={local.salaryMin || ''} onChange={(e) => set('salaryMin', e.target.value)} className="input-field" />
          <input type="number" placeholder="Max" value={local.salaryMax || ''} onChange={(e) => set('salaryMax', e.target.value)} className="input-field" />
        </div>
      </div>

      {/* Skills */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Skills</h4>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Add skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
            className="input-field"
          />
          <button type="button" onClick={addSkill} className="btn-secondary py-2 px-3 flex-shrink-0"><Plus className="w-4 h-4" /></button>
        </div>
        {local.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {local.skills.map((s) => (
              <span key={s} className="badge bg-accent-50 text-accent-700 py-1 px-2 flex items-center gap-1">
                {s} <button onClick={() => removeSkill(s)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={handleApply} className="btn-accent flex-1 text-sm py-2">Apply Filters</button>
        {hasFilters && (
          <button onClick={handleClear} className="btn-secondary flex-shrink-0 text-sm py-2 px-3">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
