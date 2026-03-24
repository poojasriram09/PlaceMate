import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/common/Navbar'
import Footer from './components/common/Footer'
import ProtectedRoute from './components/common/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Jobs from './pages/Jobs'
import JobDetailPage from './pages/JobDetailPage'
import PostJob from './pages/PostJob'
import EditJob from './pages/EditJob'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ResumeMatch from './pages/ResumeMatch'
import Profile from './pages/Profile'
import TPODashboard from './pages/TPODashboard'
import SkillQuiz from './pages/SkillQuiz'
import InterviewPractice from './pages/InterviewPractice'
import InterviewResult from './pages/InterviewResult'
import ResumeBuilder from './pages/ResumeBuilder'
import AptitudePrep from './pages/AptitudePrep'
import PublicProfile from './pages/PublicProfile'
import NotFound from './pages/NotFound'
import CareerCopilot from './components/ai/CareerCopilot'
import RecruiterAgent from './components/ai/RecruiterAgent'

function AppContent() {
  const location = useLocation()
  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname) || location.pathname.startsWith('/u/')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {isPublicPage ? (
        <>
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/u/:id" element={<PublicProfile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </>
      ) : (
        <main className="flex-1 pt-14 md:ml-52">
          <Routes>
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/post-job" element={<ProtectedRoute requiredRole="recruiter"><PostJob /></ProtectedRoute>} />
            <Route path="/edit-job/:id" element={<ProtectedRoute requiredRole="recruiter"><EditJob /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute requiredRole="candidate"><Applications /></ProtectedRoute>} />
            <Route path="/resume-match" element={<ProtectedRoute requiredRole="candidate"><ResumeMatch /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/tpo" element={<ProtectedRoute requiredRole="tpo"><TPODashboard /></ProtectedRoute>} />
            <Route path="/skill-quiz" element={<ProtectedRoute requiredRole="candidate"><SkillQuiz /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute requiredRole="candidate"><InterviewPractice /></ProtectedRoute>} />
            <Route path="/interview/result/:id" element={<ProtectedRoute requiredRole="candidate"><InterviewResult /></ProtectedRoute>} />
            <Route path="/resume-builder" element={<ProtectedRoute requiredRole="candidate"><ResumeBuilder /></ProtectedRoute>} />
            <Route path="/aptitude-prep" element={<ProtectedRoute requiredRole="candidate"><AptitudePrep /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      )}
      <CareerCopilot />
      <RecruiterAgent />
    </div>
  )
}

export default function App() {
  return <AppContent />
}
