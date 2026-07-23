/**
 * Vibration API için güvenli, özellik algılamalı sarmalayıcı.
 * API desteklenmiyorsa (ör. masaüstü tarayıcılar, iOS Safari) sessizce
 * hiçbir şey yapmaz; hata fırlatmaz.
 */
function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** Geri sayımın son saniyelerinde her tık için kısa, hafif bir titreşim. */
export function vibrateTick() {
  if (!canVibrate()) return
  try {
    navigator.vibrate(40)
  } catch {
    // yoksay
  }
}

/** Süre dolduğunda daha belirgin, çift darbeli bir titreşim deseni. */
export function vibrateTimeUp() {
  if (!canVibrate()) return
  try {
    navigator.vibrate([90, 60, 90, 60, 160])
  } catch {
    // yoksay
  }
}
