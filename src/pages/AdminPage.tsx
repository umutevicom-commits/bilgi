import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile, Question, Ad, Category, SiteSetting } from '../types'
import {
  LayoutDashboard, Users, Ban, Clock, Image, Settings, FolderTree,
  HelpCircle, Award, BarChart3, LogOut, Plus, Trash2, Edit, Power,
  type LucideIcon,
} from 'lucide-react'

type AdminTab = 'dashboard' | 'users' | 'questions' | 'ads' | 'categories' | 'settings' | 'stats'

const TABS: { key: AdminTab; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { key: 'users', label: 'Kullanıcılar', icon: Users },
  { key: 'questions', label: 'Sorular', icon: HelpCircle },
  { key: 'ads', label: 'Reklamlar', icon: Image },
  { key: 'categories', label: 'Kategoriler', icon: FolderTree },
  { key: 'settings', label: 'Ayarlar', icon: Settings },
  { key: 'stats', label: 'İstatistik', icon: BarChart3 },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [users, setUsers] = useState<Profile[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<SiteSetting[]>([])
  const [stats, setStats] = useState({ totalUsers: 0, totalQuestions: 0, totalGames: 0, totalPoints: 0 })

  const fetchAll = useCallback(async () => {
    const [usersRes, questionsRes, adsRes, categoriesRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('questions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
      supabase.from('site_settings').select('*'),
    ])

    if (usersRes.data) setUsers(usersRes.data as Profile[])
    if (questionsRes.data) setQuestions(questionsRes.data as Question[])
    if (adsRes.data) setAds(adsRes.data as Ad[])
    if (categoriesRes.data) setCategories(categoriesRes.data as Category[])
    if (settingsRes.data) setSettings(settingsRes.data as SiteSetting[])

    setStats({
      totalUsers: usersRes.data?.length || 0,
      totalQuestions: questionsRes.data?.length || 0,
      totalGames: (usersRes.data as Profile[] | null)?.reduce((sum, u) => sum + u.games_played, 0) || 0,
      totalPoints: (usersRes.data as Profile[] | null)?.reduce((sum, u) => sum + u.total_points, 0) || 0,
    })
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleBan = async (user: Profile) => {
    await supabase.from('profiles').update({ is_banned: !user.is_banned }).eq('id', user.id)
    fetchAll()
  }

  const toggleAdmin = async (user: Profile) => {
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id)
    fetchAll()
  }

  const deleteQuestion = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id)
    fetchAll()
  }

  const toggleQuestionActive = async (q: Question) => {
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id)
    fetchAll()
  }

  const deleteAd = async (id: string) => {
    await supabase.from('ads').delete().eq('id', id)
    fetchAll()
  }

  const toggleAdActive = async (ad: Ad) => {
    await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id)
    fetchAll()
  }

  const toggleCategoryActive = async (cat: Category) => {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    fetchAll()
  }

  const updateSetting = async (key: string, value: string) => {
    await supabase.from('site_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
    fetchAll()
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
          <StatCard label="Sorular" value={stats.totalQuestions} icon={HelpCircle} color="text-accent-400" />
          <StatCard label="Oyunlar" value={stats.totalGames} icon={Award} color="text-success-400" />
          <StatCard label="Toplam Puan" value={stats.totalPoints} icon={BarChart3} color="text-cream-400" />
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

      {/* Questions */}
      {tab === 'questions' && (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="glass-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-cream-100 text-sm font-medium truncate">{q.question_text}</p>
                  <div className="text-xs text-primary-400 mt-1">
                    {q.category} · {q.difficulty} · {q.correct_answer}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleQuestionActive(q)}
                    className={`p-2 rounded-lg ${q.is_active ? 'text-success-400 bg-success-500/10' : 'text-primary-400 bg-primary-700/30'}`}
                  >
                    <Power size={14} />
                  </button>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="p-2 rounded-lg text-error-400 bg-error-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ads */}
      {tab === 'ads' && (
        <AdsTab
          ads={ads}
          onToggleActive={toggleAdActive}
          onDelete={deleteAd}
          onRefresh={fetchAll}
          currentUserId={profile?.id ?? ''}
        />
      )}

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
            <StatCard label="Toplam Soru" value={stats.totalQuestions} icon={HelpCircle} color="text-accent-400" />
            <StatCard label="Toplam Oyun" value={stats.totalGames} icon={Award} color="text-success-400" />
            <StatCard label="Toplam Puan" value={stats.totalPoints} icon={BarChart3} color="text-cream-400" />
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

// ---------------------------------------------------------------------------
// AdsTab — reklam listeleme + ekleme formu
// ---------------------------------------------------------------------------

const PLACEMENTS: Ad['placement'][] = ['home', 'game_top', 'game_bottom', 'sidebar']
const PLACEMENT_LABELS: Record<Ad['placement'], string> = {
  home: 'Ana Sayfa',
  game_top: 'Oyun Üstü',
  game_bottom: 'Oyun Altı',
  sidebar: 'Kenar',
}

const EMPTY_AD_FORM = {
  placement: 'home' as Ad['placement'],
  title: '',
  content_html: '',
  image_url: '',
  target_url: '',
  start_date: '',
  end_date: '',
}

function AdsTab({
  ads,
  onToggleActive,
  onDelete,
  onRefresh,
  currentUserId,
}: {
  ads: Ad[]
  onToggleActive: (ad: Ad) => void
  onDelete: (id: string) => void
  onRefresh: () => void
  currentUserId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_AD_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  const resetForm = () => {
    setForm(EMPTY_AD_FORM)
    setFormError(null)
    setFormSuccess(null)
    setEditId(null)
  }

  const openEdit = (ad: Ad) => {
    setForm({
      placement: ad.placement,
      title: ad.title ?? '',
      content_html: ad.content_html ?? '',
      image_url: ad.image_url ?? '',
      target_url: ad.target_url ?? '',
      start_date: ad.start_date ? ad.start_date.slice(0, 16) : '',
      end_date: ad.end_date ? ad.end_date.slice(0, 16) : '',
    })
    setEditId(ad.id)
    setFormError(null)
    setFormSuccess(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    setFormError(null)
    setFormSuccess(null)

    if (!form.title.trim() && !form.image_url.trim() && !form.content_html.trim()) {
      setFormError('Başlık, görsel URL veya HTML içerikten en az biri zorunludur.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        placement: form.placement,
        title: form.title.trim() || null,
        content_html: form.content_html.trim() || null,
        image_url: form.image_url.trim() || null,
        target_url: form.target_url.trim() || null,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      let dbError: { message: string } | null = null

      if (editId) {
        const res = await supabase.from('ads').update(payload).eq('id', editId)
        dbError = res.error
      } else {
        const res = await supabase.from('ads').insert({ ...payload, created_by: currentUserId })
        dbError = res.error
      }

      if (dbError) {
        setFormError(`Hata: ${dbError.message}`)
      } else {
        setFormSuccess(editId ? 'Reklam güncellendi.' : 'Reklam eklendi.')
        resetForm()
        setShowForm(false)
        onRefresh()
      }
    } catch (err) {
      setFormError('Beklenmeyen bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Yeni Reklam Butonu */}
      <button
        onClick={() => { resetForm(); setShowForm((v) => !v) }}
        className="btn-accent flex items-center gap-2"
      >
        <Plus size={18} />
        {showForm && !editId ? 'Formu Kapat' : 'Yeni Reklam Ekle'}
      </button>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-cream-100 font-semibold">
                {editId ? 'Reklamı Düzenle' : 'Yeni Reklam'}
              </h3>

              {formError && (
                <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-error-500/10 border border-error-500/30 text-error-400 text-sm break-anywhere">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div role="status" aria-live="polite" className="p-3 rounded-lg bg-success-500/10 border border-success-500/30 text-success-400 text-sm">
                  {formSuccess}
                </div>
              )}

              {/* Yerleşim */}
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">Yerleşim *</label>
                <select
                  value={form.placement}
                  onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as Ad['placement'] }))}
                  className="input-field"
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p} value={p} style={{ background: '#0a1428' }}>
                      {PLACEMENT_LABELS[p]} ({p})
                    </option>
                  ))}
                </select>
              </div>

              {/* Başlık */}
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">Başlık</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Reklam başlığı"
                  className="input-field"
                />
              </div>

              {/* Görsel URL */}
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">Görsel URL</label>
                <input
                  type="url"
                  inputMode="url"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://example.com/banner.jpg"
                  className="input-field"
                />
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Önizleme"
                    className="mt-2 rounded-lg max-h-32 object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    onLoad={(e) => (e.currentTarget.style.display = 'block')}
                  />
                )}
              </div>

              {/* Hedef URL */}
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">Tıklama URL'si</label>
                <input
                  type="url"
                  inputMode="url"
                  value={form.target_url}
                  onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))}
                  placeholder="https://example.com"
                  className="input-field"
                />
              </div>

              {/* HTML İçerik */}
              <div>
                <label className="block text-sm text-primary-300 mb-1.5">
                  HTML İçerik <span className="text-primary-500">(opsiyonel)</span>
                </label>
                <textarea
                  value={form.content_html}
                  onChange={(e) => setForm((f) => ({ ...f, content_html: e.target.value }))}
                  placeholder="<p>Reklam içeriği...</p>"
                  rows={3}
                  className="input-field resize-y font-mono text-sm"
                />
              </div>

              {/* Tarihler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-primary-300 mb-1.5">Başlangıç Tarihi</label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm text-primary-300 mb-1.5">Bitiş Tarihi</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Kaydet / İptal */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-accent flex items-center gap-2"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-primary-900 border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <Plus size={16} />
                  )}
                  {editId ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  onClick={() => { resetForm(); setShowForm(false) }}
                  className="btn-ghost"
                  disabled={saving}
                >
                  İptal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reklam Listesi */}
      {ads.length === 0 ? (
        <div className="glass-card p-8 text-center text-primary-400">
          Henüz reklam eklenmemiş.
        </div>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <div key={ad.id} className="glass-card p-3 flex items-center gap-3">
              {ad.image_url && (
                <img
                  src={ad.image_url}
                  alt={ad.title ?? 'Reklam'}
                  loading="lazy"
                  decoding="async"
                  className="w-14 h-10 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-cream-100 text-sm font-medium truncate">
                  {ad.title || <span className="text-primary-400 italic">Başlıksız</span>}
                </div>
                <div className="text-xs text-primary-400 flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="bg-primary-800 px-1.5 py-0.5 rounded">
                    {PLACEMENT_LABELS[ad.placement]}
                  </span>
                  {ad.target_url && (
                    <a
                      href={ad.target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-400 underline truncate max-w-[140px]"
                    >
                      {ad.target_url}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(ad)}
                  className="p-2 rounded-lg text-primary-300 bg-primary-700/30 hover:bg-primary-700/60 transition-colors"
                  title="Düzenle"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => onToggleActive(ad)}
                  className={`p-2 rounded-lg transition-colors ${ad.is_active ? 'text-success-400 bg-success-500/10' : 'text-primary-400 bg-primary-700/30'}`}
                  title={ad.is_active ? 'Devre Dışı Bırak' : 'Aktif Et'}
                >
                  <Power size={14} />
                </button>
                <button
                  onClick={() => onDelete(ad.id)}
                  className="p-2 rounded-lg text-error-400 bg-error-500/10 hover:bg-error-500/20 transition-colors"
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: number
  icon: LucideIcon
  color: string
}) {
  return (
    <div className="glass-card p-4 text-center">
      <Icon size={24} className={`${color} mx-auto mb-2`} />
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-primary-400 mt-1">{label}</div>
    </div>
  )
}
