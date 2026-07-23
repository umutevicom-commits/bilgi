import type { Question, DifficultyLevel } from '../types'

const QUESTIONS_URL = '/data/questions.json'

let cachedQuestions: Question[] | null = null

export async function loadQuestions(): Promise<Question[]> {
  if (cachedQuestions) return cachedQuestions

  try {
    const res = await fetch(QUESTIONS_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const questions = Array.isArray(data) ? data : data.questions || []
    cachedQuestions = questions as Question[]
    return cachedQuestions
  } catch (err) {
    console.error('Soru havuzu yüklenemedi:', err)
    return []
  }
}

export function pickRandomQuestion(
  questions: Question[],
  difficulty: DifficultyLevel,
  category: string,
  usedIds: Set<string>
): Question | null {
  let pool = questions.filter(
    (q) => q.is_active && q.difficulty === difficulty
  )

  if (category !== 'karisik') {
    const filtered = pool.filter((q) => q.category === category)
    if (filtered.length > 0) pool = filtered
  }

  const available = pool.filter((q) => !usedIds.has(q.id))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }

  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const anyActive = questions.filter((q) => q.is_active)
  if (anyActive.length > 0) {
    return anyActive[Math.floor(Math.random() * anyActive.length)]
  }

  return null
}
