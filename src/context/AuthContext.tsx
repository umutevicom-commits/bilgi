import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  passwordRecovery: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Profile fetch error:', error)
      return
    }
    setProfile(data as Profile | null)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true)
        }
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          (async () => {
            await fetchProfile(session.user.id)
            await supabase
              .from('profiles')
              .update({ is_online: true, last_seen: new Date().toISOString() })
              .eq('id', session.user.id)
          })()
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) {
      // Supabase bazen ayrıntısız/boş bir hata gövdesi döndürebiliyor
      // (ör. e-posta zaten kayıtlı, SMTP hatası, RLS/trigger hatası vb.).
      // Teşhis kolaylığı için tam hatayı konsola basıyoruz ve kullanıcıya
      // her zaman okunabilir bir metin gösteriyoruz.
      console.error('SignUp error (full):', error)
      const message =
        error.message && error.message.trim().length > 0 && error.message !== '{}'
          ? error.message
          : `Kayıt başarısız (status: ${('status' in error && (error as any).status) || 'bilinmiyor'}). Lütfen Supabase Authentication > Logs bölümünden ayrıntıyı kontrol edin.`
      return { error: message }
    }
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', data.user.id)
      if (profileError) {
        console.error('Profile update after signUp failed:', profileError)
      }
    }
    return { error: null }
  }

  const signOut = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id)
    }
    await supabase.auth.signOut()
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}auth`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error: error?.message ?? null }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Kullanıcı oturumu bulunamadı' }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (!error) {
      await refreshProfile()
    }
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        passwordRecovery,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
