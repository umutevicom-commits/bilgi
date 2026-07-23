/**
 * Hafif Web Audio API ses efektleri.
 *
 * Harici ses dosyası (mp3/wav) indirmeye/paketlemeye gerek kalmadan,
 * osilatör tabanlı kısa "tick" ve "süre bitti" sesleri üretir. Tek bir
 * AudioContext lazy olarak (ilk kullanıcı etkileşiminde) oluşturulur ve
 * yeniden kullanılır; bu da hem performanslı hem de tarayıcıların
 * "otomatik ses çalma" kısıtlamalarıyla uyumludur.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtor) return null

  if (!audioCtx) {
    audioCtx = new AudioCtor()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playTone(
  ctx: AudioContext,
  { frequency, start, duration, type = 'sine', peakGain = 0.18 }:
  { frequency: number; start: number; duration: number; type?: OscillatorType; peakGain?: number }
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + start)

  // Kısa "pluck" zarfı: ani atak, yumuşak sönüş (kulağa tık/uyarı gibi gelir,
  // çıt sesi/patlama olmaz).
  gain.gain.setValueAtTime(0, ctx.currentTime + start)
  gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration + 0.02)
}

/** Geri sayımın son 10 saniyesinde her saniye çalınan kısa "tick" sesi. */
export function playTick() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    playTone(ctx, { frequency: 880, start: 0, duration: 0.09, type: 'square', peakGain: 0.14 })
  } catch {
    // Sessiz geç: ses efekti oyunun işlevselliği için kritik değildir.
  }
}

/** Süre dolduğunda çalınan, tick'ten belirgin şekilde farklı uyarı sesi. */
export function playTimeUp() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    playTone(ctx, { frequency: 523.25, start: 0, duration: 0.16, type: 'sawtooth', peakGain: 0.2 })
    playTone(ctx, { frequency: 392.0, start: 0.14, duration: 0.16, type: 'sawtooth', peakGain: 0.2 })
    playTone(ctx, { frequency: 261.63, start: 0.28, duration: 0.32, type: 'sawtooth', peakGain: 0.22 })
  } catch {
    // Sessiz geç.
  }
}

/** İlk kullanıcı etkileşiminde AudioContext'i "kilidini açmak" için çağrılabilir. */
export function primeAudio() {
  getAudioContext()
}
