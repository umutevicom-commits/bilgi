// Bir kullanıcıya gösterilen sorular, tarayıcı bazında kalıcı olarak burada
// tutulur. Amaç: "bir soru bir kez çıktıysa bir daha çıkmasın" isteği —
// sadece o oyun oturumunda değil, tüm oturumlar/oyunlar boyunca.
//
// Not: Supabase'de bunun için bir `user_seen_questions` tablosu zaten var
// (bkz. supabase/migrations/20260723090000_user_seen_questions.sql), ancak
// questions.json (GitHub Pages üzerindeki statik havuz) id'leri gerçek UUID
// olmadığından ("matematik-zor-1721...-a8f3" gibi) o tabloya doğrudan
// yazılamıyor — question_id kolonu `uuid REFERENCES questions(id)` olarak
// tanımlı ve artık kullanılmayan eski (Supabase tablo tabanlı) soru
// mimarisine ait. Bu yüzden şimdilik daha basit ve güvenilir olan
// localStorage tabanlı bir çözüm kullanıyoruz. Supabase tablosunu JSON
// mimarisiyle uyumlu hale getirmek istenirse ayrı bir migration ile
// question_id kolonu text'e çevrilip FK kaldırılmalı.

const STORAGE_PREFIX = 'seen_questions:'
// Tek bir kullanıcının localStorage'ı sınırsız büyümesin diye üst sınır.
const MAX_STORED = 3000

function storageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}${userId || 'guest'}`
}

export function loadSeenQuestions(userId: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    // localStorage kullanılamıyorsa (gizli mod, izin reddi vb.) sessizce
    // boş bir set dönüyoruz; oyun yine de oynanabilir olsun.
    return new Set()
  }
}

export function markQuestionSeen(userId: string | null, questionId: string): void {
  try {
    const key = storageKey(userId)
    const raw = localStorage.getItem(key)
    const arr: string[] = raw ? JSON.parse(raw) : []
    if (arr.includes(questionId)) return
    arr.push(questionId)
    const trimmed = arr.length > MAX_STORED ? arr.slice(arr.length - MAX_STORED) : arr
    localStorage.setItem(key, JSON.stringify(trimmed))
  } catch {
    // yok say
  }
}
