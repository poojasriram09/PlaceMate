import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Briefcase, Menu, X, LogOut, LayoutDashboard, User, Briefcase as JobIcon, FileText, Sparkles, FileEdit, Brain, MessageSquare, Shield, PlusCircle, ChevronLeft, ChevronRight, Bell, BarChart3 } from 'lucide-react'

const CANDIDATE_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs', icon: JobIcon },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/resume-match', label: 'AI Match', icon: Sparkles },
  { to: '/resume-builder', label: 'Build Resume', icon: FileEdit },
  { to: '/aptitude-prep', label: 'Aptitude Prep', icon: Brain },
  { to: '/interview', label: 'Mock Interview', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: User },
]

const RECRUITER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'My Jobs', icon: JobIcon },
  { to: '/post-job', label: 'Post Job', icon: PlusCircle },
  { to: '/profile', label: 'Profile', icon: User },
]

const TPO_LINKS = [
  { to: '/tpo', label: 'TPO Panel', icon: Shield },
  { to: '/jobs', label: 'All Jobs', icon: JobIcon },
  { to: '/profile', label: 'Profile', icon: User },
]

const PUBLIC_LINKS = [
  { to: '/jobs', label: 'Browse Jobs', icon: JobIcon },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)

  // Fetch notifications
  useEffect(() => {
    if (!user || !profile) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [user, profile])

  async function loadNotifications() {
    if (!user || !profile) return
    const notifs = []

    if (profile.role === 'candidate' && profile.skills?.length > 0) {
      // New matching jobs posted in last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: newJobs } = await supabase.from('jobs').select('id, title, company_name, skills_required').eq('is_active', true).gte('created_at', since).limit(10)
      if (newJobs?.length) {
        const mySkills = profile.skills.map(s => s.toLowerCase())
        const matching = newJobs.filter(j => (j.skills_required || []).some(js => mySkills.some(ms => ms.includes(js.toLowerCase()) || js.toLowerCase().includes(ms))))
        matching.forEach(j => notifs.push({ id: j.id, type: 'new_job', text: `New: ${j.title} at ${j.company_name}`, link: `/jobs/${j.id}` }))
      }

      // Status updates on applications in last 24h
      const { data: updates } = await supabase.from('applications').select('id, status, updated_at, jobs(title)').eq('candidate_id', user.uid).gte('updated_at', since).neq('status', 'applied').limit(5)
      if (updates?.length) {
        updates.forEach(a => notifs.push({ id: a.id, type: 'status', text: `${a.jobs?.title}: ${a.status}`, link: '/applications' }))
      }
    }

    if (profile.role === 'recruiter') {
      // New applications on your jobs in last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: myJobs } = await supabase.from('jobs').select('id').eq('recruiter_id', user.uid)
      if (myJobs?.length) {
        const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true }).in('job_id', myJobs.map(j => j.id)).gte('created_at', since)
        if (count > 0) notifs.push({ id: 'new-apps', type: 'new_apps', text: `${count} new application${count > 1 ? 's' : ''} today`, link: '/dashboard' })
      }
    }

    setNotifications(notifs)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const links = !user ? PUBLIC_LINKS
    : profile?.role === 'tpo' ? TPO_LINKS
    : profile?.role === 'recruiter' ? RECRUITER_LINKS
    : CANDIDATE_LINKS

  // Public pages — no sidebar, just top bar
  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname) || location.pathname.startsWith('/u/')

  if (isPublicPage) {
    return (
      <nav className="bg-primary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center"><Briefcase className="w-4 h-4 text-white" /></div>
              <span className="font-semibold text-lg text-white">PlaceMate</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/jobs" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white px-2 sm:px-3 py-1.5">Jobs</Link>
              {user ? (
                <Link to="/dashboard" className="btn-accent py-1.5 px-4 text-sm">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="text-xs sm:text-sm font-medium text-white/70 hover:text-white px-2 sm:px-3 py-1.5">Log in</Link>
                  <Link to="/register" className="btn-accent py-1.5 px-3 sm:px-4 text-xs sm:text-sm">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    )
  }

  // App pages — sidebar layout
  return (
    <>
      {/* Top bar — thin, just logo and user */}
      <nav className="bg-primary fixed top-0 left-0 right-0 z-50 h-14">
        <div className="flex justify-between items-center h-full px-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center"><Briefcase className="w-3.5 h-3.5 text-white" /></div>
              <span className="font-semibold text-white text-sm">PlaceMate</span>
            </Link>
          </div>
          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button onClick={() => setShowNotifs(!showNotifs)} className="text-white/50 hover:text-white transition-colors relative p-1">
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-xs font-bold text-white flex items-center justify-center">{notifications.length}</span>
                  )}
                </button>
                {showNotifs && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                      <div className="px-3 py-2 bg-primary/5 border-b border-gray-100">
                        <p className="text-xs font-semibold text-primary">Notifications</p>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-3 py-4 text-xs text-primary/40 text-center">No new notifications</p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          {notifications.map((n, i) => (
                            <Link key={i} to={n.link} onClick={() => setShowNotifs(false)} className="block px-3 py-2.5 hover:bg-primary/5 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'new_job' ? 'bg-accent' : n.type === 'status' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                <p className="text-xs text-primary/70">{n.text}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <span className="text-xs text-white/50 hidden sm:block capitalize">{profile?.role}</span>
              <span className="text-sm font-medium text-white/80 max-w-[60px] sm:max-w-[100px] truncate">{profile?.full_name || 'User'}</span>
              <button onClick={handleSignOut} className="text-white/40 hover:text-red-400 transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Left Sidebar — desktop */}
      <aside className={`fixed top-14 left-0 bottom-0 z-40 bg-slate-900 transition-all duration-300 hidden md:flex flex-col ${collapsed ? 'w-16' : 'w-52'}`}>
        <div className="flex-1 py-4 overflow-y-auto">
          {links.map(link => (
            <NavLink key={link.to} to={link.to}
              className={({ isActive }) => `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${
                isActive ? 'bg-accent/10 text-accent font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              <link.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
            </NavLink>
          ))}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="p-3 text-white/30 hover:text-white/60 transition-colors border-t border-white/5 flex items-center justify-center">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-14 left-0 bottom-0 z-50 w-64 max-w-[75vw] bg-slate-900 md:hidden overflow-y-auto py-4">
            {links.map(link => (
              <NavLink key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${
                  isActive ? 'bg-accent/10 text-accent font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}>
                <link.icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            ))}
            <hr className="my-3 mx-4 border-white/10" />
            <button onClick={() => { handleSignOut(); setMobileOpen(false) }} className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 w-full">
              <LogOut className="w-4.5 h-4.5" /> Sign out
            </button>
          </aside>
        </>
      )}
    </>
  )
}
