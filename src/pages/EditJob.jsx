import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import JobForm from '../components/jobs/JobForm'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function EditJob() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('recruiter_id', user.uid)
        .single()
      if (error || !data) {
        toast.error('Job not found or not authorized')
        navigate('/dashboard')
        return
      }
      setJob(data)
      setLoading(false)
    }
    load()
  }, [id, user.uid])

  async function handleSubmit(formData) {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('recruiter_id', user.uid)
      if (error) throw error
      toast.success('Job updated!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Job</h1>
      <p className="text-slate-500 mb-8">Update your job listing details.</p>
      <div className="card">
        <JobForm onSubmit={handleSubmit} loading={saving} initialData={job} submitLabel="Update Job" />
      </div>
    </div>
  )
}
