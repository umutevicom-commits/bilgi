import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile, Ad, Category, SiteSetting } from '../types'
import {
  LayoutDashboard, Users, Ban, Clock, Image, Settings, FolderTree,
  HelpCircle, Award, BarChart3, LogOut, Plus, Trash2, Edit, Power, X,
  type LucideIcon,
} from 'lucide-react'

type AdminTab = 'dashboard' | 'users' | 'ads' | 'categories' | 'settings' | 'stats'

const TABS: { key: AdminTab; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { key: 'users', label: 'Kullanıcılar', icon: Users },
  { key: 'ads', label: 'Reklamlar', icon: Image },
  { key: 'categories', label: 'Kategoriler', icon: FolderTree },
  { key: 'settings', label: 'Ayarlar', icon: Settings },
  { key: 'stats', label: 'İstatistik', icon: BarChart3 },
]

const AD_PLACEMENT_LABELS: Record<Ad['placement'], string> = {
  home: 'Ana Sayfa',
  game_top: 'Oyun - Üst',
  game_bottom: 'Oyun - Alt',
  sidebar: 'Kenar Çubuğu',
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [users, setUsers] = useState<Profile[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [adForm, setAdForm] = useState<Partial<Ad> | null>(null)
  const [adSaving, setAdSaving] = useState(false)
  const [adError, setAdError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<SiteSetting[]>([])
  const [stats, setStats] = useState({ totalUsers: 0, totalGames: 0, totalPoints: 0 })

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) {
      setUsers(data as Profile[])
      setStats({
        totalUsers: data.length,
        totalGames: (data as Profile[]).reduce((sum, u) => sum + u.games_played, 0),
        totalPoints: (data as Profile[]).reduce((sum, u) => sum + u.total_points, 0),
      })
    }
  }, [])

  const fetchAds = useCallback(async () => {
    const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false })
    if (data) setAds(data as Ad[])
  }, [])

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('display_order', { ascending: true })
    if (data) setCategories(data as Category[])
  }, [])

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('*')
    if (data) setSettings(data as SiteSetting[])
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchAds()
    fetchCategories()
    fetchSettings()
  }, [fetchUsers, fetchAds, fetchCategories, fetchSettings])

  const toggleBan = async (user: Profile) => {
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_banned: !u.is_banned } : u))
    await supabase.from('profiles').update({ is_banned: !user.is_banned }).eq('id', user.id)
  }

  const toggleAdmin = async (user: Profile) => {
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u))
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id)
  }

  const openNewAdForm = () => {
    setAdError(null)
    setAdForm({ placement: 'home', is_active: true })
  }

  const openEditAdForm = (ad: Ad) => {
    setAdError(null)
    setAdForm({ ...ad })
  }

  const closeAdForm = () => {
    setAdForm(null)
    setAdError(null)
  }

  const saveAd = async () => {
    if (!adForm) return
    if (!adForm.placement) {
      setAdError('Yerleşim (placement) seçimi zorunludur.')
      return
    }

    setAdSaving(true)
    setAdError(null)

    const payload = {
      placement: adForm.placement,
      title: adForm.title?.trim() || null,
      content_html: adForm.content_html?.trim() || null,
      image_url: adForm.image_url?.trim() || null,
      target_url: adForm.target_url?.trim() || null,
      is_active: adForm.is_active ?? true,
      start_date: adForm.start_date || null,
      end_date: adForm.end_date || null,
    }

    if (adForm.id) {
      const { data, error } = await supabase.from('ads').update(payload).eq('id', adForm.id).select().single()
      setAdSaving(false)
      if (error) { setAdError(error.message); return }
      if (data) setAds((prev) => prev.map((a) => a.id === adForm.id ? data as Ad : a))
    } else {
      const { data, error } = await supabase.from('ads').insert(payload).select().single()
      setAdSaving(false)
      if (error) { setAdError(error.message); return }
      if (data) setAds((prev) => [data as Ad, ...prev])
    }

    closeAdForm()
  }

  const deleteAd = async (id: string) => {
    if (!window.confirm('Bu reklamı silmek istediğinizden emin misiniz?')) return
    setAds((prev) => prev.filter((a) => a.id !== id))
    const { error } = await supabase.from('ads').delete().eq('id', id)
    if (error) {
      setAdError(error.message)
      fetchAds()
    }
  }

  const toggleAdActive = async (ad: Ad) => {
    setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, is_active: !a.is_active } : a))
    const { error } = await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id)
    if (error) {
      setAdError(error.message)
      fetchAds()
    }
  }

  const toggleCategoryActive = async (cat: Category) => {
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
  }

  const updateSetting = async (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s))
    await supabase.from('site_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-5xl mx-auto safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-cream-100 flex items-center gap-2">
          <LayoutDashboard size={24} className="text-accent-400" />
          Admin Panel
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="btn-ghost text-sm">Site</button>
          <button onClick={() => signOut()} className="btn-ghost text-sm flex items-center gap-1">
            <LogOut size={16} />
            Çıkış
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`glass-card px-4 py-2.5 flex items-center gap-2 flex-shrink-0 transition-all ${
                tab === t.key ? 'glow-accent border-accent-400/30' : 'glass-card-hover'
              }`}
            >
              <Icon size={18} className={tab === t.key ? 'text-accent-400' : 'text-primary-400'} />
              <span className={`text-sm font-medium ${tab === t.key ? 'text-cream-100' : 'text-primary-300'}`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Kullanıcı" value={stats.totalUsers} icon={Users} color="text-primary-300" />
          <StatCard label="Oyunlar" value={stats.totalGames} icon={Award} color="text-success-400" />
          <StatCard label="Toplam Puan" value={stats.totalPoints} icon={BarChart3} color="text-cream-400" />
          <StatCard label="Reklamlar" value={ads.length} icon={Image} color="text-accent-400" />
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="glass-card p-3 flex items-center gap-3">
              <div className="relative flex-shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.username} loading="lazy" decoding="async" className={`w-10 h-10 rounded-full object-cover ${u.is_online ? 'avatar-glow-online' : 'avatar-glow'}`} />
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center ${u.is_online ? 'avatar-glow-online' : 'avatar-glow'}`}>
                    <span className="text-primary-200 font-bold text-sm">{u.username.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-cream-100 font-medium truncate">{u.username}</span>
                  {u.is_admin && <span className="badge-king text-xs">Admin</span>}
                  {u.is_banned && <span className="text-error-400 text-xs font-semibold">Banlı</span>}
                </div>
                <div className="text-xs text-primary-400">{u.total_points} puan · {u.games_played} oyun</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleBan(u)}
                  className={`p-2 rounded-lg transition-colors ${u.is_banned ? 'text-success-400 bg-success-500/10' : 'text-error-400 bg-error-500/10'}`}
                  title={u.is_banned ? 'Banı Kaldır' : 'Banla'}
                >
                  <Ban size={16} />
                </button>
                <button
                  onClick={() => toggleAdmin(u)}
                  className={`p-2 rounded-lg transition-colors ${u.is_admin ? 'text-accent-400 bg-accent-500/10' : 'text-primary-400 bg-primary-700/30'}`}
                  title="Admin Yap"
                >
                  <Power size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ads */}
      {tab === 'ads' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-cream-100 font-semibold">Reklamlar</h2>
            <button onClick={openNewAdForm} className="btn-accent text-sm flex items-center gap-1.5">
              <Plus size={16} />
              Yeni Reklam Ekle
            </button>
          </div>

          {adError && !adForm && (
            <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/30 text-error-400 text-sm break-anywhere">
              {adError}
            </div>
          )}

          {ads.length === 0 && (
            <div className="glass-card p-6 text-center text-primary-400 text-sm">
              Henüz reklam eklenmemiş. Başlamak için "Yeni Reklam Ekle" butonuna tıklayın.
            </div>
          )}

          <div className="space-y-2">
            {ads.map((ad) => (
              <div key={ad.id} className="glass-card p-3 flex items-center gap-3">
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt={ad.title || 'Reklam görseli'}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-primary-900"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary-900 flex items-center justify-center flex-shrink-0">
                    <Image size={20} className="text-primary-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-cream-100 text-sm font-medium truncate">{ad.title || '(Başlıksız reklam)'}</div>
                  <div className="text-xs text-primary-400 flex items-center gap-2 flex-wrap">
                    <span>{AD_PLACEMENT_LABELS[ad.placement]}</span>
                    <span className={ad.is_active ? 'text-success-400' : 'text-primary-500'}>
                      {ad.is_active ? '● Aktif' : '○ Pasif'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditAdForm(ad)}
                    className="p-2 rounded-lg text-primary-300 bg-primary-700/30"
                    title="Düzenle"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => toggleAdActive(ad)}
                    className={`p-2 rounded-lg ${ad.is_active ? 'text-success-400 bg-success-500/10' : 'text-primary-400 bg-primary-700/30'}`}
                    title={ad.is_active ? 'Pasif yap' : 'Aktif yap'}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => deleteAd(ad.id)}
                    className="p-2 rounded-lg text-error-400 bg-error-500/10"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad Create/Edit Modal */}
      <AnimatePresence>
        {adForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={closeAdForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cream-100">
                  {adForm.id ? 'Reklamı Düzenle' : 'Yeni Reklam Ekle'}
                </h3>
                <button onClick={closeAdForm} className="p-1.5 rounded-lg text-primary-400 hover:text-cream-100">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-primary-300 mb-1 block">Yerleşim *</label>
                  <select
                    value={adForm.placement || 'home'}
                    onChange={(e) => setAdForm({ ...adForm, placement: e.target.value as Ad['placement'] })}
                    className="input-field w-full"
                  >
                    {(Object.keys(AD_PLACEMENT_LABELS) as Ad['placement'][]).map((key) => (
                      <option key={key} value={key}>{AD_PLACEMENT_LABELS[key]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-primary-300 mb-1 block">Başlık</label>
                  <input
                    type="text"
                    value={adForm.title || ''}
                    onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                    className="input-field w-full"
                    placeholder="Reklam başlığı (opsiyonel)"
                  />
                </div>

                <div>
                  <label className="text-xs text-primary-300 mb-1 block">Görsel URL</label>
                  <input
                    type="text"
                    value={adForm.image_url || ''}
                    onChange={(e) => setAdForm({ ...adForm, image_url: e.target.value })}
                    className="input-field w-full"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="text-xs text-primary-300 mb-1 block">Hedef URL (tıklanınca gidilecek link)</label>
                  <input
                    type="text"
                    value={adForm.target_url || ''}
                    onChange={(e) => setAdForm({ ...adForm, target_url: e.target.value })}
                    className="input-field w-full"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="text-xs text-primary-300 mb-1 block">Özel HTML İçerik (opsiyonel)</label>
                  <textarea
                    value={adForm.content_html || ''}
                    onChange={(e) => setAdForm({ ...adForm, content_html: e.target.value })}
                    className="input-field w-full min-h-[80px] resize-y"
                    placeholder="Görsel yerine özel bir reklam kodu/HTML kullanmak isterseniz buraya yapıştırın"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-primary-300 mb-1 block">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      value={adForm.start_date ? adForm.start_date.slice(0, 10) : ''}
                      onChange={(e) => setAdForm({ ...adForm, start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-primary-300 mb-1 block">Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={adForm.end_date ? adForm.end_date.slice(0, 10) : ''}
                      onChange={(e) => setAdForm({ ...adForm, end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-primary-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adForm.is_active ?? true}
                    onChange={(e) => setAdForm({ ...adForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded accent-accent-400"
                  />
                  Reklam aktif olsun
                </label>

                {adError && (
                  <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/30 text-error-400 text-sm break-anywhere">
                    {adError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={closeAdForm} className="btn-ghost flex-1" disabled={adSaving}>
                    Vazgeç
                  </button>
                  <button onClick={saveAd} className="btn-accent flex-1" disabled={adSaving}>
                    {adSaving ? 'Kaydediliyor...' : adForm.id ? 'Güncelle' : 'Ekle'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      {tab === 'categories' && (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="glass-card p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-cream-100 text-sm font-medium">{cat.name}</div>
                <div className="text-xs text-primary-400">{cat.slug} · sıra {cat.display_order}</div>
              </div>
              <button
                onClick={() => toggleCategoryActive(cat)}
                className={`p-2 rounded-lg ${cat.is_active ? 'text-success-400 bg-success-500/10' : 'text-primary-400 bg-primary-700/30'}`}
              >
                <Power size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="space-y-3">
          {settings.map((s) => (
            <div key={s.id} className="glass-card p-3 flex items-center gap-3">
              <label className="flex-1 text-sm text-primary-300">{s.key}</label>
              <input
                type="text"
                defaultValue={s.value}
                onBlur={(e) => updateSetting(s.key, e.target.value)}
                className="input-field max-w-[120px] text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} icon={Users} color="text-primary-300" />
            <StatCard label="Toplam Oyun" value={stats.totalGames} icon={Award} color="text-success-400" />
            <StatCard label="Toplam Puan" value={stats.totalPoints} icon={BarChart3} color="text-cream-400" />
            <StatCard label="Reklamlar" value={ads.length} icon={Image} color="text-accent-400" />
          </div>
          <div className="glass-card p-4">
            <h3 className="text-cream-100 font-semibold mb-3">En İyi 10 Kullanıcı</h3>
            <div className="space-y-1">
              {users.sort((a, b) => b.total_points - a.total_points).slice(0, 10).map((u, i) => (
                <div key={u.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-primary-300">{i + 1}. {u.username}</span>
                  <span className="text-accent-400 font-semibold">{u.total_points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: number
  icon: LucideIcon
  color: string
}) {
  return (
    <div className="glass-card p-4 text-center">
      <Icon size={24} className={`${color} mx-auto mb-2`} />
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-primary-400 mt-1">{label}</div>
    </div>
  )
}
