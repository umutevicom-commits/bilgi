import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, Mail, Lock, User, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'

type Mode = 'login' | 'register' | 'forgot'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn, signUp, resetPassword, user, profile } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    const adminKey = searchParams.get('admin_key')
    if (adminKey === 'H4md1U2024') {
      setMode('login')
    }
  }, [searchParams])

  useEffect(() => {
    if (user && profile) {
      if (profile.is_admin) {
        navigate('/admin')
      } else {
        navigate('/')
      }
    }
  }, [user, profile, navigate])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null
    const ext = avatarFile.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true })
    if (error) {
      console.error('Avatar upload error:', error)
      return null
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error === 'Invalid login credentials'
            ? 'E-posta veya şifre hatalı.'
            : error)
        }
      } else if (mode === 'register') {
        if (username.length < 3) {
          setError('Kullanıcı adı en az 3 karakter olmalıdır.')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Şifre en az 6 karakter olmalıdır.')
          setLoading(false)
          return
        }
        const { error } = await signUp(email, password, username)
        if (error) {
          setError(error)
        } else {
          setSuccess('Hesabınız oluşturuldu! Giriş yapabilirsiniz.')
          setMode('login')
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email)
        if (error) {
          setError(error)
        } else {
          setSuccess('Şifre sıfırlama bağlantısı e-postanıza gönderildi.')
        }
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 glow-primary">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-cream-100 mb-2">
              Kim Milyoner Olmak İster
            </h1>
            <p className="text-primary-300 text-sm">
              {mode === 'login' && 'Hesabınıza giriş yapın'}
              {mode === 'register' && 'Yeni hesap oluşturun'}
              {mode === 'forgot' && 'Şifrenizi sıfırlayın'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-error-500/10 border border-error-500/30 flex items-center gap-2 text-error-400 text-sm"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-success-500/10 border border-success-500/30 flex items-center gap-2 text-success-400 text-sm"
              >
                <CheckCircle2 size={18} />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">Kullanıcı Adı</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field pl-10"
                    placeholder="kullaniciadi"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-primary-300 mb-1.5">E-posta</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="ornek@email.com"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">Şifre</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-200"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">Avatar (İsteğe Bağlı)</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-16 h-16 rounded-full object-cover avatar-glow"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-800 flex items-center justify-center border border-primary-600">
                        <User size={24} className="text-primary-400" />
                      </div>
                    )}
                  </div>
                  <label className="btn-ghost cursor-pointer text-sm flex items-center gap-2">
                    <Upload size={16} />
                    Avatar Seç
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Giriş Yap'}
                  {mode === 'register' && 'Kayıt Ol'}
                  {mode === 'forgot' && 'Sıfırla'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => { setMode('forgot'); setError(null); setSuccess(null) }}
                  className="text-primary-300 hover:text-accent-400 transition-colors"
                >
                  Şifremi unuttum
                </button>
                <div>
                  <span className="text-primary-400">Hesabın yok mu? </span>
                  <button
                    onClick={() => { setMode('register'); setError(null); setSuccess(null) }}
                    className="text-accent-400 hover:text-accent-300 font-semibold"
                  >
                    Kayıt ol
                  </button>
                </div>
              </>
            )}
            {mode === 'register' && (
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                className="text-primary-300 hover:text-accent-400 transition-colors"
              >
                Zaten hesabın var mı? Giriş yap
              </button>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                className="text-primary-300 hover:text-accent-400 transition-colors"
              >
                Geri dön
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
