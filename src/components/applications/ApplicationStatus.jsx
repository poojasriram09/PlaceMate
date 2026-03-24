import { STATUS_COLORS } from '../../utils/helpers'

const STATUSES = ['applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected']

export default function ApplicationStatus({ status, onChange, disabled }) {
  if (!onChange) {
    return <span className={`badge capitalize ${STATUS_COLORS[status]}`}>{status}</span>
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`badge capitalize cursor-pointer ${STATUS_COLORS[status]} border-0 pr-6`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">{s}</option>
      ))}
    </select>
  )
}
