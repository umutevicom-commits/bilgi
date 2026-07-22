/*
# Kim Milyoner Olmak İster - Veritabanı Şeması

## Genel Bakış
Bu migration, Kim Milyoner Olmak İster bilgi yarışması için tüm veritabanı
altyapısını oluşturur. Sistem puan tabanlıdır, üyelik gerektirir ve Supabase
Auth kullanır.

## Yeni Tablolar
1. **profiles** - Kullanıcı profilleri (auth.users ile bağlantılı)
   - id (uuid, auth.users.id referansı)
   - username (benzersiz kullanıcı adı)
   - full_name, gender, avatar_url
   - total_points, best_score, games_played
   - is_banned, is_admin, is_online, last_seen
   - created_at, updated_at

2. **game_sessions** - Oyun oturumları (kaldığı yerden devam için)
   - id, user_id, category, difficulty_index
   - current_question_number, current_points
   - lifelines_used (jsonb), status (active/break/finished)
   - started_at, paused_at, finished_at

3. **questions** - Soru havuzu (Wikipedia API + manuel)
   - id, category, difficulty, question_text
   - option_a, option_b, option_c, option_d
   - correct_answer (A/B/C/D)
   - explanation, source_url, source_title
   - is_active, created_at

4. **scores** - Skor geçmişi
   - id, user_id, score, category, questions_answered
   - created_at

5. **ads** - Reklam yönetimi
   - id, placement (home/game_top/game_bottom)
   - title, content_html, image_url, target_url
   - is_active, start_date, end_date
   - created_by, created_at

6. **site_settings** - Site ayarları
   - id, key, value, updated_by, updated_at

7. **categories** - Kategori yönetimi
   - id, name, slug, icon, is_active, display_order

## Güvenlik
- Tüm tablolarda RLS etkin.
- profiles: Her kullanıcı kendi profilini okur/yazar, tüm profiller okunabilir (liderlik için).
- game_sessions: Sadece sahip erişir.
- questions: Tüm kullanıcılar okur, sadece admin yazar.
- scores: Sadece sahip yazar, tüm kullanıcılar okur.
- ads: Tüm kullanıcılar okur, sadece admin yazar.
- site_settings: Tüm kullanıcılar okur, sadece admin yazar.
- categories: Tüm kullanıcılar okur, sadece admin yazar.

## Önemli Notlar
1. Admin kullanıcısı manuel olarak oluşturulacak (Hamdi).
2. Wikipedia soruları GitHub Actions cron ile otomatik eklenecek.
3. Puan sistemi: Kolay=10, Orta=20, Zor=30, Çok Zor=50, Profesyonel=100.
4. Zorluk sırası: Kolay → Orta → Zor → Çok Zor → Profesyonel (döngüsel).
*/

-- ============================================
-- 1. PROFILES TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  gender text DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
  avatar_url text,
  total_points integer NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  is_banned boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Herkes profilleri okuyabilir (liderlik tablosu için)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Kullanıcı sadece kendi profilini günceller
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. GAME_SESSIONS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'karisik',
  difficulty_index integer NOT NULL DEFAULT 0,
  current_question_number integer NOT NULL DEFAULT 1,
  current_points integer NOT NULL DEFAULT 0,
  lifelines_used jsonb NOT NULL DEFAULT '{"fifty_fifty": false, "phone": false, "audience": false}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'break', 'finished')),
  started_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own" ON game_sessions;
CREATE POLICY "sessions_select_own" ON game_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_insert_own" ON game_sessions;
CREATE POLICY "sessions_insert_own" ON game_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own" ON game_sessions;
CREATE POLICY "sessions_update_own" ON game_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_delete_own" ON game_sessions;
CREATE POLICY "sessions_delete_own" ON game_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- 3. QUESTIONS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'karisik',
  difficulty text NOT NULL DEFAULT 'kolay' CHECK (difficulty IN ('kolay', 'orta', 'zor', 'cok_zor', 'profesyonel')),
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation text,
  source_url text,
  source_title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Tüm authenticated kullanıcılar soruları okur
DROP POLICY IF EXISTS "questions_select_all" ON questions;
CREATE POLICY "questions_select_all" ON questions FOR SELECT
  TO authenticated USING (is_active = true);

-- Adminler soru ekler/günceller/siler (is_admin check via profiles)
DROP POLICY IF EXISTS "questions_insert_admin" ON questions;
CREATE POLICY "questions_insert_admin" ON questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "questions_update_admin" ON questions;
CREATE POLICY "questions_update_admin" ON questions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "questions_delete_admin" ON questions;
CREATE POLICY "questions_delete_admin" ON questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================
-- 4. SCORES TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'karisik',
  questions_answered integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcılar skorları okur (liderlik için)
DROP POLICY IF EXISTS "scores_select_all" ON scores;
CREATE POLICY "scores_select_all" ON scores FOR SELECT
  TO authenticated USING (true);

-- Kullanıcı kendi skorunu ekler
DROP POLICY IF EXISTS "scores_insert_own" ON scores;
CREATE POLICY "scores_insert_own" ON scores FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. ADS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL CHECK (placement IN ('home', 'game_top', 'game_bottom', 'sidebar')),
  title text,
  content_html text,
  image_url text,
  target_url text,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcılar aktif reklamları okur
DROP POLICY IF EXISTS "ads_select_all" ON ads;
CREATE POLICY "ads_select_all" ON ads FOR SELECT
  TO authenticated USING (is_active = true);

-- Adminler reklam yönetir
DROP POLICY IF EXISTS "ads_insert_admin" ON ads;
CREATE POLICY "ads_insert_admin" ON ads FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "ads_update_admin" ON ads;
CREATE POLICY "ads_update_admin" ON ads FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "ads_delete_admin" ON ads;
CREATE POLICY "ads_delete_admin" ON ads FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================
-- 6. SITE_SETTINGS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcılar ayarları okur
DROP POLICY IF EXISTS "settings_select_all" ON site_settings;
CREATE POLICY "settings_select_all" ON site_settings FOR SELECT
  TO authenticated USING (true);

-- Adminler ayarları yönetir
DROP POLICY IF EXISTS "settings_insert_admin" ON site_settings;
CREATE POLICY "settings_insert_admin" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "settings_update_admin" ON site_settings;
CREATE POLICY "settings_update_admin" ON site_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "settings_delete_admin" ON site_settings;
CREATE POLICY "settings_delete_admin" ON site_settings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================
-- 7. CATEGORIES TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcılar kategorileri okur
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT
  TO authenticated USING (is_active = true);

-- Adminler kategori yönetir
DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_questions_category_difficulty ON questions(category, difficulty) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_status ON game_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ads_placement_active ON ads(placement) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);

-- ============================================
-- TRIGGER: updated_at otomatik güncelleme
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER trigger_game_sessions_updated_at BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_ads_updated_at ON ads;
CREATE TRIGGER trigger_ads_updated_at BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_site_settings_updated_at ON site_settings;
CREATE TRIGGER trigger_site_settings_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Yeni kullanıcı için otomatik profil oluşturma
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- VARSAYILAN KATEGORİLER
-- ============================================
INSERT INTO categories (name, slug, icon, display_order) VALUES
  ('Genel Kültür', 'genel-kultur', 'globe', 1),
  ('Matematik', 'matematik', 'calculator', 2),
  ('Güncel', 'guncel', 'newspaper', 3),
  ('Ehliyet', 'ehliyet', 'car', 4),
  ('Coğrafya', 'cografya', 'map', 5),
  ('Fen', 'fen', 'flask-conical', 6),
  ('Tarih', 'tarih', 'landmark', 7),
  ('LGS', 'lgs', 'graduation-cap', 8),
  ('Genel Kültür Soruları', 'genel-kultur-sorulari', 'book-open', 9),
  ('Karışık', 'karisik', 'shuffle', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- VARSAYILAN SITE AYARLARI
-- ============================================
INSERT INTO site_settings (key, value) VALUES
  ('question_time_seconds', '60'),
  ('points_easy', '10'),
  ('points_medium', '20'),
  ('points_hard', '30'),
  ('points_very_hard', '50'),
  ('points_professional', '100'),
  ('site_name', 'Kim Milyoner Olmak İster'),
  ('site_url', 'https://kimmilyoner.eu.cc/'),
  ('admin_login_url', '/auth?admin_key=H4md1U2024')
ON CONFLICT (key) DO NOTHING;
