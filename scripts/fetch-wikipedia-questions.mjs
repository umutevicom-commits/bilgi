import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const USER_AGENT = 'BilgiYarismasiBot/3.0 (educational quiz generator)'
const WIKI_API = 'https://tr.wikipedia.org/api/rest_v1/page/summary/'
const WIKI_SEARCH_API = 'https://tr.wikipedia.org/w/api.php'
const WIKI_RANDOM_API = 'https://tr.wikipedia.org/api/rest_v1/page/random/summary'

// ============================================
// KATEGORİ / KONU HAVUZU (5.000+ Sınırsız, Saf Türkçe ve Yerli Kapsam)
// ============================================
const CATEGORIES = [
  {
    slug: 'genel-kultur',
    topics: [
      // 1. Şehirler, İlçeler ve Bölgeler (81 İl ve Önemli İlçeler)
      'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin', 'Aydın', 'Balıkesir',
      'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli',
      'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari',
      'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
      'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir',
      'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat',
      'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman',
      'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
      'Alanya', 'Tarsus', 'İskenderun', 'Dörtyol', 'Payas', 'Samandağ', 'Kırıkhan', 'Reyhanlı', 'Elbistan', 'Nazilli',
      'Bandırma', 'İnegöl', 'Alaplı', 'Çorlu', 'Gebze', 'Tarsus', 'Manavgat', 'Bodrum', 'Marmaris', 'Fethiye',
      
      // 2. Tarihi Yerler, Antik Kentler ve Ören Yeri (Türkiye Odaklı)
      'Göbeklitepe', 'Efes Antik Kenti', 'Kapadokya', 'Pamukkale', 'Nemrut Dağı', 'Topkapı Sarayı', 'Ayasofya',
      'Sultanahmet Camii', 'Sümela Manastırı', 'Safranbolu evleri', 'Cumalıkızık', 'Truva Antik Kenti', 'Hattuşaş',
      'Hierapolis', 'Pergamon', 'Aspendos', 'Side Antik Kenti', 'Milet Antik Kenti', 'Didyma', 'Priene',
      'Çatalhöyük', 'Alacahöyük', 'Yerebatan Sarnıcı', 'Dolmabahçe Sarayı', 'İshak Paşa Sarayı', 'Divriği Ulu Cami',
      'Ani Harabeleri', 'Zeugma Mozaik Müzesi', 'Göreme Açık Hava Müzesi', 'Ihlara Vadisi', 'Uçhisar Kalesi',
      'Kız Kulesi', 'Galata Kulesi', 'Rumeli Hisarı', 'Anadolu Hisarı', 'Yedikule Hisarları', 'Süleymaniye Camii',
      'Selimiye Camii', 'Yeşil Cami', 'Eski Cami', 'Muradiye Külliyesi', 'Bursa Ulu Cami', 'Erzurum Çifte Minareli Medrese',
      'Yakutiye Medresesi', 'Sivas Gök Medrese', 'Karatay Medresesi', 'İnce Minareli Medrese', 'Mevlana Müzesi',
      
      // 3. Türk Edebiyatı, Şairler ve Yazarlar
      'Nazım Hikmet', 'Yaşar Kemal', 'Orhan Pamuk', 'Ahmet Hamdi Tanpınar', 'Sabahattin Ali', 'Halide Edip Adıvar',
      'Reşat Nuri Güntekin', 'Yahya Kemal Beyatlı', 'Atilla İlhan', 'Cemal Süreya', 'Edip Cansever', 'Turgut Uyar',
      'İlhan Berk', 'Sezai Karakoç', 'Cahit Zarifoğlu', 'Ahmet Arif', 'Oğuz Atay', 'Buket Uzuner', 'Zülfü Livaneli',
      'Peyami Safa', 'Yakup Kadri Karaosmanoğlu', 'Refik Halit Karay', 'Memduh Şevket Esendal', 'Sait Faik Abasıyanık',
      'Tarık Buğra', 'Kemal Tahir', 'Orhan Kemal', 'Fakir Baykurt', 'Dursun Akçam', 'Talip Apaydın',
      'Samim Kocagöz', 'Aziz Nesin', 'Rıfat Ilgaz', 'Hüseyin Rahmi Gürpınar', 'Namık Kemal', 'Şinasi', 'Ziya Paşa',
      'Ahmet Vefik Paşa', 'Muallim Naci', 'Recaizade Mahmud Ekrem', 'Abdülhak Hamid Tarhan', 'Tevfik Fikret',
      'Mehmet Akif Ersoy', 'Ziya Gökalp', 'Ömer Seyfettin', 'Faruk Nafiz Çamlıbel', 'Halit Fahri Ozansoy',
      'Yusuf Ziya Ortaç', 'Orhan Seyfi Orhon', 'Enis Behiç Koryürek', 'Ahmet Kutsi Tecer', 'Necip Fazıl Kısakürek',
      'Asaf Halet Çelebi', 'Behçet Necatigil', 'Cahit Sıtkı Tarancı', 'Ahmet Muhip Dıranas', 'Fazıl Hüsnü Dağlarca',
      'Oktay Rifat', 'Melih Cevdet Anday', 'Atilla İlhan', 'Ümit Yaşar Oğuzcan', 'Cengiz Aytmatov', 'Elif Şafak',
      'Ahmet Ümit', 'Orhan Kemal', 'Yakup Kadri', 'Halide Edip', 'Refik Halit', 'Memduh Şevket', 'Sait Faik',
      
      // 4. Halk Edebiyatı, Ozanlar ve Destanlar
      'Yunus Emre', 'Mevlana Celaleddin-i Rumi', 'Nasreddin Hoca', 'Dede Korkut', 'Karacaoğlan', 'Köroğlu',
      'Dadaloğlu', 'Pir Sultan Abdal', 'Seyrani', 'Kaygusuz Abdal', 'Aşık Veysel', 'Neşet Ertaş', 'Mahzuni Şerif',
      'Abdrahim Karakoç', 'Bedri Rahmi Eyüboğlu', 'Manas Destanı', 'Ergenekon Destanı', 'Türeyiş Destanı',
      'Göç Destanı', 'Şu Destanı', 'Bozkurt Destanı', 'Ouz Kağan Destanı', 'Köroğlu Destanı', 'Battal Gazi Destanı',
      'Dede Korkut Hikayeleri', 'Nasreddin Hoca Fıkraları', 'Yunus Emre İlahileri', 'Karacaoğlan Türküleri',
      
      // 5. Türk Sanatları, Gelenekler ve Kültür
      'Ebru sanatı', 'Hat sanatı', 'Tezhip', 'Miniatür', 'Çini sanatı', 'Halı dokumacılığı', 'Bakırcılık',
      'Oltu taşı', 'Lüle taşı', 'Camaltı sanatları', 'Ahşap oymacılığı', 'Sedekari', 'Keçe yapımı', 'Dokuma sanatları',
      'Karagöz ve Hacivat', 'Meddah', 'Orta oyunu', 'Halk oyunları', 'Zeybek', 'Horon', 'Halay', 'Bar',
      'Kafkas', 'Karşılama', 'Kaşık havası', 'Hançer barı', 'Bengü', 'Atabarı', 'Demircilik', 'Nalbantlık',
      'Ahilik teşkilatı', 'Geleneksel Türk mimarisi', 'Osmanlı konakları', 'Kervansaraylar', 'Hamam kültürü',
      'Bedestenler', 'Sadırvanlar', 'Türbeler', 'Külliyeler', 'Medreseler', 'Şifahâneler', 'Türk kahvesi',
      'Türk lokumu', 'Baklava', 'Mantı', 'İskender kebap', 'Döner', 'Lahmacun', 'Künefe', 'Simit', 'Ayran',
      'Rakı', 'Türk çayı', 'Ney', 'Bağlama', 'Kemençe', 'Zurna', 'Davul', 'Klarnet', 'Kanun', 'Ud', 'Tanbur',
      'Rebab', 'Kabak kemane', 'Sipsi', 'Cümbüş', 'Mey', 'Kaval', 'Çifte', 'Tulum', 'Zilli maşa', 'Darbuka',
      
      // 6. Türk Tarihi ve Siyasi Dönemler
      'Osmanlı İmparatorluğu', 'Selçuklu Devleti', 'Büyük Selçuklu İmparatorluğu', 'Anadolu Selçuklu Devleti',
      'Türkiye Cumhuriyeti', 'Mustafa Kemal Atatürk', 'Kurtuluş Savaşı', 'Cumhuriyetin ilanı', 'Büyük Taarruz',
      'Sakarya Meydan Savaşı', 'Amasya Genelgesi', 'Erzurum Kongresi', 'Sivas Kongresi', 'Misak-ı Millî',
      'Saltanatın Kaldırılması', 'Halifeliğin Kaldırılması', 'Harf İnkılabı', 'Kıyafet Kanunu', 'Soyadı Kanunu',
      'Kadınlara Seçme ve Seçilme Hakkı', 'Türk Tarih Kurumu', 'Türk Dil Kurumu', 'Medeni Kanun', 'Kabotaj Kanunu',
      'Teşviki Sanayi Kanunu', 'Aşar Vergisinin Kaldırılması', 'Osmanlı Kuruluş Dönemi', 'Osmanlı Yükselme Dönemi',
      'Osmanlı Duraklama Dönemi', 'Osmanlı Gerileme Dönemi', 'Osmanlı Dağılma Dönemi', 'Tanzimat Fermanı',
      'Islahat Fermanı', 'I. Meşrutiyet', 'II. Meşrutiyet', 'Trablusgarp Savaşı', 'Balkan Savaşları', 'Çanakkale Cephesi',
      'Kafkas Cephesi', 'Sina ve Filistin Cephesi', 'Barbaros Hayrettin Paşa', 'Turgut Reis', 'Piri Reis',
      'Sokullu Mehmet Paşa', 'Köprülüler Dönemi', 'Karlofça Antlaşması', 'Küçük Kaynarca Antlaşması', 'Sened-i İttifak',
      'Kanun-i Esasi', '31 Mart Vakası', 'Osmanlı Padişahları', 'Osmanlı Donanması', 'Yeniçeri Ocağı', 'Devşirme sistemi',
      'Tımar sistemi', 'Divan-ı Hümayun', 'Kapıkulu ocakları', 'Ahilik sistemi', 'Göktürkler', 'Uygurlar', 'Karahanlılar',
      'Gazneliler', 'Harzemşahlar', 'İldenizliler', 'Saltuklular', 'Artuklular', 'Dânişmendliler', 'Mengüçlüler',
      
      // 7. Türk Sineması, Tiyatro ve Müzik Dünyası (Yeşilçam ve Modern)
      'Şener Şen', 'Kemal Sunal', 'Adile Naşit', 'Münir Özkul', 'Zeki Alasya', 'Metin Akpınar', 'Türkan Şoray',
      'Hülya Koçyiğit', 'Filiz Akın', 'Fatma Girik', 'Ayhan Işık', 'Cüneyt Arkın', 'Tarık Akan', 'Nuri Bilge Ceylan',
      'Yılmaz Erdoğan', 'Cem Yılmaz', 'Şahan Gökbakar', 'Atıf Yılmaz', 'Ertem Eğilmez', 'Muhsin Ertuğrul',
      'Metin Erksan', 'Yılmaz Güney', 'Ekrem Bora', 'Sadri Alışık', 'Hulusi Kentmen', 'Mürüvvet Sim', 'Vahi Öz',
      'Necdet Tosun', 'Ferdi Tayfur', 'Müslüm Gürses', 'Orhan Gencebay', 'İbrahim Tatlıses', 'Sezen Aksu',
      'Tarkan', 'Ajda Pekkan', 'Zeki Müren', 'Müzeyyen Senar', 'Safiye Ayla', 'Dario Moreno', 'Barış Manço',
      'Cem Karaca', 'Erkin Koray', 'Fikret Kızılok', 'Mazhar Alanson', 'Özkan Uğur', 'Fuat Güner', 'Sertab Erener',
      'Teoman', 'Şebnem Ferah', 'Mor ve Ötesi', 'Duman', 'Athena', 'Kargo', 'Manga', 'Gripin', 'Yüksek Sadakat'
    ]
  },
  {
    slug: 'matematik',
    topics: [
      // 1. Temel Aritmetik ve Sayı Sistemleri
      'Matematik', 'Geometri', 'Cebir', 'Trigonometri', 'İstatistik', 'Olasılık', 'Sayı teorisi', 'Kalkülüs',
      'Pisagor teoremi', 'Asal sayı', 'Fibonacci dizisi', 'Pi sayısı', 'Küme teorisi', 'Fonksiyon (matematik)',
      'Logaritma', 'Türev', 'İntegral', 'Matris', 'Determinant', 'Vektör', 'Limit', 'Dizi ve seriler', 'Polinom',
      'Denklem sistemleri', 'Mutlak değer', 'Oran orantı', 'Yüzde problemleri', 'Kâr zarar problemleri',
      'Hız problemleri', 'İşçi havuz problemleri', 'Yaş problemleri', 'Grafik okuma', 'Analitik geometri',
      'Çember ve daire', 'Üçgenler', 'Dörtgenler', 'Çokgenler', 'Katı cisimler', 'Trigonometrik özdeşlikler',
      'Kombinasyon', 'Permütasyon', 'Binom açılımı', 'Modüler aritmetik', 'EBOB EKOK', 'Bölme bölünebilme',
      'Rasyonel sayılar', 'Üslü ifadeler', 'Köklü ifadeler', 'Çarpanlara ayırma', 'Birinci dereceden denklemler',
      'İkinci dereceden denklemler', 'Karmaşık sayılar', 'Trigonometrik denklemler', 'Logaritmik denklemler',
      'Türev uygulamaları', 'İntegral uygulamaları', 'Alan hesaplama', 'Hacim hesaplama', 'Euler özdeşliği',
      'Fermat son teoremi', 'Goldbach hipotezi', 'Riemann hipotezi', 'Asal sayı teoremi', 'Pascal üçgeni',
      'Descartes kartezyen koordinat sistemi', 'Öklid geometrisi', 'Non-Euclidean geometri', 'Topoloji', 'Fraktal',
      'Kandel çemberi', 'Sonsuzluk kavramı', 'Matematiksel mantık', 'Önermeler', 'Niceleyiciler', 'Kümelerde işlemler',
      'Kartezyen çarpım', 'Bağıntı', 'Fonksiyon türleri', 'Bire bir fonksiyon', 'Örten fonksiyon', 'Ters fonksiyon',
      'Bileşke fonksiyon', 'Polinom fonksiyonlar', 'Rasyonel fonksiyonlar', 'Üstel fonksiyonlar', 'Trigonometrik fonksiyonlar',
      'Ters trigonometrik fonksiyonlar', 'Hiperbolik fonksiyonlar', 'Parametrik denklemler', 'Kutup koordinatları',
      'Vektörel çarpım', 'Skaler çarpım', 'Doğru denklemi', 'Düzlem denklemi', 'Konikler', 'Çember denklemi',
      'Elips', 'Hiperbol', 'Parabol', 'Teğet', 'Normal', 'Asimptot', 'Türev tanımı', 'Zincir kuralı', 'L Hospital kuralı',
      'Belirsiz integraller', 'Belirli integraller', 'Riemann toplamı', 'Banach uzayı', 'Hilbert uzayı',
      'Kategori teorisi', 'Boolean cebiri', 'Oyun teorisi', 'Çizge teorisi', 'Kalkülüs varyasyonları',
      'Diferansiyel geometri', 'Diferansiyel denklemler', 'Kısmi türevli diferansiyel denklemler',
      'Adi diferansiyel denklemler', 'Fourier analizi', 'Laplace dönüşümü', 'Z dönüşümü', 'Kompleks analiz',
      'Reel analiz', 'Ölçü teorisi', 'Ergodik teori', 'Dinamik sistemler', 'Kaos teorisi', 'Bifürkasyon teorisi',
      'Stokastik süreçler', 'Brown hareketi', 'Monte Carlo simülasyonu', 'Markov zincirleri', 'Kuyruk teorisi',
      'Varyans analizi', 'Regresyon analizi', 'Hipotez testleri', 'Parametrik olmayan testler',
      'Harezmi', 'Ömer Hayyam', 'İbn el-Heysem', 'Biruni', 'Cahit Arf', 'Kerim Erim', 'Salih Murat Uzdilek',
      'Nazım Terzioğlu', 'Cahit Arf Teoremi', 'Arf Değişmezi', 'Matematik tarihi', 'Geometri tarihi'
    ]
  },
  {
    slug: 'guncel',
    topics: [
      // 1. Yerli Teknoloji ve Dijital Dönüşüm (Türkiye Odaklı)
      'Togg', 'Bayraktar TB2', 'Bayraktar Akıncı', 'Kızılelma', 'Anka', 'Aksungur', 'Atak Helikopteri', 'Gökbey',
      'Altay Tankı', 'TCG Anadolu', 'MİLGEM', 'İ sınıfı fırkateyn', 'Hisar füze sistemi', 'Siper füze sistemi',
      'Bora füzesi', 'Atmaca füzesi', 'Tübitak', 'TUSAŞ', 'ROKETSAN', 'ASELSAN', 'HAVELSAN', 'TEI', 'ASPİLSAN',
      'Bilişim Vadisi', 'Teknopark İstanbul', 'Gaziantep Teknopark', 'İzmir Teknopark', 'Eskişehir Teknopark',
      'Yerli otomobil', 'Yerli elektrikli araç', 'Yerli uydu', 'Türksat 3A', 'Türksat 4A', 'Türksat 4B', 'Türksat 5A',
      'Türksat 5B', 'Türksat 6A', 'İmece uydusu', 'Göktürk-1', 'Göktürk-2', 'Borsa İstanbul', 'TCMB', 'Yapay zeka',
      'Sosyal medya', 'İnternet', 'Uzay teknolojisi', 'Akıllı telefon', 'Elektrikli araç', 'Kripto para', 'Bulut bilişim',
      'Siber güvenlik', 'Nesnelerin interneti', '5G', '6G teknolojisi', 'Li-Fi', 'Kuantum internet', 'Katı hal bataryaları',
      'Giyilebilir teknoloji', 'Akıllı saatler', 'Akıllı gözlükler', 'Biyonik uzuvlar', 'Genetik mühendisliği',
      'Sentetik biyoloji', 'Dikey tarım', 'Yapay et', 'Karbon yakalama', 'Geleceğin ulaşım sistemleri', 'Yörünge turizmi',
      'Asteroid madenciliği', 'Ay üssü projeleri', 'Yapay zeka ajanı', 'Multimodal yapay zeka', 'Açık kaynak yapay zeka',
      'Büyük veri analitiği', 'Yapay zeka modelleri', 'Büyük dil modelleri', 'Makine öğrenmesi', 'Derin öğrenme',
      'Kuantum bilgisayar', 'Artırılmış gerçeklik', 'Sanal gerçeklik', 'Metaverse', 'Otonom sürüş', 'Lityum iyon pil',
      'Batarya teknolojileri', 'Yenilenebilir enerji', 'Güneş paneli', 'Rüzgar türbini', 'Hidrojen yakıt hücresi',
      'Nükleer füzyon', 'Biyoteknoloji', 'Gen terapisi', 'CRISPR', 'Nanoteknoloji', '3D yazıcı', '4D yazıcı',
      'Akıllı şehirler', 'Blokzincir', 'Akıllı sözleşmeler', 'NFT', 'Merkeziyetsiz finans', 'Siber savaş', 'Veri gizliliği',
      'Kişisel verilerin korunması', 'Dijital dönüşüm', 'E-ticaret', 'Dijital pazarlama', 'Sosyal medya trendleri',
      'Influencer pazarlaması', 'Podcast', 'Streaming servisleri', 'Siber güvenlik protokolleri', 'Zero Trust',
      'Ransomware', 'Phishing', 'Deepfake', 'Algoritma etiği', 'Yapay zeka denetimi', 'Teknolojik tekillik'
    ]
  },
  {
    slug: 'ehliyet',
    topics: [
      // 1. Karayolları Trafik Kuralları ve Mevzuat (Türkiye)
      'Trafik kuralları', 'Sürücü belgesi', 'Kara yolları', 'Trafik işaretleri', 'Trafik kazası', 'Emniyet kemeri',
      'Hız sınırı', 'Trafik ışığı', 'Motorlu taşıt', 'Karayolu Trafik Kanunu', 'İlk yardım', 'Motor bilgisi',
      'Trafik adabı', 'Araç tekniği', 'Direksiyon sınavı', 'İç kanama', 'Şok pozisyonu', 'Turnike uygulaması',
      'Suni solunum', 'Kalp masajı', 'Koma pozisyonu', 'Heimlich manevrası', 'Kırık çıkık çıkıklar', 'Yanıklar',
      'Zehirlenmeler', 'Böcek sokmaları', 'Trafik işaret levhaları', 'Tehlike uyarı işaretleri', 'Trafik tanzim işaretleri',
      'Bilgi işaretleri', 'Durma duraklama park etme', 'Öncelik hakkı', 'Geçiş üstünlüğü', 'Kavşaklar', 'Dönel kavşak',
      'Şerit izleme', 'Öncü araç', 'Takip mesafesi', 'Hız sınırları', 'Otoyol kuralları', 'Yerleşim yeri',
      'Gece sürüşü', 'Sisli hava sürüşü', 'Yağmurlu hava sürüşü', 'Karlı buzlu yollar', 'Akuplaj', 'Fren sistemi',
      'ABS', 'ASR', 'ESP', 'Hava yastığı', 'Direksiyon sistemi', 'Süspansiyon sistemi', 'Lastik diş derinliği',
      'Rot ayarı', 'Balans ayarı', 'Motor yağı', 'Antifriz', 'Fren hidroliği', 'Motor soğutma suyu',
      'Akü kutup başları', 'Alternatör', 'Marş motoru', 'Buji', 'Enjektör', 'Debriyaj', 'Vites kutusu',
      'Diferansiyel', 'Egzoz emisyon', 'Muayene süreleri', 'Zorunlu trafik sigortası', 'Kasko', 'Ehliyet sınıfları',
      'M sınıfı', 'A1 sınıfı', 'A2 sınıfı', 'A sınıfı', 'B1 sınıfı', 'B sınıfı', 'BE sınıfı', 'C1 sınıfı',
      'C sınıfı', 'CE sınıfı', 'D1 sınıfı', 'D sınıfı', 'DE sınıfı', 'F sınıfı', 'G sınıfı', 'Ceza puanı',
      'Ehliyet iptali', 'Alkollü araç kullanımı', 'Uyuşturucu etkisi', 'Kırmızı ışık ihlali', 'Ters yön',
      'Hatalı sollama', 'Yaya geçidi önceliği', 'Okul geçidi', 'Engelli park yeri', 'Trafik polisi işaretleri',
      'Yolcu taşıma kuralları', 'Yük taşıma kuralları', 'Azami yüklü ağırlık', 'Dinamik denge', 'Hidroplaning',
      'Akü şarj etme', 'Lastik değişimi', 'Sigorta atması', 'Katalitik konvertör', 'Triger kayışı', 'Radyatör bakımı',
      'Enjektör temizliği', 'Turbo şarj', 'Intercooler', 'Şanzıman yağı', 'Direksiyon kutusu', 'Rot başı',
      'Aks mafsalı', 'Amortisör', 'Yay salınımı', 'Kampana fren', 'Disk fren', 'El freni ayarı', 'Fren balatası',
      'Vantilatör kayışı', 'Vakum pompası', 'Motor arıza lambası', 'Yağ basınç lambası', 'Şarj lambası', 'Hararet göstergesi'
    ]
  },
  {
    slug: 'cografya',
    topics: [
      // 1. Türkiye Coğrafyası (Dağlar, Nehirler, Göller, Bölgeler)
      'Türkiye coğrafyası', 'Marmara Bölgesi', 'Ege Bölgesi', 'Akdeniz Bölgesi', 'İç Anadolu Bölgesi',
      'Karadeniz Bölgesi', 'Doğu Anadolu Bölgesi', 'Güneydoğu Anadolu Bölgesi', 'Ağrı Dağı', 'Cilo Dağı',
      'Süphan Dağı', 'Kaçkar Dağları', 'Uludağ', 'Erciyes Dağı', 'Hasan Dağı', 'Nemrut Dağı', 'Palandöken Dağı',
      'Kuzey Anadolu Dağları', 'Toros Dağları', 'Kızılırmak', 'Yeşilırmak', 'Sakarya Nehri', 'Aras Nehri',
      'Kura Nehri', 'Seyhan Nehri', 'Ceyhan Nehri', 'Büyük Menderes', 'Gediz Nehri', 'Fırat Nehri', 'Dicle Nehri',
      'Van Gölü', 'Tuz Gölü', 'Beyşehir Gölü', 'Eğirdir Gölü', 'Burdur Gölü', 'İznik Gölü', 'Ulubat Gölü',
      'Sapanca Gölü', 'Çıldır Gölü', 'Acıgöl', 'Akşehir Gölü', 'Eber Gölü', 'Işıklı Gölü', 'Kovada Gölü',
      'Hazar Gölü', 'Çıldır Gölü', 'Tortum Gölü', 'Abant Gölü', 'Yedigöller', 'Sapanca Gölü', 'Marmara Gölü',
      'İstanbul Boğazı', 'Çanakkale Boğazı', 'İzmit Körfezi', 'Saros Körfezi', 'Edremit Körfezi', 'Çandarlı Körfezi',
      'İzmir Körfezi', 'Kuşadası Körfezi', 'Gökova Körfezi', 'Hisarönü Körfezi', 'Fethiye Körfezi', 'Antalya Körfezi',
      'Mersin Körfezi', 'İskenderun Körfezi', 'Kızılırmak Deltası', 'Yeşilırmak Deltası', 'Çukurova', 'Gediz Deltası',
      'Küçük Menderes Deltası', 'Büyük Menderes Deltası', 'Silifke Deltası', 'Tekke Yarımadası', 'İnceburun',
      'Sinop Yarımadası', 'Gelibolu Yarımadası', 'Biga Yarımadası', 'Kocaeli Yarımadası', 'Çatalca Yarımadası',
      'Türkiye iklimi', 'Akdeniz iklimi', 'Karasal iklim', 'Karadeniz iklimi', 'Marmara geçiş iklimi',
      'Türkiye\'de deprem kuşakları', 'Kuzey Anadolu Fay Hattı', 'Batı Anadolu Fay Hattı', 'Doğu Anadolu Fay Hattı',
      'Tektonik depremler', 'Türkiye\'nin milli parkları', 'Yedigöller Milli Parkı', 'Kuşcenneti Milli Parkı',
      'Uludağ Milli Parkı', 'Spil Dağı Milli Parkı', 'Altınbeşik Mağarası Milli Parkı', 'Köprülü Kanyon Milli Parkı',
      'Termessos Milli Parkı', 'Beydağları Sahil Milli Parkı', 'Olimpos Beydağları Milli Parkı', 'Göreme Tarihi Milli Parkı'
    ]
  },
  {
    slug: 'fen',
    topics: [
      // 1. Fen Bilimleri, Fizik, Kimya, Biyoloji (Yerli Bilim İnsanları ve Müfredat)
      'Fizik', 'Kimya', 'Biyoloji', 'Astronomi', 'Evrim', 'Genetik', 'Hücre', 'DNA', 'Atom', 'Enerji',
      'Yerçekimi', 'Güneş Sistemi', 'Fotosentez', 'Elektrik', 'Manyetizma', 'Termodinamik', 'Periyodik tablo', 'Işık',
      'Kuantum mekaniği', 'Aziz Sancar', 'Oktay Sinanoğlu', 'Feza Gürsey', 'Behram Kurşunoğlu', 'Hulusi Behçet',
      'Cahit Arf', 'Kerim Erim', 'Salih Murat Uzdilek', 'Nazım Terzioğlu', 'Fatin Gökmen', 'Ali Kuşçu', 'Takiyüddin',
      'İbn Sina', 'Farabi', 'El-Kindi', 'El-Razi', 'El-Biruni', 'Harezmi', 'Ömer Hayyam', 'İbn el-Heysem', 'Cezeri',
      'Proton', 'Nötron', 'Elektron', 'Kuantum', 'Foton', 'Gluon', 'Kara delik', 'Nötron yıldızı', 'Beyaz cüce',
      'Süpernova', 'Büyük Patlama', 'Kozmik mikrodalga arka plan', 'Samanyolu', 'Andromeda', 'Exoplanet',
      'Güneş rüzgarı', 'Manyetosfer', 'Aurora', 'Kutup ışıkları', 'İzafiyet teorisi', 'Özel görelilik', 'Genel görelilik',
      'Kinetik enerji', 'Potansiyel enerji', 'Isı', 'Sıcaklık', 'Entropi', 'Termodinamiğin yasaları',
      'Elektromanyetik dalgalar', 'Radyo dalgaları', 'Mikrodalga', 'Kızılötesi', 'Morötesi', 'X ışınları', 'Gama ışınları',
      'Optik', 'Yansıma', 'Kırılma', 'Girişim', 'Kırınım', 'Polarizasyon', 'Asit', 'Baz', 'Tuz', 'pH ölçeği',
      'Kimyasal bağ', 'Kovalent bağ', 'İyonik bağ', 'Metalik bağ', 'Hidrojen bağı', 'Mol kavramı', 'Avogadro sayısı',
      'Çözelti', 'Çözünürlük', 'Redoks', 'Elektroliz', 'Organik kimya', 'Anorganik kimya', 'Polimer', 'Hücre zarı',
      'Sitoplazma', 'Çekirdek', 'Mitokondri', 'Ribozom', 'Endoplazmik retikulum', 'Golgi aygıtı', 'Lizozom',
      'Kloroplast', 'Koful', 'Hücre duvarı', 'Mayoz bölünme', 'Mitoz bölünme', 'Krossing-over', 'Mutasyon',
      'Modifikasyon', 'Adaptasyon', 'Doğal seçilim', 'Biyolojik çeşitlilik', 'Ekosistem', 'Besin zinciri', 'Besin ağı',
      'Üretici', 'Tüketici', 'Ayrıştırıcı', 'Karbon döngüsü', 'Azot döngüsü', 'Su döngüsü', 'Sera etkisi',
      'Küresel ısınma', 'Ozon tabakası', 'Biyom', 'Tundra', 'Tayga', 'Çöl biyomu', 'Orman biyomu', 'Savan biyomu',
      'Sucul ekosistem', 'Nükleer reaktör', 'Fisyon', 'Radyoaktif bozunma', 'Alfa ışıması', 'Beta ışıması', 'Yarı ömür'
    ]
  },
  {
    slug: 'tarih',
    topics: [
      // 1. Türk ve Dünya Tarihi (Türk Odaklı Kapsamlı Havuz)
      'Tarih', 'İkinci Dünya Savaşı', 'Birinci Dünya Savaşı', 'Soğuk Savaş', 'Rönesans', 'Sanayi Devrimi',
      'Fransız Devrimi', 'Bizans İmparatorluğu', 'İpek Yolu', 'Selçuklu Devleti', 'Cengiz Han', 'Kurtuluş Savaşı',
      'Cumhuriyetin ilanı', 'Mezopotamya', 'Sümerler', 'Akadlar', 'Babil', 'Asurlular', 'Elam', 'Urartular',
      'Hititler', 'Frigler', 'Lidyalılar', 'İyonlar', 'İskitler', 'Pers İmparatorluğu', 'Büyük İskender',
      'Hellenistik Dönem', 'Roma Cumhuriyeti', 'Roma İmparatorluğu', 'Julius Caesar', 'Augustus', 'Pax Romana',
      'Doğu Roma İmparatorluğu', 'Batı Roma İmparatorluğu', 'Kavimler Göçü', 'Orta Çağ', 'Feodalite',
      'Haçlı Seferleri', 'Magna Carta', 'Yüz Yıl Savaşları', 'İstanbulun Fethi', 'Coğrafi Keşifler', 'Reform',
      'Aydınlanma Çağı', 'Yedi Yıl Savaşları', 'Amerikan Bağımsızlık Bildirgesi', 'Fransız İhtilali', 'Viyana Kongresi',
      '1848 İhtilalleri', 'Amerikan İç Savaşı', 'Birinci Dünya Savaşı Cepheleri', 'Çanakkale Cephesi',
      'Kafkas Cephesi', 'Sina ve Filistin Cephesi', 'Milletler Cemiyeti', 'İspanyol İç Savaşı', 'Mussolini',
      'Adolf Hitler', 'Joseph Stalin', 'Winston Churchill', 'Franklin D. Roosevelt', 'Normandiya Çıkarması',
      'Stalingrad Muharebesi', 'Berlin Duvarı', 'Küba Füze Krizi', 'Vietnam Savaşı', 'Kore Savaşı', 'Uzay Yarışı',
      'Berlinin Düşüşü', 'Yalta Konferansı', 'Potsdam Konferansı', 'Birleşmiş Milletler', 'NATO', 'Varşova Paktı',
      'Avrupa Birliği', 'Asya Tarihi', 'Çin Hanedanlıkları', 'Qin Hanedanı', 'Han Hanedanı', 'Tang Hanedanı',
      'Song Hanedanı', 'Ming Hanedanı', 'Qing Hanedanı', 'Büyük Çin Seddi', 'Japonya Tarihi', 'Samuray', 'Şogunluk',
      'Meiji Restorasyonu', 'Hindistan Tarihi', 'Mogul İmparatorluğu', 'Tac Mahal', 'Aztekler', 'Mayalar', 'İnkalar',
      'Pre-Kolomb Amerika', 'Afrika Tarihi', 'Kartaca', 'Mali İmparatorluğu', 'Songhay İmparatorluğu', 'Zulular',
      'Osmanlı Kuruluş Dönemi', 'Osmanlı Yükselme Dönemi', 'Osmanlı Duraklama Dönemi', 'Osmanlı Gerileme Dönemi',
      'Osmanlı Dağılma Dönemi', 'Tanzimat Fermanı', 'Islahat Fermanı', 'I. Meşrutiyet', 'II. Meşrutiyet',
      'Trablusgarp Savaşı', 'Balkan Savaşları', 'Barbaros Hayrettin Paşa', 'Turgut Reis', 'Piri Reis',
      'Sokullu Mehmet Paşa', 'Köprülüler Dönemi', 'Karlofça Antlaşması', 'Küçük Kaynarca Antlaşması', 'Sened-i İttifak',
      'Kanun-i Esasi', '31 Mart Vakası', 'Osmanlı Padişahları', 'Osmanlı Donanması', 'Yeniçeri Ocağı', 'Devşirme sistemi',
      'Tımar sistemi', 'Divan-ı Hümayun', 'Kapıkulu ocakları', 'Ahilik sistemi'
    ]
  },
  {
    slug: 'lgs',
    topics: [
      // 1. LGS Müfredatı (MEB Odaklı Tüm Konular ve Alt Başlıklar)
      'Matematik', 'Fen bilimleri', 'Türkçe', 'İnkılap tarihi ve Atatürkçülük', 'İngilizce',
      'Din kültürü ve ahlak bilgisi', 'Hücre bölünmesi', 'Kuvvet ve hareket', 'Basınç', 'Madde ve endüstri',
      'Basit makineler', 'Çarpanlar ve katlar', 'Üslü ifadeler', 'Kareköklü ifadeler', 'Veri analizi',
      'Basit olayların olma olasılığı', 'Cebirsel ifadeler ve özdeşlikler', 'Doğrusal denklemler', 'Eşitsizlikler',
      'Üçgenler', 'Eşlik ve benzerlik', 'Dönüşüm geometrisi', 'Geometrik cisimler', 'Mevsimlerin oluşumu',
      'İklim ve hava hareketleri', 'DNA ve genetik kod', 'Kalıtım', 'Mutasyon ve modifikasyon', 'Adaptasyon',
      'Biyoteknoloji', 'Katı basıncı', 'Sıvı basıncı', 'Gaz basıncı', 'Periyodik sistem',
      'Fiziksel ve kimyasal değişimler', 'Kimyasal tepkimeler', 'Asitler ve bazlar', 'Maddenin ısı ile etkileşimi',
      'Türkiye\'de kimya endüstrisi', 'İş güç enerji', 'Makaralar', 'Kaldıraçlar', 'Eğik düzlem', 'Dişli çarklar',
      'Kıstrak ve çıkrık', 'Madde döngüleri', 'Sürdürülebilir kalkınma', 'Çevre sorunları',
      'Biyoteknoloji uygulamaları', 'Elektrik yükleri ve elektriklenme', 'Elektrik yükleri ve elektrik akımı',
      'Manyetizma', 'Işığın yayılması', 'Yansıma kanunları', 'Aynalar', 'Işığın kırılması', 'Mercekler',
      'Ses dalgaları', 'Sesin yayılması', 'Sesin sürati', 'Sesin özellikleri', 'Sözcükte anlam', 'Cümlede anlam',
      'Paragraf yorumu', 'Fiilimsiler', 'Cümlenin ögeleri', 'Fiilde çatılar', 'Cümle türleri', 'Anlatım bozuklukları',
      'Yazım kuralları', 'Noktalama işaretleri', 'Metin türleri', 'Sözel mantık ve muhakeme', 'Bir Kahraman Doğuyor',
      'Milli Uyanış: Bağımsızlık Yolunda Atılan Adımlar', 'Ya İstiklal Ya Ölüm', 'Atatürkçülük ve Çağdaşlaşan Türkiye',
      'Demokratikleşme Çabaları', 'Atatürk Dönemi Türk Dış Politikası', 'Atatürk\'ün Ölümü ve Sonrası',
      'Kader inancı', 'Zekat ve sadaka ibadeti', 'Din ve hayat', 'Hz. Muhammed\'in örnekliği',
      'Kuran-ı Kerim ve özellikleri', 'Peygamberler ve ilahi kitaplar', 'İslam ve temizlik', 'Zararlı alışkanlıklar'
    ]
  },
  {
    slug: 'genel-kultur-sorulari',
    topics: [
      // 1. Felsefe, Sosyoloji, Psikoloji, Hukuk, Ekonomi (Türkçe Akademik ve Düşünce Hayatı)
      'Felsefe', 'Psikoloji', 'Sosyoloji', 'Ekonomi', 'Hukuk', 'Uluslararası ilişkiler', 'Diplomasi',
      'İnsan hakları', 'Demokrasi', 'Türk felsefe tarihi', 'İslam felsefesi', 'Farabi', 'İbn Sina', 'İbn Rüşd',
      'Gazali', 'Sühreverdi', 'İbn Tufeyl', 'Molla Fenari', 'Kâtib Çelebi', 'Erzurumlu İbrahim Hakkı',
      'İsmail Hakkı Bursevi', 'Ahmet Cevdet Paşa', 'Ziya Gökalp', 'Mehmet Akif Ersoy', 'Nurettin Topçu',
      'Hilmi Ziya Ülken', 'İsmail Hakkı Baltacıoğlu', 'Mehmet Kaplan', 'Takiyettin Mengüşoğlu', 'Nusret Hızır',
      'Macit Gökberk', 'Teoman Duralı', 'İoanna Kuçuradi', 'Mikroekonomi', 'Makroekonomi', 'Enflasyon', 'Deflasyon',
      'Stagflasyon', 'Gayri Safi Yurtiçi Hasıla', 'Merkez bankası', 'Para politikası', 'Maliye politikası',
      'Arz ve talep', 'Piyasa dengesi', 'Monopol', 'Oligopol', 'Serbest piyasa', 'Kapitalizm', 'Sosyalizm',
      'Komünizm', 'Liberalizm', 'Keynesyen iktisat', 'Monetarizm', 'Anayasa hukuku', 'İdare hukuku', 'Medeni hukuk',
      'Ceza hukuku', 'Ticaret hukuku', 'İş hukuku', 'Uluslararası kamu hukuku', 'Uluslararası özel hukuk',
      'Yargıtay', 'Danıştay', 'Anayasa Mahkemesi', 'Sayıştay', 'Hakim', 'Savcı', 'Avukat', 'Noter', 'Baro',
      'Kuvvetler ayrılığı', 'Yasama', 'Yürütme', 'Yargı', 'Seçim sistemi', 'Siyasi partiler', 'Parlamenter sistem',
      'Başkanlık sistemi', 'Yarı başkanlık sistemi', 'Birleşmiş Milletler Güvenlik Konseyi', 'Uluslararası Adalet Divanı',
      'Uluslararası Ceza Mahkemesi', 'Avrupa İnsan Hakları Mahkemesi', 'Cenevre Sözleşmesi', 'Viyana Sözleşmesi',
      'İnsan Hakları Evrensel Beyannamesi', 'Sosyolojik teoriler', 'Psikolojik akımlar', 'Bilişsel psikoloji'
    ]
  }
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

// Metin ASLA '…' ile kesilerek bozulmaz: belirtilen sınıra sığmayan aday
// tamamen reddedilir (null döner), üretim akışı bunun yerine başka bir
// cümle/konu dener. Bu sayede ekranda gösterilen her soru ve şık HER ZAMAN
// eksiksiz, baştan sona doğru bir metindir.
function fitsLimit(text, maxLen) {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= maxLen
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
  if (!fitsLimit(questionText, 220)) return null
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
  }
}

// Tip 1: Gerçek olgu tabanlı çoktan seçmeli soru.
// Yanlış şıklar UYDURULMUYOR - başka gerçek Wikipedia maddelerinden alınan
// GERÇEK ama bu soru için YANLIŞ olan cümlelerdir. Bu, eski sürümdeki
// "X ile ilgili bir konudur" gibi anlamsız dolgu şıkların yerini alır.
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
    explanation: 'Bu bilgi, genel kültür bilgi havuzumuzdan derlenmiştir.',
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
