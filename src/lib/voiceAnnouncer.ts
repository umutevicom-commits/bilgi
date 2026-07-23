/**
 * Oyunun sesli anlatıcısı ("spiker").
 *
 * MOTOR: Edge TTS (birincil, Microsoft'un ücretsiz nöral sesi) +
 * tarayıcı SpeechSynthesis (güvenli düşme)
 * -----------------------------------------------------------------------
 * NEDEN VibeVoice / Kokoro / Piper / MeloTTS DEĞİL:
 * microsoft/VibeVoice Python + PyTorch + GPU gerektiren ağır bir
 * araştırma modeli. hexgrad/Kokoro-82M tarayıcıda çalışabilse de resmi
 * olarak Türkçe desteklemiyor. MeloTTS de Türkçe desteklemiyor ve
 * yalnızca Python/sunucu tarafında çalışıyor. Piper tarayıcıda
 * çalışabiliyordu ama resmi Türkçe ses deposunda artık tek ("dfki")
 * seçenek kaldı ve nöral kalitesi sınırlı — gerçek insan sesine yakın
 * bir deneyim için yeterli değildi.
 *
 * NEDEN Edge TTS:
 * Microsoft Edge'in "Read Aloud" özelliğinin arkasındaki nöral TTS
 * servisi, key gerektirmeden ücretsiz kullanılabiliyor ve Türkçe için
 * iki gerçekçi ses sunuyor (tr-TR-EmelNeural, tr-TR-AhmetNeural).
 * Microsoft artık bu servise doğrudan tarayıcıdan bağlanmayı sadece
 * kendi Edge tarayıcısıyla sınırladığı için (özel bir WebSocket başlığı
 * gerektiriyor), araya ince bir Supabase Edge Function giriyor
 * (bkz. supabase/functions/tts ve edgeTtsEngine.ts). Proje zaten
 * Supabase kullandığından mimariye yabancı bir bağımlılık eklenmiyor;
 * GitHub Pages tarafı yine statik kalıyor, sadece TTS isteği Supabase'e
 * gidiyor.
 *
 * "SORUNSUZ" NASIL SAĞLANIYOR:
 * Supabase fonksiyonuna ulaşılamazsa (deploy edilmemiş, ağ sorunu vb.)
 * bu dosya otomatik olarak tarayıcının kendi SpeechSynthesis motoruna
 * geçer. Oyuncu asla sessiz kalmaz; bu geçiş kullanıcıya hiçbir ek işlem
 * yaptırmadan, arka planda gerçekleşir.
 */

import {
  primeEdgeTts,
  isEdgeTtsReady,
  enqueueEdgeTts,
  stopEdgeTts,
} from './edgeTtsEngine'

type SpeakOptions = {
  rate?: number
  pitch?: number
}

type QueueItem = {
  text: string
  opts: SpeakOptions
  /** Bu cümlecik bittikten sonra bir sonrakine geçmeden önce beklenecek ms */
  pauseAfter: number
}

const STORAGE_KEY = 'voice_announcer_enabled'

let cachedVoice: SpeechSynthesisVoice | null = null
let voicesReady = false

let speakQueue: QueueItem[] = []
let queueActive = false
let pauseTimer: ReturnType<typeof setTimeout> | null = null

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Bir tr sesine "ne kadar kaliteli/doğal" olabileceğine dair kaba bir puan
 * verir. Bu yalnızca Edge TTS hazır olana kadar (veya Edge TTS hiç
 * kullanılamıyorsa) devrede olan tarayıcı motoru için geçerlidir.
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  const lang = v.lang?.toLowerCase() ?? ''
  let score = 0
  if (lang === 'tr-tr') score += 10
  else if (lang.startsWith('tr')) score += 5
  if (name.includes('natural')) score += 8
  if (name.includes('neural')) score += 7
  if (name.includes('online')) score += 4
  if (name.includes('google')) score += 5
  if (name.includes('microsoft')) score += 3
  if (name.includes('premium') || name.includes('enhanced')) score += 3
  if (name.includes('compact') || name.includes('espeak') || name.includes('lite')) score -= 6
  return score
}

function pickTurkishVoice(): SpeechSynthesisVoice | null {
  if (!isSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const trVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith('tr'))
  if (trVoices.length === 0) return null
  return trVoices.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
}

function ensureVoicesLoaded() {
  if (!isSupported() || voicesReady) return
  const found = pickTurkishVoice()
  if (found) {
    cachedVoice = found
    voicesReady = true
    return
  }
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = pickTurkishVoice()
    voicesReady = true
  }
}

export function isVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true // varsayılan: açık
    return raw === '1'
  } catch {
    return true
  }
}

export function setVoiceEnabled(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // localStorage yoksa sessizce geç
  }
  if (!value) stopSpeaking()
}

/**
 * İlk kullanıcı etkileşiminde (buton tıklaması vb.) çağrılmalı.
 * Tarayıcı sesini anında hazırlar VE Edge TTS fonksiyonunun
 * erişilebilir olup olmadığını arka planda doğrular.
 */
export function primeVoice(): void {
  ensureVoicesLoaded()
  void primeEdgeTts()
}

/** Şu an hangi motorun konuştuğunu/konuşacağını dışa açar (UI için opsiyonel). */
export function currentVoiceEngine(): 'edge' | 'browser' {
  return isEdgeTtsReady() ? 'edge' : 'browser'
}

export function stopSpeaking(): void {
  // Her iki motoru da temizle — hangisi aktifse onu keser, diğeri zaten boştur.
  speakQueue = []
  queueActive = false
  if (pauseTimer !== null) {
    clearTimeout(pauseTimer)
    pauseTimer = null
  }
  if (isSupported()) window.speechSynthesis.cancel()
  stopEdgeTts()
}

// ------------------------------------------------------------
// Tarayıcı motoru: doğal duraklamalı, kuyruk tabanlı konuşma
// (Edge TTS hazır olana kadar veya Edge TTS kullanılamazsa devrede)
// ------------------------------------------------------------

function jitterOpts(opts: SpeakOptions): SpeakOptions {
  const jitter = () => (Math.random() * 2 - 1) * 0.03 // ±%3
  const rate = Math.max(0.6, (opts.rate ?? 1) + jitter())
  const pitch = Math.max(0.5, Math.min(2, (opts.pitch ?? 1) + jitter()))
  return { rate, pitch }
}

function splitIntoClauses(text: string): { text: string; pauseAfter: number }[] {
  const rawChunks = text.match(/[^,;:.!?]+[,;:.!?]*/g) ?? [text]
  const chunks = rawChunks.map((c) => c.trim()).filter(Boolean)

  return chunks.map((chunk, i) => {
    const isLast = i === chunks.length - 1
    if (isLast) return { text: chunk, pauseAfter: 0 }
    const endsSentence = /[.!?]\s*$/.test(chunk)
    const endsClause = /[,;:]\s*$/.test(chunk)
    let pauseAfter = 40
    if (endsSentence) pauseAfter = 260 + Math.random() * 160
    else if (endsClause) pauseAfter = 110 + Math.random() * 90
    return { text: chunk, pauseAfter }
  })
}

function runBrowserQueue(): void {
  if (queueActive || !isSupported() || !isVoiceEnabled()) return
  const next = speakQueue.shift()
  if (!next) return

  queueActive = true
  ensureVoicesLoaded()

  const utter = new SpeechSynthesisUtterance(next.text)
  utter.lang = 'tr-TR'
  utter.rate = next.opts.rate ?? 1
  utter.pitch = next.opts.pitch ?? 1
  if (cachedVoice) utter.voice = cachedVoice

  const advance = () => {
    queueActive = false
    if (next.pauseAfter > 0) {
      pauseTimer = setTimeout(() => {
        pauseTimer = null
        runBrowserQueue()
      }, next.pauseAfter)
    } else {
      runBrowserQueue()
    }
  }
  utter.onend = advance
  utter.onerror = advance

  window.speechSynthesis.speak(utter)
}

function enqueueClauses(text: string, baseOpts: SpeakOptions, leadingPause = 0): void {
  if (!isVoiceEnabled() || !text) return
  if (leadingPause > 0 && speakQueue.length > 0) {
    const tail = speakQueue[speakQueue.length - 1]
    tail.pauseAfter = Math.max(tail.pauseAfter, leadingPause)
  }
  const clauses = splitIntoClauses(text)
  clauses.forEach((c) => {
    speakQueue.push({ text: c.text, opts: jitterOpts(baseOpts), pauseAfter: c.pauseAfter })
  })
  runBrowserQueue()
}

const lastPickIndex = new WeakMap<object, number>()
function pick<T>(arr: T[]): T {
  if (arr.length === 1) return arr[0]
  let idx = Math.floor(Math.random() * arr.length)
  const last = lastPickIndex.get(arr as unknown as object)
  if (idx === last) idx = (idx + 1) % arr.length
  lastPickIndex.set(arr as unknown as object, idx)
  return arr[idx]
}

/**
 * Bir metni "aktif motora" gönderir: Edge TTS hazırsa ona, değilse
 * tarayıcı kuyruğuna. Her iki durumda da aynı imza kullanılır, üst
 * seviye announce* fonksiyonları hangi motorun aktif olduğunu bilmek
 * zorunda kalmaz. Edge TTS, rate/pitch'i gerçek SSML prozodisine
 * çevirdiği için (bkz. edgeTtsEngine.ts) buradaki duygu tonlaması
 * (announceCorrect'te daha yüksek perde, announceWrong'da daha düşük
 * perde vb.) tarayıcı motorunda olduğu gibi sadece oynatma hızını değil,
 * gerçek ses tonunu da etkiler.
 */
function speakUnit(text: string, opts: SpeakOptions, leadingPause = 0): void {
  if (isEdgeTtsReady()) {
    enqueueEdgeTts(text, opts.rate ?? 1, opts.pitch ?? 1, leadingPause)
  } else {
    enqueueClauses(text, opts, leadingPause)
  }
}

// ============================================================
// OYUNA ÖZEL ANLATIM MANTIĞI
// ============================================================

const OPTION_LETTERS_TR = ['A', 'B', 'C', 'D']

/** Yeni soru geldiğinde: önce soruyu, sonra sırayla A/B/C/D şıklarını okur. */
export function announceQuestion(questionText: string, options: string[]): void {
  if (!isVoiceEnabled()) return
  stopSpeaking()
  speakUnit(questionText, { rate: 0.98 })
  options.forEach((opt, i) => {
    // Her şıktan önce küçük bir "beat" bırak — art arda makine gibi
    // sıralanmasın, spiker sırayla okuyup düşünüyormuş gibi hissettirsin.
    speakUnit(`${OPTION_LETTERS_TR[i]} şıkkı: ${opt}`, { rate: 1.02 }, 320 + Math.random() * 160)
  })
}

const URGENT_10 = [
  'On saniye kaldı, biraz acele edelim.',
  'Süre azalıyor, dikkatli ol.',
  'On saniyen kaldı, karar zamanı yaklaşıyor.',
]

const URGENT_5 = [
  'Beş saniye kaldı, çabuk bir karar ver!',
  'Süre neredeyse bitti, hadi!',
  'Son beş saniye, seç artık!',
]

/**
 * Süre azaldıkça çağrılmalı. Sadece 10. ve 5. saniyede konuşur — her
 * saniyede bir yorum yapmaz, aksi halde soruyu okumasıyla üst üste biner
 * ve rahatsız edici olur.
 */
export function announceUrgent(secondsLeft: number): void {
  if (secondsLeft === 10) {
    stopSpeaking()
    speakUnit(pick(URGENT_10), { rate: 1.05, pitch: 1.05 })
  } else if (secondsLeft === 5) {
    stopSpeaking()
    speakUnit(pick(URGENT_5), { rate: 1.15, pitch: 1.15 })
  }
}

const CORRECT_BASE = [
  'Doğru! Aferin sana.',
  'Bildin! Harika gidiyorsun.',
  'Doğru cevap, tebrikler.',
  'İşte bu! Tam isabet.',
]
const CORRECT_STREAK_3 = [
  'Üst üste üçüncü doğru! Gerçekten iyisin.',
  'Harika bir seri yakaladın, böyle devam et!',
]
const CORRECT_STREAK_HIGH = [
  'Bu ne performans! Durdurulamıyor gibisin.',
  'İnanılmaz bir seri yakaladın, tam bir yarışma canavarısın!',
  'Art arda bu kadar doğru... Gerçekten etkileyicisin.',
]

/** Doğru cevaptan sonra: seriye (streak) göre farklı tonda tebrik eder. */
export function announceCorrect(streak: number, points: number): void {
  let phrase: string
  if (streak >= 6) phrase = pick(CORRECT_STREAK_HIGH)
  else if (streak >= 3) phrase = pick(CORRECT_STREAK_3)
  else phrase = pick(CORRECT_BASE)
  stopSpeaking()
  speakUnit(`${phrase} ${points} puan kazandın.`, { rate: 1.05, pitch: 1.1 })
}

const WRONG_PHRASES = [
  'Yazık oldu, doğru cevap bu değildi.',
  'Bu sefer olmadı, üzülme.',
  'Ne yazık ki yanlış, ama pes etme.',
  'Olsun, bir dahaki soruda telafi edersin.',
]

const TIMEOUT_PHRASES = [
  'Süre doldu, biraz daha hızlı olmalısın.',
  'Zamanı kaçırdın, bir dahakine daha çabuk davran.',
  'Yetişemedin, ama sorun değil, devam edelim.',
]

/** Yanlış cevap: üzülür, kısa bir nefes bırakır, sonra doğru cevabı söyler. */
export function announceWrong(correctAnswerText: string): void {
  stopSpeaking()
  speakUnit(pick(WRONG_PHRASES), { rate: 0.97, pitch: 0.92 })
  speakUnit(`Doğru cevap: ${correctAnswerText}`, { rate: 0.97, pitch: 0.92 }, 260 + Math.random() * 140)
}

/** Süre doldu: yanlıştan farklı bir tonda üzülür, sonra doğru cevabı söyler. */
export function announceTimeout(correctAnswerText: string): void {
  stopSpeaking()
  speakUnit(pick(TIMEOUT_PHRASES), { rate: 0.97, pitch: 0.9 })
  speakUnit(`Doğru cevap: ${correctAnswerText}`, { rate: 0.97, pitch: 0.9 }, 260 + Math.random() * 140)
}

const END_HIGH = [
  'Muhteşem bir oyun çıkardın, seni tebrik ederim!',
  'Bugün gerçekten harikaydın, bu skor çok etkileyici.',
]
const END_MID = [
  'Fena değil, biraz daha pratikle çok daha iyi olacaksın.',
  'İyi bir oyundu, tebrikler.',
]
const END_LOW = [
  'Bu sefer olmadı ama pes etme, bir dahaki sefere daha iyi olacak.',
  'Herkesin kötü günü olur, tekrar denemeye ne dersin?',
]

/** Oyun bittiğinde: skora göre farklı tonda genel bir değerlendirme yapar. */
export function announceGameEnd(points: number, questionsAnswered: number): void {
  let phrase: string
  if (points >= 300 || questionsAnswered >= 8) phrase = pick(END_HIGH)
  else if (points >= 100 || questionsAnswered >= 4) phrase = pick(END_MID)
  else phrase = pick(END_LOW)
  stopSpeaking()
  speakUnit('Oyun bitti.', { rate: 1 })
  speakUnit(phrase, { rate: 1 }, 180 + Math.random() * 100)
  speakUnit(`Toplam ${points} puan topladın.`, { rate: 1 }, 220 + Math.random() * 120)
}
