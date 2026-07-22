import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const USER_AGENT = 'KimMilyonerBot/3.0 (+https://kimmilyoner.eu.cc; educational quiz generator)'
const WIKI_API = 'https://tr.wikipedia.org/api/rest_v1/page/summary/'
const WIKI_SEARCH_API = 'https://tr.wikipedia.org/w/api.php'
const WIKI_RANDOM_API = 'https://tr.wikipedia.org/api/rest_v1/page/random/summary'

// ============================================
// KATEGORİ / KONU HAVUZU (derinlemesine tarama için genişletildi)
// ============================================
const CATEGORIES = [
  {
    slug: 'genel-kultur',
    topics: [
      'Türkiye', 'Osmanlı İmparatorluğu', 'Mustafa Kemal Atatürk', 'İstanbul', 'Ankara',
      'Türk kültürü', 'Sanat', 'Müzik', 'Türk edebiyatı', 'Sinema', 'Tiyatro',
      'Nazım Hikmet', 'Yaşar Kemal', 'Orhan Pamuk', 'Türk mutfağı', 'Halk müziği',
      'Geleneksel Türk sanatları', 'Mimar Sinan', 'Türk halk oyunları',
    ],
  },
  {
    slug: 'matematik',
    topics: [
      'Matematik', 'Geometri', 'Cebir', 'Trigonometri', 'İstatistik', 'Olasılık',
      'Sayı teorisi', 'Kalkülüs', 'Pisagor teoremi', 'Asal sayı', 'Fibonacci dizisi',
      'Pi sayısı', 'Küme teorisi', 'Fonksiyon (matematik)', 'Logaritma',
    ],
  },
  {
    slug: 'guncel',
    topics: [
      'Teknoloji', 'Yapay zeka', 'Sosyal medya', 'İnternet', 'Uzay teknolojisi',
      'Akıllı telefon', 'Elektrikli araç', 'Kripto para', 'Bulut bilişim',
      'Siber güvenlik', 'Nesnelerin interneti', 'SpaceX', 'NASA', '5G',
    ],
  },
  {
    slug: 'ehliyet',
    topics: [
      'Trafik kuralları', 'Sürücü belgesi', 'Kara yolları', 'Trafik işaretleri',
      'Trafik kazası', 'Emniyet kemeri', 'Hız sınırı', 'Trafik ışığı',
      'Motorlu taşıt', 'Karayolu Trafik Kanunu',
    ],
  },
  {
    slug: 'cografya',
    topics: [
      'Coğrafya', 'Dünya', 'Kıta', 'Okyanus', 'Nehir', 'Dağ', 'Göl', 'Çöl',
      'Everest Dağı', 'Nil Nehri', 'Amazon Yağmur Ormanları', 'Sahra Çölü',
      'Akdeniz', 'Karadeniz', 'Marmara Denizi', 'Toros Dağları', 'Anadolu',
      'İklim', 'Volkan', 'Deprem',
    ],
  },
  {
    slug: 'fen',
    topics: [
      'Fizik', 'Kimya', 'Biyoloji', 'Astronomi', 'Evrim', 'Genetik', 'Hücre',
      'DNA', 'Atom', 'Enerji', 'Yerçekimi', 'Güneş Sistemi', 'Fotosentez',
      'Elektrik', 'Manyetizma', 'Termodinamik', 'Periyodik tablo', 'Işık',
      'Kuantum mekaniği', 'Albert Einstein', 'Isaac Newton', 'Charles Darwin',
    ],
  },
  {
    slug: 'tarih',
    topics: [
      'Tarih', 'Antik Roma', 'Antik Yunan', 'İkinci Dünya Savaşı', 'Birinci Dünya Savaşı',
      'Soğuk Savaş', 'Rönesans', 'Sanayi Devrimi', 'Fransız Devrimi', 'Mısır Piramitleri',
      'Bizans İmparatorluğu', 'İpek Yolu', 'Selçuklu Devleti', 'Cengiz Han',
      'Kurtuluş Savaşı', 'Cumhuriyetin ilanı',
    ],
  },
  {
    slug: 'lgs',
    topics: [
      'Matematik', 'Fen bilimleri', 'Türkçe', 'İnkılap tarihi ve Atatürkçülük',
      'İngilizce', 'Din kültürü ve ahlak bilgisi', 'Hücre bölünmesi', 'Kuvvet ve hareket',
      'Basınç', 'Madde ve endüstri', 'Basit makineler',
    ],
  },
  {
    slug: 'genel-kultur-sorulari',
    topics: [
      'Mitoloji', 'Felsefe', 'Psikoloji', 'Sosyoloji', 'Ekonomi', 'Hukuk',
      'Yunan mitolojisi', 'Sokrates', 'Platon', 'Aristoteles', 'Sigmund Freud',
      'Uluslararası ilişkiler', 'Diplomasi', 'İnsan hakları', 'Demokrasi',
    ],
  },
]

const DIFFICULTIES = ['kolay', 'orta', 'zor', 'cok_zor', 'profesyonel']

// Zorluk arttıkça: daha derin (ikincil/ilişkili) makalelere inme olasılığı
// ve cümlenin extract içindeki pozisyonu artar (daha az bilinen detaylar).
const DIFFICULTY_PROFILE = {
  kolay: { sentenceRange: [0, 1], deepDiveChance: 0 },
  orta: { sentenceRange: [1, 3], deepDiveChance: 0.15 },
  zor: { sentenceRange: [2, 4], deepDiveChance: 0.35 },
  cok_zor: { sentenceRange: [3, 6], deepDiveChance: 0.55 },
  profesyonel: { sentenceRange: [4, 8], deepDiveChance: 0.75 },
}

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pickN(arr, n) {
  return shuffle(arr).slice(0, n)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJSON(url, { retries = 2, timeoutMs = 10000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error(`HTTP ${res.status}`)
      }
      return await res.json()
    } catch (err) {
      clearTimeout(timeout)
      if (attempt === retries) return null
      await sleep(300 * (attempt + 1))
    }
  }
  return null
}

// Cümleyi temizler: parantez içi açıklamalar, IPA telaffuz işaretleri,
// köşeli parantez referansları, fazla boşluklar vs. atılır.
function cleanSentence(raw) {
  if (!raw) return ''
  let text = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\/[^/]*\//g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()

  if (text && !/[.!?]$/.test(text)) {
    text += '.'
  }
  return text
}

function truncate(text, maxLen) {
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…'
}

// Wikipedia extract metnini cümlelere böler.
function splitSentences(extract) {
  if (!extract) return []
  return extract
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/)
    .map((s) => cleanSentence(s))
    .filter((s) => s.length >= 25 && s.length <= 260)
}

const YEAR_ONLY_REGEX = /^\d{3,4}$/

function isUsableOption(text) {
  if (!text) return false
  // Yıl bazlı sorularda doğru/yanlış şıklar "1923" gibi kısa sayılardır,
  // normal cümle şıklarından farklı bir uzunluk kuralına tabidir.
  if (YEAR_ONLY_REGEX.test(text)) return true
  return text.length >= 8 && text.length <= 160
}

async function fetchSummary(title) {
  const url = WIKI_API + encodeURIComponent(title)
  const data = await fetchJSON(url)
  if (!data || !data.extract || data.type === 'disambiguation') return null
  return data
}

async function fetchRelatedTitles(title, limit = 12) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: title,
    srlimit: String(limit),
    format: 'json',
    origin: '*',
  })
  const data = await fetchJSON(`${WIKI_SEARCH_API}?${params.toString()}`)
  return (data?.query?.search || [])
    .map((s) => s.title)
    .filter((t) => t && t.toLowerCase() !== title.toLowerCase())
}

async function fetchRandomArticle() {
  return fetchJSON(WIKI_RANDOM_API)
}

// ============================================
// SORU ÜRETİM MANTIĞI
// ============================================

// Bir maddenin cümlelerinden, zorluk seviyesine uygun bir "doğru cevap"
// cümlesi seçer (kolay -> giriş cümlesi, zor -> derindeki detaylar).
function pickFactSentence(sentences, difficulty) {
  if (sentences.length === 0) return null
  const [min, max] = DIFFICULTY_PROFILE[difficulty].sentenceRange
  const upper = Math.min(max, sentences.length - 1)
  const lower = Math.min(min, upper)
  const idx = lower + Math.floor(Math.random() * (upper - lower + 1))
  return sentences[idx]
}

const DEFINITION_TEMPLATES = [
  (title) => `${title} ile ilgili aşağıdakilerden hangisi doğrudur?`,
  (title) => `Aşağıdakilerden hangisi ${title} hakkında doğru bir bilgidir?`,
  (title) => `${title} hakkında verilen bilgilerden hangisi doğrudur?`,
  (title) => `${title} ile ilgili doğru ifade aşağıdakilerden hangisidir?`,
]

const YEAR_TEMPLATES = [
  (title) => `${title} ile ilgili aşağıdaki bilgide boş bırakılan yıl hangisidir?`,
  (title) => `${title} hakkındaki bilgiye göre doğru yıl hangisidir?`,
]

function letterFor(index) {
  return ['A', 'B', 'C', 'D'][index]
}

function buildQuestionRecord({ category, difficulty, questionText, correctText, wrongTexts, explanation, sourceUrl, sourceTitle }) {
  if (!isUsableOption(correctText)) return null
  const validWrongs = wrongTexts.filter(isUsableOption)
  if (validWrongs.length < 3) return null

  // Aynı metnin yanlış şık olarak iki kez görünmesini engelle
  const uniqueWrongs = []
  const seen = new Set([correctText.toLowerCase()])
  for (const w of validWrongs) {
    const key = w.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    uniqueWrongs.push(w)
    if (uniqueWrongs.length === 3) break
  }
  if (uniqueWrongs.length < 3) return null

  const allAnswers = shuffle([correctText, ...uniqueWrongs])
  const correctIndex = allAnswers.indexOf(correctText)

  return {
    category,
    difficulty,
    question_text: truncate(questionText, 220),
    option_a: allAnswers[0],
    option_b: allAnswers[1],
    option_c: allAnswers[2],
    option_d: allAnswers[3],
    correct_answer: letterFor(correctIndex),
    explanation,
    source_url: sourceUrl,
    source_title: sourceTitle,
    is_active: true,
  }
}

// Tip 1: Gerçek olgu tabanlı çoktan seçmeli soru.
// Yanlış şıklar UYDURULMUYOR - başka gerçek Wikipedia maddelerinden alınan
// GERÇEK ama bu soru için YANLIŞ olan cümlelerdir. Bu, eski sürümdeki
// "X ile ilgili bir konudur" gibi anlamsız dolgu şıkların yerini alır.
function generateDefinitionQuestion({ article, sentences, distractorSentences, difficulty, category }) {
  const factSentence = pickFactSentence(sentences, difficulty)
  if (!factSentence) return null

  const correctText = truncate(factSentence, 140)
  const wrongTexts = pickN(distractorSentences, Math.min(distractorSentences.length, 6)).map((s) => truncate(s, 140))

  const template = DEFINITION_TEMPLATES[Math.floor(Math.random() * DEFINITION_TEMPLATES.length)]

  return buildQuestionRecord({
    category,
    difficulty,
    questionText: template(article.title),
    correctText,
    wrongTexts,
    explanation: `Kaynak: Wikipedia - ${article.title}`,
    sourceUrl: article.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
    sourceTitle: article.title,
  })
}

// Tip 2: Yıl / tarih bilgisi sorusu. Metinde geçen gerçek bir yıl doğru
// cevap olur; yanlış şıklar ona yakın ama farklı, birbirinden ayırt
// edilebilir yıllardır (zorluk arttıkça aralık daralır -> daha zor).
function generateYearQuestion({ article, sentences, difficulty, category }) {
  const yearRegex = /\b(1[0-9]{3}|20[0-9]{2})\b/

  const candidates = sentences
    .map((s) => {
      const m = s.match(yearRegex)
      return m ? { sentence: s, year: parseInt(m[1], 10) } : null
    })
    .filter(Boolean)

  if (candidates.length === 0) return null

  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  const correctYear = pick.year

  // Zorluk arttıkça yanlış yıllar doğru yıla daha yakın olur (ayırt etmek zorlaşır)
  const spread = { kolay: 60, orta: 35, zor: 18, cok_zor: 9, profesyonel: 5 }[difficulty] || 30

  const wrongYears = new Set()
  let guard = 0
  while (wrongYears.size < 3 && guard < 50) {
    guard++
    const offset = Math.floor(Math.random() * spread) + 1
    const sign = Math.random() > 0.5 ? 1 : -1
    const candidate = correctYear + sign * offset
    if (candidate !== correctYear && candidate > 0 && candidate <= new Date().getFullYear() + 1) {
      wrongYears.add(candidate)
    }
  }
  if (wrongYears.size < 3) return null

  const questionSentenceContext = truncate(pick.sentence.replace(String(correctYear), '____'), 150)
  const template = YEAR_TEMPLATES[Math.floor(Math.random() * YEAR_TEMPLATES.length)]

  return buildQuestionRecord({
    category,
    difficulty,
    questionText: `${template(article.title)} ("${questionSentenceContext}")`,
    correctText: String(correctYear),
    wrongTexts: Array.from(wrongYears).map(String),
    explanation: cleanSentence(pick.sentence),
    sourceUrl: article.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
    sourceTitle: article.title,
  })
}

// Bir konu için tam bir soru üretim akışı: makaleyi çeker, ilişkili
// maddeleri (çeldirici havuzu için) çeker ve zorluğa uygun bir soru üretir.
async function generateQuestionForTopic(topic, difficulty, category, seenTexts) {
  const profile = DIFFICULTY_PROFILE[difficulty]
  let article = await fetchSummary(topic)
  if (!article) return null

  // Zorluk yüksekse belirli bir olasılıkla ana konu yerine onunla ilişkili
  // daha az bilinen bir maddeye "derinlemesine" inilir.
  if (Math.random() < profile.deepDiveChance) {
    const related = await fetchRelatedTitles(topic, 8)
    if (related.length > 0) {
      const deeper = await fetchSummary(related[Math.floor(Math.random() * related.length)])
      if (deeper) article = deeper
    }
  }

  const sentences = splitSentences(article.extract)
  if (sentences.length === 0) return null

  // Çeldirici (yanlış şık) havuzu için ilişkili maddelerden gerçek cümleler topla
  const relatedTitles = await fetchRelatedTitles(article.title, 10)
  const distractorPool = pickN(relatedTitles, Math.min(relatedTitles.length, 5))

  const distractorSummaries = []
  for (const t of distractorPool) {
    const summary = await fetchSummary(t)
    if (summary?.extract) {
      const s = splitSentences(summary.extract)
      if (s.length > 0) distractorSummaries.push(s[0])
    }
    await sleep(120)
  }

  let question = null

  // %30 ihtimalle (ve metinde yıl varsa) sayısal/tarih sorusu dene,
  // aksi halde ya da başarısız olursa tanım tabanlı soruya düş.
  if (Math.random() < 0.3) {
    question = generateYearQuestion({ article, sentences, difficulty, category })
  }
  if (!question) {
    if (distractorSummaries.length < 3) return null
    question = generateDefinitionQuestion({
      article,
      sentences,
      distractorSentences: distractorSummaries,
      difficulty,
      category,
    })
  }

  if (!question) return null

  const dedupeKey = `${question.category}|${question.question_text}|${question.option_a}`.toLowerCase()
  if (seenTexts.has(dedupeKey)) return null
  seenTexts.add(dedupeKey)

  return question
}

// Daha önce eklenmiş soruları (metin bazlı) çekerek aynı soruların tekrar
// tekrar havuza eklenmesini engellemeye çalışır (best-effort dedup).
async function fetchExistingQuestionTexts() {
  const seen = new Set()
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('category, question_text, option_a')
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error) throw error
    for (const row of data || []) {
      seen.add(`${row.category}|${row.question_text}|${row.option_a}`.toLowerCase())
    }
  } catch (err) {
    console.warn('Mevcut sorular çekilemedi (dedup atlanıyor):', err.message)
  }
  return seen
}

async function run() {
  const startedAt = Date.now()
  console.log('═══════════════════════════════════════════════')
  console.log('  Soru Havuzu Güncelleme — Wikipedia Kaynaklı')
  console.log('═══════════════════════════════════════════════')

  const seenTexts = await fetchExistingQuestionTexts()
  console.log(`Dedup için ${seenTexts.size} mevcut soru imzası yüklendi.`)

  const questionsToInsert = []
  const stats = {}

  for (const cat of CATEGORIES) {
    stats[cat.slug] = 0
    console.log(`\n▶ Kategori: ${cat.slug}`)
    const topics = pickN(cat.topics, Math.min(cat.topics.length, 4))

    for (const topic of topics) {
      for (const difficulty of DIFFICULTIES) {
        const count = Math.random() > 0.5 ? 2 : 1
        for (let i = 0; i < count; i++) {
          try {
            const q = await generateQuestionForTopic(topic, difficulty, cat.slug, seenTexts)
            if (q) {
              questionsToInsert.push(q)
              stats[cat.slug]++
            }
          } catch (err) {
            console.warn(`  ! "${topic}" (${difficulty}) üretilirken hata: ${err.message}`)
          }
          await sleep(150)
        }
      }
    }
    console.log(`  ✓ ${cat.slug}: ${stats[cat.slug]} soru üretildi`)
  }

  // "karisik" kategorisi için rastgele + bir seviye derinlemesine makale taraması
  console.log('\n▶ Kategori: karisik (rastgele + derinlemesine tarama)')
  stats['karisik'] = 0
  const RANDOM_ARTICLE_COUNT = 20

  for (let i = 0; i < RANDOM_ARTICLE_COUNT; i++) {
    try {
      let article = await fetchRandomArticle()
      if (!article?.extract) continue

      // %40 ihtimalle bir adım daha derine inip ilişkili bir maddeye geç
      if (Math.random() < 0.4) {
        const related = await fetchRelatedTitles(article.title, 8)
        if (related.length > 0) {
          const deeper = await fetchSummary(related[Math.floor(Math.random() * related.length)])
          if (deeper) article = deeper
        }
      }

      const sentences = splitSentences(article.extract)
      if (sentences.length === 0) continue

      const relatedTitles = await fetchRelatedTitles(article.title, 10)
      const distractorSummaries = []
      for (const t of pickN(relatedTitles, Math.min(relatedTitles.length, 5))) {
        const summary = await fetchSummary(t)
        if (summary?.extract) {
          const s = splitSentences(summary.extract)
          if (s.length > 0) distractorSummaries.push(s[0])
        }
        await sleep(100)
      }
      if (distractorSummaries.length < 3) continue

      const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)]

      let q = null
      if (Math.random() < 0.3) {
        q = generateYearQuestion({ article, sentences, difficulty, category: 'karisik' })
      }
      if (!q) {
        q = generateDefinitionQuestion({
          article,
          sentences,
          distractorSentences: distractorSummaries,
          difficulty,
          category: 'karisik',
        })
      }

      if (q) {
        const dedupeKey = `${q.category}|${q.question_text}|${q.option_a}`.toLowerCase()
        if (!seenTexts.has(dedupeKey)) {
          seenTexts.add(dedupeKey)
          questionsToInsert.push(q)
          stats['karisik']++
        }
      }
    } catch (err) {
      console.warn(`  ! Rastgele madde işlenirken hata: ${err.message}`)
    }
    await sleep(150)
  }
  console.log(`  ✓ karisik: ${stats['karisik']} soru üretildi`)

  // ============================================
  // VERİTABANINA YAZMA
  // ============================================
  console.log(`\n${questionsToInsert.length} yeni soru veritabanına yazılıyor...`)

  let inserted = 0
  for (let i = 0; i < questionsToInsert.length; i += 50) {
    const batch = questionsToInsert.slice(i, i + 50)
    const { error } = await supabase.from('questions').insert(batch)
    if (error) {
      console.error(`  ✗ Batch ${Math.floor(i / 50) + 1} eklenemedi: ${error.message}`)
    } else {
      inserted += batch.length
      console.log(`  ✓ Batch ${Math.floor(i / 50) + 1}: ${batch.length} soru eklendi`)
    }
  }

  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n═══════════════════════════════════════════════')
  console.log(`  Tamamlandı: ${inserted}/${questionsToInsert.length} soru eklendi (${durationSec}s)`)
  Object.entries(stats).forEach(([slug, n]) => console.log(`   - ${slug}: ${n}`))
  console.log('═══════════════════════════════════════════════')

  if (questionsToInsert.length > 0 && inserted === 0) {
    // Hiçbir şey yazılamadıysa CI'da görünür bir hata ile çık
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
