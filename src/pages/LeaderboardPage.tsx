import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import {
  Trophy, Crown, Star, Home, Calendar, TrendingUp, Award, Globe,
  type LucideIcon,
} from 'lucide-react'

type Period = 'today' | 'week' | 'month' | 'all'
type LeaderboardEntry = Profile & { rank: number; recent_score: number }

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Günün En İyisi',
  week: 'Haftanın En İyisi',
  month: 'Ayın En İyisi',
  all: 'Tüm Zamanlar',
}

const PERIOD_ICONS: Record<Period, LucideIcon> = {
  today: Trophy,
  week: TrendingUp,
  month: Calendar,
  all: Award,
}

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('today')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    try {
      let query
      if (period === 'all') {
        query = supabase
          .from('profiles')
          .select('*')
          .eq('is_banned', false)
          .order('total_points', { ascending: false })
          .limit(50)
      } else {
        const now = new Date()
        let startDate: Date
        if (period === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (period === 'week') {
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
        } else {
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
        }
        const startISO = startDate.toISOString()

        query = supabase
          .from('scores')
          .select(`
            score,
            user_id,
            profiles!inner(*)
          `)
          .gte('created_at', startISO)
          .order('score', { ascending: false })
          .limit(50)
      }

      const { data, error } = await query

      if (error) throw error

      if (period === 'all' && data) {
        const ranked = (data as Profile[]).map((p, i) => ({
          ...p,
          rank: i + 1,
          recent_score: p.total_points,
        }))
        setEntries(ranked)
      } else if (data) {
        const seen = new Set<string>()
        const ranked: LeaderboardEntry[] = []
        for (const row of data as any[]) {
          const profile = row.profiles as Profile
          if (!profile || seen.has(profile.id)) continue
          seen.add(profile.id)
          ranked.push({
            ...profile,
            rank: ranked.length + 1,
            recent_score: row.score,
          })
        }
        setEntries(ranked)
      }
    } catch (err) {
      console.error('Leaderboard error:', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const getBadge = (entry: Profile) => {
    if (entry.gender === 'female') {
      return <span className="badge-queen text-xs">Kraliçe</span>
    }
    return <span className="badge-king text-xs">Kral</span>
  }

  const getStars = (points: number) => {
    if (points >= 10000) return 5
    if (points >= 5000) return 4
    if (points >= 2500) return 3
    if (points >= 1000) return 2
    if (points >= 500) return 1
    return 0
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={20} className="text-accent-400" />
    if (rank === 2) return <Trophy size={18} className="text-primary-300" />
    if (rank === 3) return <Award size={18} className="text-cream-400" />
    return <span className="text-primary-400 font-bold text-sm">{rank}</span>
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1">
          <Home size={16} />
          <span className="hidden sm:inline">Ana Sayfa</span>
        </button>
        <h1 className="text-xl font-bold text-cream-100 flex items-center gap-2">
          <Trophy size={24} className="text-accent-400" />
          Liderlik
        </h1>
        <div className="w-20" />
      </div>

      {/* Period Tabs */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => {
          const Icon = PERIOD_ICONS[p]
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`glass-card p-3 flex flex-col items-center gap-1 transition-all ${
                period === p ? 'glow-accent border-accent-400/30' : 'glass-card-hover'
              }`}
            >
              <Icon size={20} className={period === p ? 'text-accent-400' : 'text-primary-400'} />
              <span className={`text-xs font-medium ${period === p ? 'text-cream-100' : 'text-primary-300'}`}>
                {PERIOD_LABELS[p].split(' ')[0]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-cream-100 mb-4 text-center">
        {PERIOD_LABELS[period]}
      </h2>

      {/* Leaderboard */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-accent-400 rounded-full animate-spin-slow" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-primary-400">
          <Trophy size={48} className="mx-auto mb-4 opacity-30" />
          <p>Henüz veri yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card p-3 flex items-center gap-3 ${
                entry.rank <= 3 ? 'glass-card-hover' : ''
              }`}
            >
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                {getRankIcon(entry.rank)}
              </div>
              <div className="relative flex-shrink-0">
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt={entry.username}
                    className={`w-10 h-10 rounded-full object-cover ${
                      entry.is_online ? 'avatar-glow-online' : 'avatar-glow'
                    }`}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center ${
                    entry.is_online ? 'avatar-glow-online' : 'avatar-glow'
                  }`}>
                    <span className="text-primary-200 font-bold text-sm">
                      {entry.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {entry.is_online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 rounded-full border-2 border-primary-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-cream-100 font-medium truncate">{entry.username}</span>
                  {getBadge(entry)}
                </div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {Array.from({ length: getStars(entry.total_points) }).map((_, j) => (
                    <Star key={j} size={10} className="text-accent-400 fill-accent-400" />
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-accent-400 font-bold">
                  {period === 'all' ? entry.total_points : entry.recent_score}
                </div>
                <div className="text-xs text-primary-400">puan</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
