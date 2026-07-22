import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials missing')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const CATEGORIES = [
  { slug: 'genel-kultur', topics: ['Türkiye', 'Osmanlı İmparatorluğu', 'Atatürk', 'İstanbul', 'Kültür', 'Sanat', 'Müzik', 'Edebiyat'] },
  { slug: 'matematik', topics: ['Matematik', 'Geometri', 'Algebra', 'Trigonometri', 'İstatistik', 'Olasılık'] },
  { slug: 'guncel', topics: ['Teknoloji', 'Yapay zeka', 'Sosyal medya', 'İnternet', 'Uzay teknolojisi'] },
  { slug: 'ehliyet', topics: ['Trafik kuralları', 'Sürücü belgesi', 'Kara yolları', 'Trafik işaretleri'] },
  { slug: 'cografya', topics: ['Coğrafya', 'Dünya', 'Kıtalar', 'Okyanuslar', 'Nehirler', 'Dağlar', 'Göller'] },
  { slug: 'fen', topics: ['Fizik', 'Kimya', 'Biyoloji', 'Astronomi', 'Evrim', 'Genetik'] },
  { slug: 'tarih', topics: ['Tarih', 'Antik Roma', 'Antik Yunan', 'İkinci Dünya Savaşı', 'Birinci Dünya Savaşı', 'Soğuk Savaş'] },
  { slug: 'lgs', topics: ['Matematik', 'Fen bilimleri', 'Türkçe', 'İnkılap tarihi', 'İngilizce'] },
  { slug: 'genel-kultur-sorulari', topics: ['Mitoloji', 'Felsefe', 'Psikoloji', 'Sosyoloji', 'Ekonomi', 'Hukuk'] },
]

const DIFFICULTIES = ['kolay', 'orta', 'zor', 'cok_zor', 'profesyonel']

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pickN(arr, n) {
  return shuffle(arr).slice(0, n)
}

function generateWrongAnswers(correct, all) {
  const others = all.filter(a => a !== correct)
  return pickN(others, 3)
}

async function fetchWikipediaArticle(title) {
  const url = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KimMilyonerBot/2.0 (educational quiz generator)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

async function fetchRelatedTopics(title) {
  const url = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&srlimit=20&format=json&origin=*`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KimMilyonerBot/2.0 (educational quiz generator)' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.query?.search || []).map(s => s.title)
  } catch {
    return []
  }
}

function generateQuestionFromArticle(article, difficulty, category, relatedTitles) {
  if (!article || !article.extract) return null

  const extract = article.extract
  const title = article.title
  const sentences = extract.split('. ').filter(s => s.length > 20)

  if (sentences.length < 2) return null

  // Pick a sentence and create a fill-in-the-blank style question
  const sentence = sentences[Math.floor(Math.random() * Math.min(sentences.length, 5))]
  const cleanSentence = sentence.replace(/\([^)]*\)/g, '').trim()

  // Create question: "X hakkında hangisi doğrudur?" or fill-in style
  const questionTypes = [
    () => `${title} nedir?`,
    () => `${title} ile ilgili hangisi doğrudur?`,
    () => `Aşağıdakilerden hangisi ${title} ile ilgili doğru bir bilgidir?`,
    () => `${title} hakkında verilen bilgilerden hangisi doğrudur?`,
  ]

  const questionText = questionTypes[Math.floor(Math.random() * questionTypes.length)]()

  // Correct answer is a shortened version of the extract
  const correctAnswer = cleanSentence.length > 80
    ? cleanSentence.substring(0, 77) + '...'
    : cleanSentence

  // Wrong answers from related topics
  const wrongPool = relatedTitles
    .filter(t => t !== title)
    .map(t => `${t} ile ilgili bir konudur.`)

  if (wrongPool.length < 3) return null

  const wrongAnswers = pickN(wrongPool, 3)
  const allAnswers = shuffle([correctAnswer, ...wrongAnswers])
  const correctIndex = allAnswers.indexOf(correctAnswer)
  const letters = ['A', 'B', 'C', 'D']

  return {
    category,
    difficulty,
    question_text: questionText,
    option_a: allAnswers[0],
    option_b: allAnswers[1],
    option_c: allAnswers[2],
    option_d: allAnswers[3],
    correct_answer: letters[correctIndex],
    explanation: `${title} hakkında Wikipedia bilgisinden oluşturulmuştur.`,
    source_url: article.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    source_title: title,
    is_active: true,
  }
}

async function generateSimpleQuestion(topic, difficulty, category) {
  // Simple factual questions based on topic name
  const article = await fetchWikipediaArticle(topic)
  if (!article) return null

  const related = await fetchRelatedTopics(topic)

  // Try to generate a question from the article
  const q = generateQuestionFromArticle(article, difficulty, category, related)
  if (q) return q

  // Fallback: simple definition question
  if (article.extract) {
    const shortExtract = article.extract.length > 100
      ? article.extract.substring(0, 97) + '...'
      : article.extract

    const wrongOptions = [
      `Bu bir ${category} konusu değildir.`,
      `Bu bilgi yanlıştır.`,
      `Bu konu ile ilgili değildir.`,
    ]

    const allAnswers = shuffle([shortExtract, ...wrongOptions])
    const correctIndex = allAnswers.indexOf(shortExtract)
    const letters = ['A', 'B', 'C', 'D']

    return {
      category,
      difficulty,
      question_text: `${topic} hakkında hangisi doğrudur?`,
      option_a: allAnswers[0],
      option_b: allAnswers[1],
      option_c: allAnswers[2],
      option_d: allAnswers[3],
      correct_answer: letters[correctIndex],
      explanation: `Wikipedia: ${topic}`,
      source_url: article.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
      source_title: topic,
      is_active: true,
    }
  }

  return null
}

async function run() {
  console.log('Soru havuzu güncelleme başlıyor...')
  let totalAdded = 0
  const questionsToInsert = []

  for (const cat of CATEGORIES) {
    console.log(`Kategori: ${cat.slug}`)
    const topics = shuffle(cat.topics).slice(0, 3)

    for (const topic of topics) {
      for (const difficulty of DIFFICULTIES) {
        // Generate 1-2 questions per topic per difficulty
        const count = Math.random() > 0.5 ? 2 : 1
        for (let i = 0; i < count; i++) {
          const q = await generateSimpleQuestion(topic, difficulty, cat.slug)
          if (q) {
            questionsToInsert.push(q)
            totalAdded++
          }
        }
      }
    }
  }

  // Also fetch random Wikipedia articles for "karisik" category
  console.log('Karışık kategori için rastgele makaleler çekiliyor...')
  for (let i = 0; i < 10; i++) {
    const randomUrl = 'https://tr.wikipedia.org/api/rest_v1/page/random/summary'
    try {
      const res = await fetch(randomUrl, {
        headers: { 'User-Agent': 'KimMilyonerBot/2.0 (educational quiz generator)' },
      })
      if (!res.ok) continue
      const article = await res.json()
      const related = await fetchRelatedTopics(article.title)
      const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)]
      const q = generateQuestionFromArticle(article, difficulty, 'karisik', related)
      if (q) {
        questionsToInsert.push(q)
        totalAdded++
      }
    } catch {
      continue
    }
  }

  // Insert in batches of 50
  console.log(`${totalAdded} soru hazırlanıyor, veritabanına yazılıyor...`)

  for (let i = 0; i < questionsToInsert.length; i += 50) {
    const batch = questionsToInsert.slice(i, i + 50)
    const { error } = await supabase.from('questions').insert(batch)
    if (error) {
      console.error('Insert error:', error.message)
    } else {
      console.log(`Batch ${i / 50 + 1}: ${batch.length} soru eklendi`)
    }
  }

  console.log(`Toplam ${totalAdded} soru eklendi. İşlem tamam.`)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
