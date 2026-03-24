import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  // If role is required but profile hasn't loaded yet, show spinner
  if (requiredRole && !profile) return <LoadingSpinner className="min-h-screen" size="lg" />

  // If role doesn't match, redirect to dashboard
  if (requiredRole && profile?.role !== requiredRole) return <Navigate to="/dashboard" replace />

  return children
}
