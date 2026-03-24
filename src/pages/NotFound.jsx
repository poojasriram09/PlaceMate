import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <SearchX className="w-20 h-20 text-slate-300 mx-auto mb-4" />
        <h1 className="text-7xl font-bold text-primary mb-2">404</h1>
        <p className="text-xl text-slate-500 mb-8">Oops! This page doesn't exist.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="btn-accent">Go Home</Link>
          <Link to="/jobs" className="btn-secondary">Browse Jobs</Link>
        </div>
      </motion.div>
    </div>
  )
}
