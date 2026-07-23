/**
 * Edge TTS — Microsoft'un ücretsiz, key gerektirmeyen nöral ses motoru
 * ("Read Aloud" özelliğinin arkasındaki aynı motor). Piper'ın yerini aldı
 * çünkü Piper'ın Türkçe modeli tek ("dfki") ve nöral kalitesi Edge'in
 * gerçek insan sesine yaklaşan kalitesinin gerisinde kalıyor.
 *
 * NEDEN DOĞRUDAN TARAYICIDAN ÇAĞRILAMIYOR:
 * Microsoft'un servisi artık özel bir WebSocket başlığı istiyor
 * (Sec-WebSocket-Version) ve tarayıcıların WebSocket API'si bu başlığı
 * elle ayarlamaya izin vermiyor — sadece Microsoft'un kendi Edge
 * tarayıcısı bu bağlantıyı kurabiliyor. Bu yüzden aradaki köprüyü ince
 * bir Supabase Edge Function (bkz. supabase/functions/tts) üstleniyor:
 * biz ona metni POST ediyoruz, o Deno ortamında Microsoft'a bağlanıp
 * mp3 üretip bize dönüyor.
 *
 * GÜVENLİ DÜŞME (fallback):
 * Fonksiyon deploy edilmemişse, ortam değişkenleri eksikse ya da ağ
 * isteği başarısız olursa, bu dosya `failed` durumuna geçer ve
 * `voiceAnnouncer.ts` otomatik olarak tarayıcının SpeechSynthesis
 * motoruna döner — oyuncu hiçbir zaman sessiz kalmaz.
 */

import { supabase, isSupabaseConfigured } from './supabase'

export const EDGE_TTS_VOICE_ID = 'tr-TR-EmelNeural'

type ReadyState = 'idle' | 'ready' | 'failed'
let readyState: ReadyState = 'idle'

export function isEdgeTtsReady(): boolean {
  return readyState !== 'failed' && isSupabaseConfigured
}

export function edgeTtsState(): ReadyState {
  return readyState
}

/**
 * Piper'daki primePiper()'ın karşılığı. Burada indirilecek bir model
 * yok — sadece Supabase yapılandırmasının var olduğunu doğruluyoruz.
 * Gerçek erişilebilirlik ilk konuşma denemesinde anlaşılır; başarısız
 * olursa `readyState` 'failed' olur ve bir daha denenmez (o oturum
 * boyunca tarayıcı sesine geçilir).
 */
export function primeEdgeTts(): Promise<boolean> {
  readyState = isSupabaseConfigured ? 'ready' : 'failed'
  return Promise.resolve(readyState === 'ready')
}

// ------------------------------------------------------------
// Ses/hız/perde eşlemesi — voiceAnnouncer.ts'nin kullandığı basit
// `rate`/`pitch` (0.6–1.3 arası, 1 = normal) değerlerini Edge TTS'in
// beklediği SSML tipi yüzde/Hz string'lerine çevirir.
// ------------------------------------------------------------

function toRatePercent(rate: number): string {
  const pct = Math.round((rate - 1) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function toPitchHz(pitch: number): string {
  // pitch=1 => 0Hz, her 0.1 birim ~15Hz kaydırır (makul, aşırıya kaçmayan bir aralık)
  const hz = Math.round((pitch - 1) * 150)
  return `${hz >= 0 ? '+' : ''}${hz}Hz`
}

// ------------------------------------------------------------
// Sıralı oynatma kuyruğu — piperEngine.ts ile aynı mantık: cümleleri
// art arda, aralarında doğal bir boşlukla çalar.
// ------------------------------------------------------------

type QueueItem = { text: string; rate: number; pitch: number; pauseAfter: number }

let queue: QueueItem[] = []
let active = false
let currentAudio: HTMLAudioElement | null = null
let pauseTimer: ReturnType<typeof setTimeout> | null = null

export function stopEdgeTts(): void {
  queue = []
  active = false
  if (pauseTimer !== null) {
    clearTimeout(pauseTimer)
    pauseTimer = null
  }
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
}

function advance(pauseAfter: number): void {
  active = false
  currentAudio = null
  if (pauseAfter > 0) {
    pauseTimer = setTimeout(() => {
      pauseTimer = null
      void playNext()
    }, pauseAfter)
  } else {
    void playNext()
  }
}

async function synthesize(text: string, rate: number, pitch: number): Promise<Blob> {
  const { data: sessionData } = await supabase.auth.getSession()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const token = sessionData.session?.access_token ?? anonKey ?? ''
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
  if (!baseUrl) throw new Error('VITE_SUPABASE_URL tanımlı değil')

  const res = await fetch(`${baseUrl}/functions/v1/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey ?? '',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text,
      voice: EDGE_TTS_VOICE_ID,
      rate: toRatePercent(rate),
      pitch: toPitchHz(pitch),
    }),
  })

  if (!res.ok) throw new Error(`tts fonksiyonu ${res.status} döndü`)
  return res.blob()
}

async function playNext(): Promise<void> {
  if (active) return
  const next = queue.shift()
  if (!next) return
  active = true

  try {
    const blob = await synthesize(next.text, next.rate, next.pitch)
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    audio.onended = () => {
      URL.revokeObjectURL(url)
      advance(next.pauseAfter)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      advance(0)
    }
    await audio.play()
  } catch (err) {
    console.warn(
      '[edgeTtsEngine] Sentez başarısız, bu oturum için tarayıcı sesine geçiliyor.',
      err
    )
    readyState = 'failed'
    queue = []
    active = false
    return
  }
}

/**
 * Bir metni kuyruğa ekler. `rate`/`pitch`: 1 = normal (voiceAnnouncer.ts
 * ile aynı ölçek). `leadingPause`: bu metinden önce bırakılacak boşluk (ms).
 */
export function enqueueEdgeTts(
  text: string,
  rate = 1,
  pitch = 1,
  leadingPause = 0
): void {
  if (!text) return
  if (leadingPause > 0 && queue.length > 0) {
    const tail = queue[queue.length - 1]
    tail.pauseAfter = Math.max(tail.pauseAfter, leadingPause)
  }
  queue.push({ text, rate, pitch, pauseAfter: 0 })
  void playNext()
}
