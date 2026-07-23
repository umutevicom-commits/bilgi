/**
 * Piper TTS — tamamen tarayıcıda (WebAssembly + ONNX Runtime Web) çalışan,
 * sunucu/GPU gerektirmeyen nöral Türkçe ses motoru.
 *
 * Kullanılan paket: @mintplex-labs/piper-tts-web
 * Model dosyaları ilk kullanımda Hugging Face üzerinden indirilip
 * tarayıcının Origin Private File System'inde (OPFS) önbelleğe alınır;
 * bir sonraki ziyarette anında hazırdır.
 *
 * ÖNEMLİ — GitHub Pages kısıtı:
 * GitHub Pages özel HTTP başlıkları (COOP/COEP) gönderemediği için
 * SharedArrayBuffer tabanlı çoklu-iş-parçacıklı WASM kullanılamıyor.
 * Bu yüzden onnxruntime-web'i tek iş parçacıklı modda çalışacak şekilde
 * ayarlıyoruz — biraz daha yavaş ama her ortamda güvenilir şekilde çalışır.
 *
 * GÜVENLİ DÜŞME (fallback):
 * Model indirilemezse, WASM desteklenmiyorsa ya da OPFS yoksa (örn. eski
 * bir tarayıcı) `primePiper()` false döner ve `voiceAnnouncer.ts` otomatik
 * olarak tarayıcının kendi SpeechSynthesis motoruna geri düşer — oyuncu
 * hiçbir zaman sessiz kalmaz.
 */

import * as tts from '@mintplex-labs/piper-tts-web'
import { env as ortEnv } from 'onnxruntime-web'

// Bkz. yukarıdaki not: GitHub Pages'te COOP/COEP olmadığı için tek thread.
try {
  ortEnv.wasm.numThreads = 1
} catch {
  // onnxruntime-web henüz hazır değilse sessizce geç, varsayılanla devam eder
}

/**
 * Türkçe için Piper'ın resmi ses deposunda (huggingface.co/rhasspy/piper-voices)
 * hâlâ mevcut olan TEK "medium" kalite ses: dfki.
 *
 * NOT: Daha önce burada `tr_TR-fahrettin-medium` kullanılıyordu, ancak
 * fahrettin ve fettah sesleri katkıda bulunanların talebiyle depodan
 * kaldırıldı (bkz. rhasspy/piper-voices commit "Remove fahrettin and
 * fettah voices at request of contributors"). O ID artık indirilemiyor;
 * `tts.download()` 404 ile başarısız oluyor, `primePiper()` her zaman
 * `false` dönüyor ve uygulama sessizce tarayıcının SpeechSynthesis
 * motoruna düşüyordu — yani gerçek Piper sesi hiç duyulmuyordu. dfki şu an
 * için tek çalışan seçenek olduğundan bu bir A/B tercihi değil, doğrudan
 * bir düzeltmedir.
 */
export const PIPER_VOICE_ID = 'tr_TR-dfki-medium'

export type PiperProgress = { url: string; loaded: number; total: number }

type ReadyState = 'idle' | 'loading' | 'ready' | 'failed'
let readyState: ReadyState = 'idle'
let readyPromise: Promise<boolean> | null = null

export function isPiperReady(): boolean {
  return readyState === 'ready'
}

export function piperState(): ReadyState {
  return readyState
}

/**
 * Modeli hazırlar (indirir ya da önbellekten anında yükler). Birden fazla
 * kez çağrılsa bile tek bir indirme başlatılır. Başarısız olursa `false`
 * döner; çağıran taraf (voiceAnnouncer) bu durumda tarayıcı TTS'ine düşer.
 */
export function primePiper(onProgress?: (p: PiperProgress) => void): Promise<boolean> {
  if (readyPromise) return readyPromise

  if (typeof window === 'undefined' || typeof WebAssembly === 'undefined') {
    readyState = 'failed'
    return Promise.resolve(false)
  }

  readyState = 'loading'
  readyPromise = (async () => {
    try {
      const stored = await tts.stored()
      if (!stored.includes(PIPER_VOICE_ID)) {
        await tts.download(PIPER_VOICE_ID, (p: PiperProgress) => onProgress?.(p))
      }
      readyState = 'ready'
      return true
    } catch (err) {
      console.warn(
        '[piperEngine] Piper sesi yüklenemedi, tarayıcının kendi sesine geri dönülüyor.',
        err
      )
      readyState = 'failed'
      return false
    }
  })()

  return readyPromise
}

// ------------------------------------------------------------
// Sıralı oynatma kuyruğu — birden fazla cümleyi art arda, aralarında
// doğal bir "nefes" boşluğuyla çalar. Piper/VITS noktalama işaretlerine
// göre kendi içinde zaten doğal duraklama üretir; biz sadece ayrı
// anonsları (soru → şıklar gibi) birbirine bağlıyoruz.
// ------------------------------------------------------------

type QueueItem = { text: string; rate: number; pauseAfter: number }

let queue: QueueItem[] = []
let active = false
let currentAudio: HTMLAudioElement | null = null
let pauseTimer: ReturnType<typeof setTimeout> | null = null

export function stopPiper(): void {
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

async function playNext(): Promise<void> {
  if (active) return
  const next = queue.shift()
  if (!next) return
  active = true

  try {
    const wav = await tts.predict({ text: next.text, voiceId: PIPER_VOICE_ID })
    const url = URL.createObjectURL(wav)
    const audio = new Audio(url)
    audio.playbackRate = next.rate
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
    console.warn('[piperEngine] Bir cümle seslendirilemedi, sıradakiyle devam ediliyor.', err)
    advance(0)
  }
}

/**
 * Bir metni kuyruğa ekler. `rate`: 1 = normal hız (~0.9–1.15 arası doğal
 * kalır). `leadingPause`: bu metinden önce, kuyrukta bekleyen bir önceki
 * parçadan sonra bırakılacak ekstra boşluk (ms).
 */
export function enqueuePiper(text: string, rate = 1, leadingPause = 0): void {
  if (!text) return
  if (leadingPause > 0 && queue.length > 0) {
    const tail = queue[queue.length - 1]
    tail.pauseAfter = Math.max(tail.pauseAfter, leadingPause)
  }
  queue.push({ text, rate, pauseAfter: 0 })
  void playNext()
}
