import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function fetchProfile(uid) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (!error && data) setProfile(data)
    return data
  }

  async function ensureProfile(firebaseUser, extraData = {}) {
    // Try fetch first
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', firebaseUser.uid)
      .maybeSingle()

    if (existing) {
      setProfile(existing)
      return existing
    }

    // Create if doesn't exist
    const role = extraData.role || 'candidate'
    const profileData = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      full_name: extraData.fullName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      role,
      company_name: extraData.companyName || null,
      candidate_year: extraData.candidateYear || null,
      avatar_url: firebaseUser.photoURL || null,
      verification_status: role === 'recruiter' ? 'pending' : 'verified',
    }

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .upsert(profileData)
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      // Even if insert fails, set a local profile so the app doesn't break
      setProfile(profileData)
      return profileData
    }
    setProfile(newProfile)
    return newProfile
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        // Always try to ensure profile exists when auth state changes
        await ensureProfile(firebaseUser).catch((err) => {
          console.error('ensureProfile error:', err)
        })
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  async function signUp({ email, password, fullName, role, companyName, candidateYear }) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
    await firebaseUpdateProfile(newUser, { displayName: fullName })
    await ensureProfile(newUser, { fullName, role, companyName, candidateYear })
    return newUser
  }

  async function signIn({ email, password }) {
    const { user: loggedIn } = await signInWithEmailAndPassword(auth, email, password)
    await ensureProfile(loggedIn)
    return loggedIn
  }

  async function signInWithGoogle() {
    if (googleLoading) return
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      if (result?.user) {
        const savedRole = localStorage.getItem('jobnexus_signup_role') || 'candidate'
        localStorage.removeItem('jobnexus_signup_role')
        await ensureProfile(result.user, { role: savedRole })
      }
      return result?.user
    } finally {
      setGoogleLoading(false)
    }
  }

  async function signOut() {
    await firebaseSignOut(auth)
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.uid)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  const value = {
    user,
    profile,
    loading,
    googleLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    fetchProfile,
    ensureProfile,
    isRecruiter: profile?.role === 'recruiter',
    isCandidate: profile?.role === 'candidate',
    isTPO: profile?.role === 'tpo',
    isVerifiedRecruiter: profile?.role === 'recruiter' && profile?.verification_status === 'verified',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
