export interface Profile {
  id: string
  username: string
  full_name: string | null
  gender: 'male' | 'female' | 'other'
  avatar_url: string | null
  total_points: number
  best_score: number
  games_played: number
  is_banned: boolean
  is_admin: boolean
  is_online: boolean
  last_seen: string
  created_at: string
  updated_at: string
}

export interface GameSession {
  id: string
  user_id: string
  category: string
  difficulty_index: number
  current_question_number: number
  current_points: number
  lifelines_used: {
    fifty_fifty: boolean
    phone: boolean
    audience: boolean
  }
  status: 'active' | 'break' | 'finished'
  started_at: string
  paused_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  category: string
  difficulty: 'kolay' | 'orta' | 'zor' | 'cok_zor' | 'profesyonel'
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string | null
  source_url: string | null
  source_title: string | null
  is_active: boolean
  created_at: string
}

export interface Score {
  id: string
  user_id: string
  score: number
  category: string
  questions_answered: number
  created_at: string
}

export interface Ad {
  id: string
  placement: 'home' | 'game_top' | 'game_bottom' | 'sidebar'
  title: string | null
  content_html: string | null
  image_url: string | null
  target_url: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SiteSetting {
  id: string
  key: string
  value: string
  updated_by: string | null
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  is_active: boolean
  display_order: number
  created_at: string
}

export type DifficultyLevel = 'kolay' | 'orta' | 'zor' | 'cok_zor' | 'profesyonel'

export const DIFFICULTY_ORDER: DifficultyLevel[] = [
  'kolay',
  'orta',
  'zor',
  'cok_zor',
  'profesyonel',
]

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  kolay: 'Kolay',
  orta: 'Orta',
  zor: 'Zor',
  cok_zor: 'Çok Zor',
  profesyonel: 'Profesyonel',
}

export const DIFFICULTY_POINTS: Record<DifficultyLevel, number> = {
  kolay: 10,
  orta: 20,
  zor: 30,
  cok_zor: 50,
  profesyonel: 100,
}

export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  kolay: 'text-success-400',
  orta: 'text-primary-300',
  zor: 'text-accent-400',
  cok_zor: 'text-warning-400',
  profesyonel: 'text-error-400',
}
