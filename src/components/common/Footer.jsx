import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-white">PlaceMate</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">AI-powered job portal connecting candidates with the right opportunities through intelligent matching.</p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">Candidates</h4>
            <div className="space-y-2">
              <Link to="/jobs" className="block text-sm hover:text-white transition-colors">Browse Jobs</Link>
              <Link to="/resume-match" className="block text-sm hover:text-white transition-colors">AI Match</Link>
              <Link to="/applications" className="block text-sm hover:text-white transition-colors">Applications</Link>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-white mb-3">Recruiters</h4>
            <div className="space-y-2">
              <Link to="/post-job" className="block text-sm hover:text-white transition-colors">Post Job</Link>
              <Link to="/dashboard" className="block text-sm hover:text-white transition-colors">Dashboard</Link>
              <Link to="/register" className="block text-sm hover:text-white transition-colors">Sign Up</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} PlaceMate. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
