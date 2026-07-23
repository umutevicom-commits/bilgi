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

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function pickRandomQuestion(
  questions: Question[],
  difficulty: DifficultyLevel,
  category: string,
  usedIds: Set<string>
): Question | null {
  const active = questions.filter((q) => q.is_active)

  // "karisik" tüm kategorileri kapsar; diğerleri SADECE seçilen kategoriyi.
  const byCategory = category === 'karisik'
    ? active
    : active.filter((q) => q.category === category)

  // 1) Seçilen kategori + seçilen zorluk + daha önce görülmemiş
  let pool = byCategory.filter((q) => q.difficulty === difficulty && !usedIds.has(q.id))
  if (pool.length > 0) return randomPick(pool)

  // 2) Seçilen kategori (zorluk esnetilir) + daha önce görülmemiş.
  //    Kategori sözü burada da korunuyor; sadece zorluk havuzu genişliyor.
  pool = byCategory.filter((q) => !usedIds.has(q.id))
  if (pool.length > 0) return randomPick(pool)

  // 3) Bu kategoride görülmemiş soru tükendi. Oyunun tamamen durmaması
  //    için aynı kategoride, görülmüş de olsa bir soru seçilir — bu, sadece
  //    kategori gerçekten tükendiğinde devreye giren son çaredir.
  if (byCategory.length > 0) return randomPick(byCategory)

  // 4) Seçilen kategoride hiç soru yoksa (çok nadir/yeni kategori), en
  //    azından zorluğa uyan görülmemiş bir soruya düş.
  pool = active.filter((q) => q.difficulty === difficulty && !usedIds.has(q.id))
  if (pool.length > 0) return randomPick(pool)

  pool = active.filter((q) => !usedIds.has(q.id))
  if (pool.length > 0) return randomPick(pool)

  return active.length > 0 ? randomPick(active) : null
}
