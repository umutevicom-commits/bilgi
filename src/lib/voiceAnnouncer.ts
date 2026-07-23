/**
 * Tarayıcı yerleşik SpeechSynthesis (Web Speech API) tabanlı Türkçe sesli
 * anlatıcı ("spiker").
 *
 * NEDEN VibeVoice DEĞİL:
 * microsoft/VibeVoice, Python + PyTorch + GPU gerektiren, "podcast tarzı"
 * uzun-form ses üretimi için tasarlanmış ağır bir araştırma modelidir.
 * Bu proje statik bir React/Vite uygulaması olarak GitHub Pages üzerinde
 * çalışıyor — arkasında sunucu/GPU yok. VibeVoice'u kullanmak, oyunun her
 * "soru okundu / süre azaldı / doğru bildin" anında ayrı bir sunucuya istek
 * atıp saniyeler süren bir model çalıştırmak anlamına gelirdi; bu da hem
 * maliyetli hem de bir yarışma oyunu için gereğinden yavaş olurdu. Ayrıca
 * VibeVoice'un Türkçe desteği resmi olarak garanti edilmiyor.
 *
 * Bunun yerine tarayıcının kendi `speechSynthesis` motorunu kullanıyoruz:
 * - Ek sunucu/GPU gerektirmez, tamamen ücretsizdir
 * - Modern tarayıcılarda (Chrome, Edge, Safari) tr-TR sesi hazır gelir
 * - Gecikmesi neredeyse sıfırdır (oyunun akışını bozmaz)
 */

type SpeakOptions = {
  rate?: number
  pitch?: number
}

const STORAGE_KEY = 'voice_announcer_enabled'

let cachedVoice: SpeechSynthesisVoice | null = null
let voicesReady = false

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickTurkishVoice(): SpeechSynthesisVoice | null {
  if (!isSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  return (
    voices.find((v) => v.lang?.toLowerCase() === 'tr-tr') ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('tr')) ||
    null
  )
}

/**
 * Tarayıcılarda ses listesi (voices) genelde ASENKRON yüklenir. İlk
 * çağrıda boş dönebilir; bu yüzden hem hemen denemeyi hem de
 * `onvoiceschanged` olayını dinlemeyi birlikte yapıyoruz.
 */
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

/** İlk kullanıcı etkileşiminde (buton tıklaması vb.) çağrılmalı. */
export function primeVoice(): void {
  ensureVoicesLoaded()
}

export function stopSpeaking(): void {
  if (isSupported()) window.speechSynthesis.cancel()
}

function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSupported() || !isVoiceEnabled() || !text) return
  ensureVoicesLoaded()

  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'tr-TR'
  utter.rate = opts.rate ?? 1
  utter.pitch = opts.pitch ?? 1
  if (cachedVoice) utter.voice = cachedVoice
  window.speechSynthesis.speak(utter)
}

/** Önce o ana kadar kuyruktaki/okunan her şeyi keser, sonra yenisini okur. */
function interruptAndSpeak(text: string, opts: SpeakOptions = {}): void {
  stopSpeaking()
  speak(text, opts)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ============================================================
// OYUNA ÖZEL ANLATIM MANTIĞI
// ============================================================

const OPTION_LETTERS_TR = ['A', 'B', 'C', 'D']

/** Yeni soru geldiğinde: önce soruyu, sonra sırayla A/B/C/D şıklarını okur. */
export function announceQuestion(questionText: string, options: string[]): void {
  if (!isVoiceEnabled()) return
  stopSpeaking()
  speak(questionText, { rate: 0.98 })
  options.forEach((opt, i) => {
    speak(`${OPTION_LETTERS_TR[i]} şıkkı: ${opt}`, { rate: 1.02 })
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
  if (secondsLeft === 10) interruptAndSpeak(pick(URGENT_10), { rate: 1.05, pitch: 1.05 })
  else if (secondsLeft === 5) interruptAndSpeak(pick(URGENT_5), { rate: 1.15, pitch: 1.15 })
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
  interruptAndSpeak(`${phrase} ${points} puan kazandın.`, { rate: 1.05, pitch: 1.1 })
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

/** Yanlış cevap: üzülür ve doğru cevabı söyler. */
export function announceWrong(correctAnswerText: string): void {
  interruptAndSpeak(`${pick(WRONG_PHRASES)} Doğru cevap: ${correctAnswerText}`, { rate: 0.97, pitch: 0.92 })
}

/** Süre doldu: yanlıştan farklı bir tonda üzülür ve doğru cevabı söyler. */
export function announceTimeout(correctAnswerText: string): void {
  interruptAndSpeak(`${pick(TIMEOUT_PHRASES)} Doğru cevap: ${correctAnswerText}`, { rate: 0.97, pitch: 0.9 })
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
  interruptAndSpeak(`Oyun bitti. ${phrase} Toplam ${points} puan topladın.`, { rate: 1 })
}
