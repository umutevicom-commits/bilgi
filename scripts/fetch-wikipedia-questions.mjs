import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QUESTIONS_FILE = join(__dirname, '..', 'public', 'data', 'questions.json')
// Hangi Wikipedia maddelerinin hangi kategori için "işlendiğini" kalıcı olarak
// tutar. Bu dosya olmadan her cron aynı ~4 konuyu tekrar tekrar seçip aynı
// soruları (farklı şık sırasıyla) üretmeye devam ederdi.
const USED_TITLES_FILE = join(__dirname, '..', 'public', 'data', 'used-titles.json')

const USER_AGENT = 'BilgiYarismasiBot/4.0 (educational quiz generator; contact@example.com)'
const WIKI_API = 'https://tr.wikipedia.org/api/rest_v1/page/summary/'
const WIKI_SEARCH_API = 'https://tr.wikipedia.org/w/api.php'
const WIKI_RANDOM_API = 'https://tr.wikipedia.org/api/rest_v1/page/random/summary'

// ============================================
// ÇALIŞTIRMA AYARLARI (env değişkeni ile ezilebilir)
// ============================================
// Bir cron çalışmasında üretilmesi HEDEFLENEN yeni soru sayısı. "Binlerce"
// istendiği için varsayılanı yüksek tuttuk, ama Wikipedia'ya nazik davranmak
// için eş zamanlılık (concurrency) ile dengeliyoruz. Gerekirse workflow
// dosyasından env ile küçültüp büyütebilirsin.
const TARGET_NEW_QUESTIONS = parseInt(process.env.TARGET_NEW_QUESTIONS || '2000', 10)
// Aynı anda kaç Wikipedia isteği açık kalsın. Çok yüksek tutma; Wikipedia
// User-Agent bazlı hız sınırlaması / geçici IP engeli uygulayabilir.
const FETCH_CONCURRENCY = parseInt(process.env.FETCH_CONCURRENCY || '8', 10)
// Her kategori için bu run'da işlenecek MAKSİMUM konu (madde) sayısı.
// Sabit listedeki konular tükenince otomatik olarak Wikipedia arama API'siyle
// ilişkili yeni başlıklar keşfedilir (bkz. expandTopicFrontier).
const MAX_TOPICS_PER_CATEGORY = parseInt(process.env.MAX_TOPICS_PER_CATEGORY || '260', 10)
// "karisik" kategorisi için rastgele madde sayısı.
const RANDOM_ARTICLE_COUNT = parseInt(process.env.RANDOM_ARTICLE_COUNT || '260', 10)

// ============================================
// KATEGORİ / KONU HAVUZU
// ============================================
const CATEGORIES = [
  {
    slug: 'genel-kultur',
    topics: [
      'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin', 'Aydın', 'Balıkesir',
      'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli',
      'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari',
      'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
      'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir',
      'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat',
      'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman',
      'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
      'Alanya', 'Tarsus', 'İskenderun', 'Manavgat', 'Bodrum', 'Marmaris', 'Fethiye',
      'Göbeklitepe', 'Efes', 'Kapadokya', 'Pamukkale', 'Nemrut Dağı', 'Topkapı Sarayı', 'Ayasofya',
      'Sultanahmet Camii', 'Sümela Manastırı', 'Safranbolu', 'Truva', 'Hattuşaş',
      'Hierapolis', 'Pergamon', 'Aspendos', 'Side', 'Milet', 'Didyma', 'Priene',
      'Çatalhöyük', 'Yerebatan Sarnıcı', 'Dolmabahçe Sarayı', 'İshak Paşa Sarayı', 'Divriği Ulu Cami',
      'Ani', 'Zeugma', 'Göreme', 'Ihlara Vadisi', 'Kız Kulesi', 'Galata Kulesi', 'Rumeli Hisarı',
      'Süleymaniye Camii', 'Selimiye Camii', 'Mevlana Müzesi',
      'Nazım Hikmet', 'Yaşar Kemal', 'Orhan Pamuk', 'Ahmet Hamdi Tanpınar', 'Sabahattin Ali', 'Halide Edip Adıvar',
      'Reşat Nuri Güntekin', 'Yahya Kemal Beyatlı', 'Atilla İlhan', 'Cemal Süreya', 'Oğuz Atay',
      'Peyami Safa', 'Sait Faik Abasıyanık', 'Tarık Buğra', 'Kemal Tahir', 'Orhan Kemal', 'Aziz Nesin',
      'Rıfat Ilgaz', 'Namık Kemal', 'Şinasi', 'Tevfik Fikret', 'Mehmet Akif Ersoy', 'Ziya Gökalp',
      'Ömer Seyfettin', 'Necip Fazıl Kısakürek', 'Cahit Sıtkı Tarancı', 'Fazıl Hüsnü Dağlarca',
      'Yunus Emre', 'Mevlana', 'Nasreddin Hoca', 'Dede Korkut', 'Karacaoğlan', 'Köroğlu',
      'Pir Sultan Abdal', 'Aşık Veysel', 'Neşet Ertaş', 'Mahzuni Şerif',
      'Ebru', 'Hat sanatı', 'Tezhip', 'Çini', 'Halı', 'Karagöz ve Hacivat', 'Meddah', 'Orta oyunu',
      'Zeybek', 'Horon', 'Halay', 'Türk kahvesi', 'Baklava', 'Mantı', 'İskender kebap', 'Döner',
      'Lahmacun', 'Künefe', 'Simit', 'Ayran', 'Ney', 'Bağlama', 'Kemençe', 'Zurna', 'Davul', 'Kanun', 'Ud',
      'Osmanlı İmparatorluğu', 'Selçuklu Devleti', 'Türkiye Cumhuriyeti', 'Mustafa Kemal Atatürk',
      'Kurtuluş Savaşı', 'Büyük Taarruz', 'Sakarya Meydan Muharebesi', 'Amasya Genelgesi',
      'Erzurum Kongresi', 'Sivas Kongresi', 'Misak-ı Millî', 'Halifeliğin Kaldırılması',
      'Harf Devrimi', 'Soyadı Kanunu', 'Tanzimat Fermanı', 'Islahat Fermanı',
      'Barbaros Hayrettin Paşa', 'Turgut Reis', 'Piri Reis', 'Sokullu Mehmet Paşa',
      'Karlofça Antlaşması', 'Küçük Kaynarca Antlaşması', 'Yeniçeri Ocağı', 'Tımar sistemi',
      'Göktürkler', 'Uygurlar', 'Karahanlılar', 'Gazneliler', 'Harzemşahlar',
      'Şener Şen', 'Kemal Sunal', 'Adile Naşit', 'Münir Özkul', 'Türkan Şoray',
      'Cüneyt Arkın', 'Nuri Bilge Ceylan', 'Cem Yılmaz', 'Yılmaz Güney', 'Muhsin Ertuğrul',
      'İbrahim Tatlıses', 'Sezen Aksu', 'Tarkan', 'Ajda Pekkan', 'Zeki Müren', 'Barış Manço',
      'Cem Karaca', 'Erkin Koray', 'Sertab Erener',
    ]
  },
  {
    slug: 'matematik',
    topics: [
      'Matematik', 'Geometri', 'Cebir', 'Trigonometri', 'İstatistik', 'Olasılık', 'Sayı teorisi',
      'Pisagor teoremi', 'Asal sayı', 'Fibonacci dizisi', 'Pi sayısı', 'Küme teorisi',
      'Logaritma', 'Türev', 'İntegral', 'Matris', 'Determinant', 'Vektör', 'Limit',
      'Polinom', 'Mutlak değer', 'Oran orantı', 'Analitik geometri',
      'Çember', 'Üçgen', 'Dörtgen', 'Çokgenler', 'Katı cisimler',
      'Kombinasyon', 'Permütasyon', 'Binom açılımı', 'Modüler aritmetik',
      'Rasyonel sayılar', 'Üslü ifadeler', 'Köklü ifadeler', 'Çarpanlara ayırma',
      'İkinci dereceden denklem', 'Karmaşık sayılar',
      'Euler özdeşliği', 'Fermat son teoremi', 'Pascal üçgeni',
      'Descartes', 'Öklid geometrisi', 'Topoloji', 'Fraktal',
      'Matematiksel mantık', 'Fonksiyon', 'Bire bir fonksiyon', 'Ters fonksiyon',
      'Bileşke fonksiyon', 'Üstel fonksiyon', 'Trigonometrik fonksiyon',
      'Doğru denklemi', 'Parabol', 'Elips', 'Hiperbol',
      'Zincir kuralı', 'Belirli integral', 'Fourier analizi', 'Laplace dönüşümü',
      'Diferansiyel denklem', 'Oyun teorisi', 'Çizge teorisi',
      'Harezmi', 'Ömer Hayyam', 'Cahit Arf', 'Pisagor', 'Öklid', 'Arşimed',
      'Newton', 'Leibniz', 'Euler', 'Gauss',
    ]
  },
  {
    slug: 'guncel',
    topics: [
      'Togg', 'Bayraktar TB2', 'Bayraktar Akıncı', 'Anka', 'Altay Tankı', 'TCG Anadolu',
      'MİLGEM', 'Hisar füze sistemi', 'Atmaca füzesi', 'Tübitak', 'TUSAŞ', 'ROKETSAN',
      'ASELSAN', 'HAVELSAN', 'Türksat 6A', 'İmece uydusu', 'Göktürk-2',
      'Yapay zeka', 'Sosyal medya', 'İnternet', 'Akıllı telefon', 'Elektrikli araç',
      'Kripto para', 'Bulut bilişim', 'Siber güvenlik', 'Nesnelerin interneti',
      '5G', 'Kuantum bilgisayar', 'Artırılmış gerçeklik', 'Sanal gerçeklik',
      'Otonom sürüş', 'Lityum iyon pil', 'Güneş paneli', 'Rüzgar türbini',
      'Nükleer füzyon', 'Biyoteknoloji', 'CRISPR', 'Nanoteknoloji', '3D yazıcı',
      'Blokzincir', 'NFT', 'Derin öğrenme', 'Makine öğrenmesi',
      'Büyük dil modeli', 'Metaverse', 'Drone', 'Robotik',
    ]
  },
  {
    slug: 'ehliyet',
    topics: [
      'Trafik kuralları', 'Sürücü belgesi', 'Trafik işaretleri', 'Emniyet kemeri',
      'Hız sınırı', 'Trafik ışığı', 'İlk yardım', 'Motor bilgisi',
      'Trafik kazası', 'Karayolu Trafik Kanunu', 'Kavşaklar', 'Dönel kavşak',
      'Geçiş üstünlüğü', 'Öncelik hakkı', 'Takip mesafesi', 'Otoyol kuralları',
      'Fren sistemi', 'ABS', 'Hava yastığı', 'Lastik diş derinliği',
      'Motor yağı', 'Akü', 'Alternatör', 'Buji', 'Debriyaj', 'Vites kutusu',
      'Katalitik konvertör', 'Zorunlu trafik sigortası', 'Kasko',
      'Ehliyet sınıfları', 'Alkollü araç kullanımı', 'Kırmızı ışık ihlali',
      'Yaya geçidi', 'Okul geçidi', 'Hidroplaning', 'Disk fren', 'Kampana fren',
      'Turbo şarj', 'Intercooler', 'Rot ayarı', 'Balans ayarı',
    ]
  },
  {
    slug: 'cografya',
    topics: [
      'Türkiye coğrafyası', 'Marmara Bölgesi', 'Ege Bölgesi', 'Akdeniz Bölgesi',
      'İç Anadolu Bölgesi', 'Karadeniz Bölgesi', 'Doğu Anadolu Bölgesi',
      'Güneydoğu Anadolu Bölgesi', 'Ağrı Dağı', 'Uludağ', 'Erciyes Dağı',
      'Kuzey Anadolu Dağları', 'Toros Dağları', 'Kızılırmak', 'Yeşilırmak',
      'Sakarya Nehri', 'Fırat Nehri', 'Dicle Nehri', 'Seyhan Nehri', 'Ceyhan Nehri',
      'Büyük Menderes', 'Gediz Nehri', 'Van Gölü', 'Tuz Gölü', 'Beyşehir Gölü',
      'Eğirdir Gölü', 'Sapanca Gölü', 'Abant Gölü',
      'İstanbul Boğazı', 'Çanakkale Boğazı', 'İzmir Körfezi', 'Antalya Körfezi',
      'Çukurova', 'Türkiye iklimi', 'Akdeniz iklimi', 'Karasal iklim',
      'Karadeniz iklimi', 'Kuzey Anadolu Fay Hattı',
      'Göreme Tarihi Milli Parkı', 'Yedigöller Milli Parkı',
    ]
  },
  {
    slug: 'fen',
    topics: [
      'Fizik', 'Kimya', 'Biyoloji', 'Astronomi', 'Evrim', 'Genetik', 'Hücre', 'DNA',
      'Atom', 'Enerji', 'Yerçekimi', 'Güneş Sistemi', 'Fotosentez', 'Elektrik',
      'Manyetizma', 'Termodinamik', 'Periyodik tablo', 'Işık',
      'Kuantum mekaniği', 'Aziz Sancar', 'Oktay Sinanoğlu', 'Feza Gürsey',
      'Hulusi Behçet', 'Ali Kuşçu', 'İbn Sina', 'Farabi', 'El-Biruni', 'Harezmi',
      'Ömer Hayyam', 'İbn el-Heysem', 'Cezeri',
      'Proton', 'Nötron', 'Elektron', 'Kara delik', 'Beyaz cüce',
      'Süpernova', 'Büyük Patlama', 'Samanyolu', 'Andromeda',
      'İzafiyet teorisi', 'Kinetik enerji', 'Potansiyel enerji', 'Entropi',
      'Elektromanyetik dalga', 'Radyo dalgası', 'Mikrodalga', 'X ışını',
      'Optik', 'Yansıma', 'Kırılma', 'Asit', 'Baz', 'Tuz', 'pH',
      'Kovalent bağ', 'İyonik bağ', 'Mol', 'Avogadro sayısı',
      'Mitokondri', 'Ribozom', 'Mitoz bölünme', 'Mayoz bölünme',
      'Mutasyon', 'Doğal seçilim', 'Ekosistem', 'Besin zinciri',
      'Karbon döngüsü', 'Su döngüsü', 'Sera etkisi', 'Küresel ısınma',
      'Ozon tabakası', 'Nükleer reaktör', 'Radyoaktif bozunma',
    ]
  },
  {
    slug: 'tarih',
    topics: [
      'İkinci Dünya Savaşı', 'Birinci Dünya Savaşı', 'Soğuk Savaş', 'Rönesans',
      'Sanayi Devrimi', 'Fransız Devrimi', 'Bizans İmparatorluğu', 'İpek Yolu',
      'Kurtuluş Savaşı', 'Mezopotamya', 'Sümerler', 'Babil', 'Asurlular',
      'Hititler', 'Frigler', 'Lidyalılar', 'Pers İmparatorluğu',
      'Büyük İskender', 'Roma İmparatorluğu', 'Julius Caesar', 'Augustus',
      'Orta Çağ', 'Haçlı Seferleri', 'İstanbulun Fethi', 'Coğrafi Keşifler',
      'Reform', 'Aydınlanma Çağı', 'Amerikan İç Savaşı',
      'Çanakkale Cephesi', 'Milletler Cemiyeti', 'Adolf Hitler',
      'Joseph Stalin', 'Winston Churchill', 'Normandiya Çıkarması',
      'Stalingrad Muharebesi', 'Berlin Duvarı', 'Küba Füze Krizi',
      'Vietnam Savaşı', 'Kore Savaşı', 'Uzay Yarışı', 'Birleşmiş Milletler',
      'NATO', 'Varşova Paktı', 'Avrupa Birliği',
      'Çin Seddi', 'Samuray', 'Meiji Restorasyonu', 'Tac Mahal',
      'Aztekler', 'Mayalar', 'İnkalar', 'Kartaca',
      'Osmanlı Kuruluş Dönemi', 'Osmanlı Yükselme Dönemi',
      'Tanzimat Fermanı', 'Balkan Savaşları', 'Yeniçeri Ocağı',
      'Devşirme sistemi', 'Tımar sistemi',
    ]
  },
  {
    slug: 'lgs',
    topics: [
      'Hücre bölünmesi', 'Kuvvet ve hareket', 'Basınç', 'Madde ve endüstri',
      'Basit makineler', 'Çarpanlar ve katlar', 'Üslü ifadeler', 'Kareköklü ifadeler',
      'Veri analizi', 'Olasılık', 'Cebirsel ifadeler', 'Doğrusal denklemler',
      'Eşitsizlikler', 'Üçgenler', 'Eşlik ve benzerlik', 'Dönüşüm geometrisi',
      'Geometrik cisimler', 'Mevsimlerin oluşumu', 'İklim ve hava hareketleri',
      'DNA ve genetik kod', 'Kalıtım', 'Mutasyon ve modifikasyon', 'Adaptasyon',
      'Biyoteknoloji', 'Sıvı basıncı', 'Gaz basıncı', 'Periyodik sistem',
      'Kimyasal tepkimeler', 'Asitler ve bazlar', 'İş güç enerji',
      'Makaralar', 'Kaldıraçlar', 'Eğik düzlem', 'Dişli çarklar',
      'Madde döngüleri', 'Sürdürülebilir kalkınma', 'Çevre sorunları',
      'Elektrik akımı', 'Manyetizma', 'Işığın yayılması', 'Yansıma',
      'Aynalar', 'Mercekler', 'Ses dalgaları',
      'Sözcükte anlam', 'Cümlede anlam', 'Paragraf', 'Fiilimsiler',
      'Cümlenin ögeleri', 'Fiilde çatılar', 'Cümle türleri', 'Anlatım bozuklukları',
      'Yazım kuralları', 'Noktalama işaretleri', 'Metin türleri',
      'Bir Kahraman Doğuyor', 'Milli Uyanış', 'Ya İstiklal Ya Ölüm',
      'Atatürkçülük', 'Demokratikleşme Çabaları',
    ]
  },
  {
    slug: 'genel-kultur-sorulari',
    topics: [
      'Felsefe', 'Psikoloji', 'Sosyoloji', 'Ekonomi', 'Hukuk', 'Diplomasi',
      'İnsan hakları', 'Demokrasi', 'İslam felsefesi', 'Farabi', 'İbn Sina',
      'İbn Rüşd', 'Gazali', 'Ziya Gökalp', 'Mehmet Akif Ersoy', 'Nurettin Topçu',
      'Mikroekonomi', 'Makroekonomi', 'Enflasyon', 'Gayri Safi Yurtiçi Hasıla',
      'Merkez bankası', 'Para politikası', 'Arz ve talep', 'Serbest piyasa',
      'Kapitalizm', 'Sosyalizm', 'Liberalizm', 'Keynesyen iktisat',
      'Anayasa hukuku', 'Ceza hukumu', 'Ticaret hukuku',
      'Yargıtay', 'Danıştay', 'Anayasa Mahkemesi',
      'Kuvvetler ayrılığı', 'Yasama', 'Yürütme', 'Yargı',
      'Seçim sistemi', 'Siyasi partiler', 'Parlamenter sistem',
      'Başkanlık sistemi', 'Birleşmiş Milletler',
      'İnsan Hakları Evrensel Beyannamesi', 'Bilişsel psikoloji',
    ]
  }
]

const DIFFICULTIES = ['kolay', 'orta', 'zor', 'cok_zor', 'profesyonel']

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
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
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

function cleanSentence(raw) {
  if (!raw) return ''
  let text = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\/[^/\d]{2,40}\//g, ' ')
    .replace(/…/g, ' ')
    .replace(/\.{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/^[,;:\-–—\s]+/, '')
    .replace(/[,;:\-–—\s]+$/, '')
    .trim()

  if (text && !/[.!?]$/.test(text)) {
    text += '.'
  }
  return text
}

const DANGLING_FRAGMENT_REGEX = /(,\s*$|:\s*$|-\s*$|\bve\s*\.$|\bile\s*\.$|\bveya\s*\.$)/i

function fitsLimit(text, maxLen) {
  if (typeof text !== 'string') return false
  const trimmed = text.trim()
  if (trimmed.length === 0 || trimmed.length > maxLen) return false
  if (DANGLING_FRAGMENT_REGEX.test(trimmed)) return false
  return true
}

function splitSentences(extract) {
  if (!extract) return []
  return extract
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/)
    .map((s) => cleanSentence(s))
    .filter((s) => s.length >= 25 && s.length <= 190 && !DANGLING_FRAGMENT_REGEX.test(s))
}

const YEAR_ONLY_REGEX = /^\d{3,4}$/

function isUsableOption(text) {
  if (!text) return false
  if (YEAR_ONLY_REGEX.test(text)) return true
  if (DANGLING_FRAGMENT_REGEX.test(text)) return false
  return text.length >= 12 && text.length <= 130
}

function normalizeForCompare(text) {
  return text
    .toLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isTooSimilar(a, b) {
  const na = normalizeForCompare(a)
  const nb = normalizeForCompare(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const wa = new Set(na.split(' '))
  const wb = new Set(nb.split(' '))
  let common = 0
  for (const w of wa) if (wb.has(w)) common++
  const union = new Set([...wa, ...wb]).size
  return union > 0 && common / union >= 0.7
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
  if (!fitsLimit(questionText, 200)) return null
  if (!isUsableOption(correctText)) return null
  const validWrongs = wrongTexts.filter(isUsableOption)
  if (validWrongs.length < 3) return null

  const uniqueWrongs = []
  const seen = new Set([correctText.toLowerCase()])
  for (const w of validWrongs) {
    const key = w.toLowerCase()
    if (seen.has(key)) continue
    if (isTooSimilar(w, correctText)) continue
    if (uniqueWrongs.some((existing) => isTooSimilar(existing, w))) continue
    seen.add(key)
    uniqueWrongs.push(w)
    if (uniqueWrongs.length === 3) break
  }
  if (uniqueWrongs.length < 3) return null

  const allAnswers = shuffle([correctText, ...uniqueWrongs])
  const correctIndex = allAnswers.indexOf(correctText)

  return {
    id: `${category}-${difficulty}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    category,
    difficulty,
    question_text: questionText,
    option_a: allAnswers[0],
    option_b: allAnswers[1],
    option_c: allAnswers[2],
    option_d: allAnswers[3],
    correct_answer: letterFor(correctIndex),
    explanation,
    source_url: sourceUrl,
    source_title: sourceTitle,
    is_active: true,
    created_at: new Date().toISOString(),
  }
}

function generateDefinitionQuestion({ article, sentences, distractorSentences, difficulty, category }) {
  const factSentence = pickFactSentence(sentences, difficulty)
  if (!factSentence) return null

  const correctText = factSentence
  const wrongTexts = pickN(distractorSentences, Math.min(distractorSentences.length, 6))

  const template = DEFINITION_TEMPLATES[Math.floor(Math.random() * DEFINITION_TEMPLATES.length)]

  return buildQuestionRecord({
    category,
    difficulty,
    questionText: template(article.title),
    correctText,
    wrongTexts,
    explanation: 'Bu bilgi, Wikipedia kaynağından derlenmiştir.',
    sourceUrl: article.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
    sourceTitle: article.title,
  })
}

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

  const questionSentenceContext = pick.sentence.replace(String(correctYear), '____')
  if (!fitsLimit(questionSentenceContext, 150)) return null
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

async function generateQuestionForTopic(topic, difficulty, category, seenTexts, sourceIndex) {
  const profile = DIFFICULTY_PROFILE[difficulty]
  let article = await fetchSummary(topic)
  if (!article) return null

  if (Math.random() < profile.deepDiveChance) {
    const related = await fetchRelatedTitles(topic, 8)
    if (related.length > 0) {
      const deeper = await fetchSummary(related[Math.floor(Math.random() * related.length)])
      if (deeper) article = deeper
    }
  }

  const sentences = splitSentences(article.extract)
  if (sentences.length === 0) return null

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

  // 1) Tam tekrar kontrolü (şık sırasından bağımsız, düzeltilmiş imza)
  if (seenTexts.has(questionSignature(question))) return null
  // 2) Aynı kaynak maddeden üretilmiş, farklı kelimelerle de olsa aynı
  //    olguyu soran BENZER soru kontrolü
  if (isNearDuplicate(question, sourceIndex)) return null

  registerQuestion(question, seenTexts, sourceIndex)
  return question
}

// ============================================
// JSON SORU HAVUZU YÖNETİMİ
// ============================================
// Sorular Supabase'e DEĞİL, GitHub Pages üzerinde JSON olarak saklanır.
// Her Cron çalışmasında yalnızca YENİ sorular eklenir, mevcut sorular
// silinmez ve yinelenen kayıt oluşmaz.

function loadExistingQuestions() {
  try {
    if (!existsSync(QUESTIONS_FILE)) return []
    const raw = readFileSync(QUESTIONS_FILE, 'utf-8')
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.questions)) return data.questions
    return []
  } catch (err) {
    console.warn('Mevcut soru havuzu okunamadı, sıfırdan başlanıyor:', err.message)
    return []
  }
}

function saveQuestions(questions) {
  const dir = dirname(QUESTIONS_FILE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const output = {
    generated_at: new Date().toISOString(),
    total: questions.length,
    questions,
  }
  writeFileSync(QUESTIONS_FILE, JSON.stringify(output, null, 2), 'utf-8')
}

// ÖNEMLİ DÜZELTME: Eski imza `category|question_text|option_a` idi. option_a,
// şıklar her üretimde karıştırıldığı (shuffle) için RASTGELE bir konumdaydı.
// Yani aynı soru + aynı 4 şık, sadece sırası farklıyken imza değişiyor ve
// dedup bunu YAKALAYAMIYORDU (canlı örnek: "Yalova hakkında..." sorusu 5 kez
// üretilmiş, 2 tanesi harfi harfine aynı şıklara sahipti). Düzeltme: şıkları
// normalize edip ALFABETİK SIRALA, konum artık imzayı etkilemesin.
function questionSignature(q) {
  const normText = normalizeForCompare(q.question_text)
  const opts = [q.option_a, q.option_b, q.option_c, q.option_d]
    .map(normalizeForCompare)
    .sort()
  return `${q.category}|${normText}|${opts.join('~')}`
}

function buildDedupeSet(existingQuestions) {
  const seen = new Set()
  for (const q of existingQuestions) {
    seen.add(questionSignature(q))
  }
  return seen
}

// Aynı Wikipedia maddesinden üretilen sorular arasında, şablon metni farklı
// olsa bile (ör. "X hakkında doğru bilgi" vs "X ile ilgili doğru ifade") aynı
// olguyu (aynı doğru cevabı) soran BENZER sorular oluşabilir. Bunu yakalamak
// için karşılaştırmayı sadece "aynı kategori + aynı kaynak madde" grubuyla
// sınırlı tutuyoruz (performans için — binlerce soruya karşı tek tek
// kıyaslamak yerine küçük gruplara bakıyoruz).
function correctAnswerText(q) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[q.correct_answer] || ''
}

function buildSourceIndex(existingQuestions) {
  const idx = new Map()
  for (const q of existingQuestions) {
    const key = `${q.category}|${(q.source_title || '').toLowerCase()}`
    if (!idx.has(key)) idx.set(key, [])
    idx.get(key).push(q)
  }
  return idx
}

function isNearDuplicate(candidate, sourceIndex) {
  const key = `${candidate.category}|${(candidate.source_title || '').toLowerCase()}`
  const group = sourceIndex.get(key)
  if (!group || group.length === 0) return false
  const candCorrect = correctAnswerText(candidate)
  for (const existing of group) {
    if (isTooSimilar(candidate.question_text, existing.question_text)) return true
    if (candCorrect && isTooSimilar(candCorrect, correctAnswerText(existing))) return true
  }
  return false
}

function registerQuestion(q, seenTexts, sourceIndex) {
  seenTexts.add(questionSignature(q))
  const key = `${q.category}|${(q.source_title || '').toLowerCase()}`
  if (!sourceIndex.has(key)) sourceIndex.set(key, [])
  sourceIndex.get(key).push(q)
}

// ============================================
// "İŞLENMİŞ BAŞLIK" HAFIZASI (kalıcı, çalışmalar arası)
// ============================================
// Her kategori için hangi Wikipedia maddelerinin daha önce soru üretmek üzere
// kullanıldığını saklar. Bu olmadan sabit konu listesi (ör. 70-300 madde)
// hızla tükenir ve her cron aynı birkaç maddeyi tekrar tekrar seçmeye devam
// eder — tekrar eden soruların asıl kök nedeni budur.
function loadUsedTitles() {
  try {
    if (!existsSync(USED_TITLES_FILE)) return {}
    const data = JSON.parse(readFileSync(USED_TITLES_FILE, 'utf-8'))
    const out = {}
    for (const [k, v] of Object.entries(data)) out[k] = new Set(v)
    return out
  } catch (err) {
    console.warn('used-titles.json okunamadı, sıfırdan başlanıyor:', err.message)
    return {}
  }
}

function saveUsedTitles(usedMap) {
  const plain = {}
  for (const [k, set] of Object.entries(usedMap)) plain[k] = Array.from(set)
  const dir = dirname(USED_TITLES_FILE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(USED_TITLES_FILE, JSON.stringify(plain), 'utf-8')
}

function getUsedSet(usedMap, key) {
  if (!usedMap[key]) usedMap[key] = new Set()
  return usedMap[key]
}

// ============================================
// KONU CEPHESİ GENİŞLETME (sabit liste tükendiğinde)
// ============================================
// Sabit CATEGORIES.topics listesi başlangıç ("tohum") noktasıdır. Bir kategori
// için daha önce kullanılmamış N madde gerektiğinde, önce tohum listesinden
// kullanılmamışları alır; yetmezse Wikipedia arama API'si üzerinden tohum
// konularla ilişkili yeni başlıklar keşfederek (BFS) listeyi otomatik
// genişletir. Böylece havuz, elle liste büyütmeden de sürekli büyüyebilir.
async function expandTopicFrontier(seedTopics, usedSet, want) {
  const picked = []
  const localSeen = new Set()

  const freshSeeds = shuffle(seedTopics).filter((t) => !usedSet.has(t))
  for (const t of freshSeeds) {
    if (picked.length >= want) break
    if (localSeen.has(t)) continue
    localSeen.add(t)
    picked.push(t)
  }
  if (picked.length >= want) return picked

  // Tohumlar tükendi: ilişkili başlıklarla BFS genişletmesi yap.
  const queue = shuffle(seedTopics)
  let qi = 0
  let guard = 0
  while (picked.length < want && qi < queue.length && guard < want * 3) {
    const t = queue[qi++]
    guard++
    try {
      const related = await fetchRelatedTitles(t, 12)
      for (const r of related) {
        if (picked.length >= want) break
        if (localSeen.has(r) || usedSet.has(r)) continue
        localSeen.add(r)
        picked.push(r)
        queue.push(r) // ikinci derece komşulardan da beslenebilelim
      }
    } catch {
      // tek bir arama başarısız olursa akışı bozma, devam et
    }
  }
  return picked
}

// ============================================
// EŞ ZAMANLI ÇALIŞMA HAVUZU
// ============================================
// Binlerce madde tek tek (sıralı) işlenirse run çok uzun sürer. Basit bir
// eşzamanlılık havuzu ile Wikipedia'yı makul ölçüde paralel sorguluyoruz
// (varsayılan 8 eşzamanlı istek — çok yükseltme, engellenme riski artar).
async function runPool(items, worker, concurrency) {
  const results = []
  let idx = 0
  async function lane() {
    while (idx < items.length) {
      const my = idx++
      try {
        results[my] = await worker(items[my], my)
      } catch {
        results[my] = null
      }
    }
  }
  const lanes = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, lane)
  await Promise.all(lanes)
  return results
}

// ============================================
// ANA AKIŞ
// ============================================
async function run() {
  const startedAt = Date.now()
  console.log('═══════════════════════════════════════════════')
  console.log('  Soru Havuzu Güncelleme — Wikipedia Kaynaklı')
  console.log('  Sorular JSON olarak GitHub Pages üzerinde saklanır')
  console.log(`  Hedef: ~${TARGET_NEW_QUESTIONS} yeni soru | eşzamanlılık: ${FETCH_CONCURRENCY}`)
  console.log('═══════════════════════════════════════════════')

  const existingQuestions = loadExistingQuestions()
  console.log(`Mevcut soru havuzu: ${existingQuestions.length} soru`)

  // Dedup + benzer-soru kontrolü için indeksler (bkz. yukarıdaki açıklamalar)
  const seenTexts = buildDedupeSet(existingQuestions)
  const sourceIndex = buildSourceIndex(existingQuestions)
  console.log(`Dedup için ${seenTexts.size} soru imzası yüklendi.`)

  // Kalıcı "işlenmiş madde" hafızası: aynı maddeyi bir kategori için
  // tekrar tekrar seçip aynı soruları üretmeyi engeller.
  const usedTitles = loadUsedTitles()

  const newQuestions = []
  const stats = {}
  // Her kategoriye ayrılan hedef, toplam hedefe orantılı paylaştırılır
  // (karisik kategorisi kendi ayrı payını alır).
  const perCategoryTarget = Math.max(
    20,
    Math.floor((TARGET_NEW_QUESTIONS * 0.75) / CATEGORIES.length)
  )

  for (const cat of CATEGORIES) {
    if (newQuestions.length >= TARGET_NEW_QUESTIONS) break
    stats[cat.slug] = 0
    console.log(`\n▶ Kategori: ${cat.slug} (hedef ~${perCategoryTarget} soru)`)

    const usedSet = getUsedSet(usedTitles, cat.slug)
    const topics = await expandTopicFrontier(
      cat.topics,
      usedSet,
      Math.min(MAX_TOPICS_PER_CATEGORY, cat.topics.length + MAX_TOPICS_PER_CATEGORY)
    )
    console.log(`  ${topics.length} (daha önce kullanılmamış) madde bulundu.`)

    // Her madde için (konu × zorluk) iş birimleri oluştur, eşzamanlı işle
    const jobs = []
    for (const topic of topics) {
      for (const difficulty of DIFFICULTIES) {
        jobs.push({ topic, difficulty })
      }
    }

    await runPool(
      jobs,
      async ({ topic, difficulty }) => {
        if (newQuestions.length >= TARGET_NEW_QUESTIONS + perCategoryTarget) return null
        try {
          const q = await generateQuestionForTopic(topic, difficulty, cat.slug, seenTexts, sourceIndex)
          if (q) {
            newQuestions.push(q)
            stats[cat.slug]++
          }
        } catch (err) {
          console.warn(`  ! "${topic}" (${difficulty}) üretilirken hata: ${err.message}`)
        }
        return null
      },
      FETCH_CONCURRENCY
    )

    // Bu run'da denenen tüm maddeleri (soru üretsin/üretmesin) "kullanılmış"
    // olarak işaretle ki bir sonraki cron farklı maddelere geçsin.
    for (const t of topics) usedSet.add(t)

    console.log(`  ✓ ${cat.slug}: ${stats[cat.slug]} yeni soru`)
  }

  // "karisik" kategorisi için rastgele makale taraması
  console.log(`\n▶ Kategori: karisik (rastgele tarama, hedef ~${RANDOM_ARTICLE_COUNT} madde)`)
  stats['karisik'] = 0
  const randomUsedSet = getUsedSet(usedTitles, '__random__')

  // Rastgele maddeleri önce topluca çek (aynı anda birden fazla istek),
  // sonra her biri için soru üretmeye çalış.
  const randomArticles = []
  await runPool(
    Array.from({ length: RANDOM_ARTICLE_COUNT }),
    async () => {
      const article = await fetchRandomArticle()
      if (article?.title && !randomUsedSet.has(article.title)) {
        randomArticles.push(article)
      }
      return null
    },
    FETCH_CONCURRENCY
  )
  console.log(`  ${randomArticles.length} yeni (daha önce görülmemiş) rastgele madde alındı.`)

  await runPool(
    randomArticles,
    async (article) => {
      try {
        randomUsedSet.add(article.title)
        if (!article?.extract) return null

        let art = article
        if (Math.random() < 0.4) {
          const related = await fetchRelatedTitles(art.title, 8)
          if (related.length > 0) {
            const deeper = await fetchSummary(related[Math.floor(Math.random() * related.length)])
            if (deeper) art = deeper
          }
        }

        const sentences = splitSentences(art.extract)
        if (sentences.length === 0) return null

        const relatedTitles = await fetchRelatedTitles(art.title, 10)
        const distractorSummaries = []
        for (const t of pickN(relatedTitles, Math.min(relatedTitles.length, 5))) {
          const summary = await fetchSummary(t)
          if (summary?.extract) {
            const s = splitSentences(summary.extract)
            if (s.length > 0) distractorSummaries.push(s[0])
          }
        }
        if (distractorSummaries.length < 3) return null

        const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)]

        let q = null
        if (Math.random() < 0.3) {
          q = generateYearQuestion({ article: art, sentences, difficulty, category: 'karisik' })
        }
        if (!q) {
          q = generateDefinitionQuestion({
            article: art,
            sentences,
            distractorSentences: distractorSummaries,
            difficulty,
            category: 'karisik',
          })
        }

        if (q) {
          if (seenTexts.has(questionSignature(q))) return null
          if (isNearDuplicate(q, sourceIndex)) return null
          registerQuestion(q, seenTexts, sourceIndex)
          newQuestions.push(q)
          stats['karisik']++
        }
      } catch (err) {
        console.warn(`  ! Rastgele madde işlenirken hata: ${err.message}`)
      }
      return null
    },
    FETCH_CONCURRENCY
  )
  console.log(`  ✓ karisik: ${stats['karisik']} yeni soru`)

  // ============================================
  // JSON DOSYASINA YAZMA (incremental merge) + hafızayı kaydet
  // ============================================
  const allQuestions = [...existingQuestions, ...newQuestions]
  saveQuestions(allQuestions)
  saveUsedTitles(usedTitles)

  const durationSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n═══════════════════════════════════════════════')
  console.log(`  Tamamlandı: ${newQuestions.length} yeni soru eklendi`)
  console.log(`  Toplam soru havuzu: ${allQuestions.length} soru`)
  console.log(`  Süre: ${durationSec}s`)
  Object.entries(stats).forEach(([slug, n]) => console.log(`   - ${slug}: ${n}`))
  console.log('═══════════════════════════════════════════════')

  if (newQuestions.length === 0) {
    console.log('  Yeni soru üretilmedi. Havuz korundu.')
  }
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
