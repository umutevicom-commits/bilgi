// supabase/functions/tts/index.ts
//
// Microsoft Edge'in ücretsiz, key gerektirmeyen nöral TTS servisine
// ("Read Aloud" arkasındaki motor) köprü. Tarayıcı doğrudan bu servise
// bağlanamıyor çünkü Microsoft artık özel bir WebSocket başlığı
// (Sec-WebSocket-Version) istiyor ve bunu sadece kendi Edge tarayıcısından
// gelen bağlantılarda kabul ediyor. Deno gibi sunucu ortamları bu kısıtla
// karşılaşmıyor — bu yüzden bu fonksiyon Deno üzerinde (Supabase Edge
// Functions) çalışıyor ve tarayıcı için basit bir "metin gönder, mp3 al"
// arayüzüne dönüştürüyor.
//
// LİSANS NOTU: `@edge-tts/universal` paketi AGPL-3.0-or-later lisanslıdır.
// AGPL, yazılımın bir ağ servisi olarak sunulması durumunda kaynak kodun
// kullanıcılara açık tutulmasını şart koşar. Bu fonksiyonu prod'a
// alırken bunu göz önünde bulundurun.
//
// DEPLOY: supabase functions deploy tts
// (Ekstra ortam değişkeni gerekmez; Microsoft servisi key istemiyor.)

import { Communicate } from 'jsr:@edge-tts/universal@^1.4.0'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEFAULT_VOICE = 'tr-TR-EmelNeural'
const MAX_CHARS = 600

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed')
  }

  let body: { text?: unknown; voice?: unknown; rate?: unknown; pitch?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'invalid_json')
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const voice = typeof body.voice === 'string' && body.voice ? body.voice : DEFAULT_VOICE
  const rate = typeof body.rate === 'string' ? body.rate : '+0%'
  const pitch = typeof body.pitch === 'string' ? body.pitch : '+0Hz'

  if (!text) return jsonError(400, 'text_required')
  if (text.length > MAX_CHARS) return jsonError(400, 'text_too_long', { max: MAX_CHARS })

  try {
    const communicate = new Communicate(text, { voice, rate, pitch })
    const chunks: Uint8Array[] = []

    for await (const chunk of communicate.stream()) {
      if (chunk.type === 'audio' && chunk.data) chunks.push(chunk.data)
    }

    if (chunks.length === 0) throw new Error('no_audio_received')

    const total = chunks.reduce((sum, c) => sum + c.length, 0)
    const audio = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      audio.set(c, offset)
      offset += c.length
    }

    return new Response(audio, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[tts] sentez başarısız:', err)
    return jsonError(502, 'synthesis_failed')
  }
})
