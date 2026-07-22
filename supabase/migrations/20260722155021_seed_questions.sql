/*
# Initial seed questions

Provides starter questions across categories and difficulty levels
so the game is playable before the Wikipedia cron job runs.
*/

INSERT INTO questions (category, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, source_title) VALUES
('genel-kultur', 'kolay', 'Türkiye''nin başkenti neresidir?', 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'B', 'Türkiye''nin başkenti Ankara''dır.', 'Genel Kültür'),
('genel-kultur', 'kolay', 'Türk bayrağında kaç yıldız vardır?', '1', '2', '3', '5', 'A', 'Türk bayrağında 1 yıldız ve 1 ay vardır.', 'Genel Kültür'),
('genel-kultur', 'kolay', 'Atatürk hangi yıl doğmuştur?', '1881', '1885', '1879', '1890', 'A', 'Mustafa Kemal Atatürk 1881 yılında Selanik''te doğmuştur.', 'Genel Kültür'),
('genel-kultur', 'orta', 'Osmanlı İmparatorluğu''nun kurucusu kimdir?', 'Fatih Sultan Mehmet', 'Osman Gazi', 'Yavuz Sultan Selim', 'Kanuni Sultan Süleyman', 'B', 'Osman Gazi Osmanlı Devleti''nin kurucusudur.', 'Genel Kültür'),
('genel-kultur', 'orta', 'İstanbul''un fethi hangi yıl gerçekleşmiştir?', '1453', '1517', '1299', '1402', 'A', 'Fatih Sultan Mehmet 1453''te İstanbul''u fethetmiştir.', 'Genel Kültür'),
('matematik', 'kolay', '7 × 8 kaçtır?', '54', '56', '58', '64', 'B', '7 çarpı 8 = 56.', 'Matematik'),
('matematik', 'kolay', 'Bir üçgenin iç açıları toplamı kaç derecedir?', '90', '180', '270', '360', 'B', 'Üçgenin iç açıları toplamı 180 derecedir.', 'Matematik'),
('matematik', 'orta', 'π''nin yaklaşık değeri kaçtır?', '2.14', '3.14', '4.14', '1.41', 'B', 'Pi sayısı yaklaşık 3.14''tür.', 'Matematik'),
('matematik', 'orta', 'Bir karenin çevresi 20 cm ise bir kenarı kaç cm''dir?', '5', '10', '4', '15', 'A', 'Karenin çevresi 4 × kenar, kenar = 20/4 = 5 cm.', 'Matematik'),
('cografya', 'kolay', 'Türkiye''nin en uzun nehri hangisidir?', 'Fırat', 'Kızılırmak', 'Sakarya', 'Dicle', 'B', 'Kızılırmak 1355 km ile Türkiye''nin en uzun nehridir.', 'Coğrafya'),
('cografya', 'kolay', 'Dünyanın en büyük okyanusu hangisidir?', 'Atlas Okyanusu', 'Hint Okyanusu', 'Büyük Okyanus', 'Arktik Okyanus', 'C', 'Büyük (Pasifik) Okyanusu en büyük okyanustur.', 'Coğrafya'),
('cografya', 'orta', 'Türkiye''nin en yüksek dağı hangisidir?', 'Erciyes', 'Ağrı Dağı', 'Süphan Dağı', 'Uludağ', 'B', 'Ağrı Dağı 5137 m ile Türkiye''nin en yüksek dağıdır.', 'Coğrafya'),
('tarih', 'kolay', 'Cumhuriyet hangi yıl ilan edilmiştir?', '1920', '1923', '1925', '1930', 'B', 'Türkiye Cumhuriyeti 29 Ekim 1923''te ilan edilmiştir.', 'Tarih'),
('tarih', 'kolay', 'Birinci Dünya Savaşı hangi yıllar arasında gerçekleşmiştir?', '1914-1918', '1912-1916', '1915-1919', '1910-1914', 'A', 'I. Dünya Savaşı 1914-1918 arasındadır.', 'Tarih'),
('tarih', 'orta', 'Kurtuluş Savaşı''nın başkomutanı kimdir?', 'İsmet İnönü', 'Mustafa Kemal Atatürk', 'Fevzi Çakmak', 'Kazım Karabekir', 'B', 'Başkomutan Mustafa Kemal Atatürk''tür.', 'Tarih'),
('fen', 'kolay', 'Suyun kimyasal formülü nedir?', 'CO2', 'H2O', 'O2', 'NaCl', 'B', 'Su H2O formülü ile ifade edilir.', 'Fen'),
('fen', 'kolay', 'İnsan vücudunda kaç tane kalp vardır?', '0', '1', '2', '3', 'B', 'İnsanda 1 kalp vardır.', 'Fen'),
('fen', 'orta', 'Işık hızı yaklaşık olarak saniyede kaç km''dir?', '100.000', '200.000', '300.000', '500.000', 'C', 'Işık hızı ~300.000 km/s.', 'Fen'),
('ehliyet', 'kolay', 'Şehirler arası yolda maksimum hız limiti genelde kaçtır?', '50 km/s', '70 km/s', '90 km/s', '120 km/s', 'C', 'Bölünmemiş yolda otomobil için 90 km/s limiti vardır.', 'Ehliyet'),
('ehliyet', 'kolay', 'Kırmızı ışık ne anlama gelir?', 'Dikkat', 'Dur', 'Yavaşla', 'Geç', 'B', 'Kırmızı ışık dur anlamına gelir.', 'Ehliyet'),
('lgs', 'kolay', 'Siyah kelimesinin zıt anlamlısı nedir?', 'Beyaz', 'Kırmızı', 'Mavi', 'Yeşil', 'A', 'Siyahın zıddı beyazdır.', 'LGS'),
('lgs', 'kolay', '15 + 28 işleminin sonucu kaçtır?', '42', '43', '44', '45', 'B', '15 + 28 = 43.', 'LGS'),
('guncel', 'kolay', 'Yapay zeka kısaltması nedir?', 'YZ', 'AI', 'Y2', 'AZ', 'B', 'İngilizce Artificial Intelligence → AI.', 'Güncel'),
('genel-kultur', 'zor', 'Türkiye''de kaç tane UNESCO Dünya Mirası alanı vardır?', '15', '19', '21', '25', 'B', 'Türkiye''de 19 UNESCO Dünya Mirası alanı bulunmaktadır.', 'Genel Kültür'),
('matematik', 'zor', 'Bir küpün yüzey alanı 216 cm² ise bir kenarı kaç cm''dir?', '5', '6', '7', '8', 'B', '6a²=216 → a²=36 → a=6.', 'Matematik'),
('cografya', 'zor', 'Dünyanın en küçük ülkesi hangisidir?', 'Monako', 'Vatikan', 'San Marino', 'Liechtenstein', 'B', 'Vatikan 0.49 km² ile en küçük ülkedir.', 'Coğrafya'),
('tarih', 'zor', 'Magna Carta hangi yılda imzalanmıştır?', '1215', '1066', '1492', '1305', 'A', 'Magna Carta 1215''te imzalanmıştır.', 'Tarih'),
('fen', 'zor', 'Periyodik tabloda en çok element hangi grupta bulunur?', 'Alkali metaller', 'Halojenler', 'Geçiş metalleri', 'Soy gazlar', 'C', 'Geçiş metalleri en kalabalık gruptur.', 'Fen'),
('genel-kultur', 'profesyonel', 'Divan-ı Lügati''t-Türk''ü yazan kişi kimdir?', 'Yusuf Has Hacib', 'Kaşgarlı Mahmud', 'Edip Ahmet', 'Ahmet Yesevi', 'B', 'Kaşgarlı Mahmud 1072''de yazmıştır.', 'Genel Kültür'),
('matematik', 'profesyonel', 'Fibonacci dizisinde 10. terim kaçtır?', '34', '55', '89', '144', 'B', 'Dizi: 1,1,2,3,5,8,13,21,34,55 → 10. terim 55.', 'Matematik'),
('cografya', 'profesyonel', 'Atmosferin en yüksek katmanı hangisidir?', 'Troposfer', 'Stratosfer', 'Mezosfer', 'Eksosfer', 'D', 'Eksosfer atmosferin en üst katmanıdır.', 'Coğrafya'),
('tarih', 'profesyonel', 'Ankara Antlaşması hangi yılda imzalanmıştır?', '1921', '1923', '1925', '1930', 'C', 'Ankara Antlaşması 1925''te imzalanmıştır.', 'Tarih'),
('fen', 'profesyonel', 'DNA''yı keşfeden bilim insanları kimlerdir?', 'Newton ve Galileo', 'Watson ve Crick', 'Einstein ve Bohr', 'Darwin ve Mendel', 'B', 'Watson ve Crick 1953''te DNA''nın yapısını keşfettiler.', 'Fen')
ON CONFLICT DO NOTHING;
