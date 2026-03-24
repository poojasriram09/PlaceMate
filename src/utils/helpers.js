export function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function timeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now - date) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function formatSalary(min, max, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : '$'
  const fmt = (n) => {
    if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
    return n.toString()
  }
  if (min && max) return `${symbol}${fmt(min)} - ${symbol}${fmt(max)}`
  if (min) return `From ${symbol}${fmt(min)}`
  if (max) return `Up to ${symbol}${fmt(max)}`
  return 'Not disclosed'
}

export const STATUS_COLORS = {
  applied: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-yellow-100 text-yellow-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  interview: 'bg-orange-100 text-orange-700',
  offered: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
}

export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship']
export const EXPERIENCE_LEVELS = [
  { label: '0-1 years', min: 0, max: 1 },
  { label: '1-3 years', min: 1, max: 3 },
  { label: '3-5 years', min: 3, max: 5 },
  { label: '5-10 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: 99 },
]
