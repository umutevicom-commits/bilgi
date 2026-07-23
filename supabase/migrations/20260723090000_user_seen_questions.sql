/*
# Kullanıcı Bazında Kalıcı "Görülen Soru" Takibi

## Amaç
Bir kullanıcıya bir kez gösterilen soru, o kullanıcıya bir daha ASLA
gösterilmesin - sadece o oyun oturumu içinde değil, kullanıcının hesabı
var olduğu sürece, tüm oturumlar/oyunlar boyunca kalıcı olarak.

## Yeni Tablo
**user_seen_questions** - Kullanıcı × Soru eşleşmesi (kim hangi soruyu gördü)
   - user_id (auth.users referansı)
   - question_id (questions referansı)
   - seen_at (ilk görülme zamanı)
   - PRIMARY KEY (user_id, question_id) → aynı çift asla iki kez eklenemez

## Güvenlik
- RLS etkin.
- Kullanıcı yalnızca kendi görülen sorularını okuyabilir/ekleyebilir.
- Bu migration mevcut hiçbir tabloyu, politikayı veya trigger'ı değiştirmez;
  yalnızca yeni ve bağımsız bir tablo ekler.
*/

CREATE TABLE IF NOT EXISTS user_seen_questions (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

ALTER TABLE user_seen_questions ENABLE ROW LEVEL SECURITY;

-- Kullanıcı sadece kendi görülen sorular listesini okuyabilir
DROP POLICY IF EXISTS "seen_questions_select_own" ON user_seen_questions;
CREATE POLICY "seen_questions_select_own" ON user_seen_questions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Kullanıcı sadece kendi adına "gördüm" kaydı ekleyebilir
DROP POLICY IF EXISTS "seen_questions_insert_own" ON user_seen_questions;
CREATE POLICY "seen_questions_insert_own" ON user_seen_questions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_seen_questions_user ON user_seen_questions(user_id);
