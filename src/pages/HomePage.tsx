import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { AdBanner } from '../components/AdBanner'
import type { GameSession, Category } from '../types'
import {
  Play, Trophy, LogOut, LogIn, User, Crown, Star, Zap, BookOpen, Globe,
  Calculator, Newspaper, Car, Map, FlaskConical, Landmark, GraduationCap, Shuffle,
  type LucideIcon,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  calculator: Calculator,
  newspaper: Newspaper,
  car: Car,
  map: Map,
  'flask-conical': FlaskConical,
  landmark: Landmark,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  shuffle: Shuffle,
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const isGuest = !user
  const [hasBreakSession, setHasBreakSession] = useState(false)
  const [breakSession, setBreakSession] = useState<GameSession | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCategorySelect, setShowCategorySelect] = useState(false)

  useEffect(() => {
    const checkBreak = async () => {
      if (!profile) return
      const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'break')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        setBreakSession(data as GameSession)
        setHasBreakSession(true)
      }
    }
    checkBreak()
  }, [profile])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (data) setCategories(data as Category[])
    }
    fetchCategories()
  }, [])

  const handleStartGame = () => {
    if (isGuest) {
      navigate('/auth')
      return
    }
    if (hasBreakSession) {
      setShowCategorySelect(false)
      navigate(`/game?resume=true`)
    } else {
      setShowCategorySelect(true)
    }
  }

  const handleCategorySelect = (slug: string) => {
    if (isGuest) {
      navigate('/auth')
      return
    }
    setSelectedCategory(slug)
    navigate(`/game?category=${slug}`)
  }

  const handleContinue = () => {
    if (isGuest) {
      navigate('/auth')
      return
    }
    navigate(`/game?resume=true`)
  }

  const getBadge = () => {
    if (!profile) return null
    if (profile.gender === 'female') {
      return <span className="badge-queen">Kraliçe</span>
    }
    return <span className="badge-king">Kral</span>
  }

  const getStars = () => {
    if (!profile) return 0
    if (profile.total_points >= 10000) return 5
    if (profile.total_points >= 5000) return 4
    if (profile.total_points >= 2500) return 3
    if (profile.total_points >= 1000) return 2
    if (profile.total_points >= 500) return 1
    return 0
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto safe-bottom">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className={`w-12 h-12 rounded-full object-cover ${profile.is_online ? 'avatar-glow-online' : 'avatar-glow'}`}
            />
          ) : (
            <div className={`w-12 h-12 rounded-full bg-primary-700 flex items-center justify-center ${profile?.is_online ? 'avatar-glow-online' : 'avatar-glow'}`}>
              <User size={24} className="text-primary-200" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-cream-100">{profile?.username || 'Misafir'}</h2>
              {getBadge()}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {Array.from({ length: getStars() }).map((_, i) => (
                <Star key={i} size={14} className="text-accent-400 fill-accent-400" />
              ))}
              <span className="text-primary-300 ml-1">{profile?.total_points || 0} puan</span>
            </div>
          </div>
        </div>
          {isGuest ? (
            <button
              onClick={() => navigate('/auth')}
              className="btn-accent text-sm flex items-center gap-1"
            >
              <LogIn size={16} />
              <span>Giriş Yap</span>
            </button>
          ) : (
            <button
              onClick={() => signOut()}
              className="btn-ghost text-sm flex items-center gap-1"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          )}
      </motion.header>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl sm:text-5xl font-bold text-cream-100 mb-2 text-balance">
          Kim Milyoner Olmak İster
        </h1>
        <p className="text-primary-300">Bilgi yarışması - Sonsuz soru, puan sistemi</p>
      </motion.div>

      {/* Home Ad */}
      <div className="mb-8">
        <AdBanner placement="home" />
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 mb-8">
        {hasBreakSession && breakSession && !isGuest && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleContinue}
            className="btn-accent w-full flex items-center justify-center gap-2 text-lg"
          >
            <Play size={24} />
            Oyuna Devam Et
            <span className="text-sm opacity-80">
              (Soru {breakSession.current_question_number} - {breakSession.current_points} puan)
            </span>
          </motion.button>
        )}

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleStartGame}
          className="btn-primary w-full flex items-center justify-center gap-2 text-lg"
        >
          <Zap size={24} />
          {isGuest ? 'Giriş Yap & Oyna' : hasBreakSession ? 'Yeni Oyun Başlat' : 'Oyuna Başla'}
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/leaderboard')}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-lg"
        >
          <Trophy size={24} />
          Liderlik Tablosu
        </motion.button>
      </div>

      {/* Category Selection Modal */}
      {showCategorySelect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setShowCategorySelect(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-cream-100 mb-4 text-center">Kategori Seçin</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon] || Globe
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.slug)}
                    className="glass-card glass-card-hover p-4 flex flex-col items-center gap-2 text-center"
                  >
                    <Icon size={32} className="text-accent-400" />
                    <span className="text-sm font-medium text-cream-100">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-accent-400">{profile?.total_points || 0}</div>
          <div className="text-xs text-primary-300 mt-1">Toplam Puan</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-success-400">{profile?.best_score || 0}</div>
          <div className="text-xs text-primary-300 mt-1">En İyi Skor</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-primary-300">{profile?.games_played || 0}</div>
          <div className="text-xs text-primary-300 mt-1">Oyun</div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-primary-500 text-xs mt-12">
        <p>kimmilyoner.eu.cc</p>
      </div>
    </div>
  )
}
