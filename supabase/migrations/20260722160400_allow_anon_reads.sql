/*
# Allow anon read access to public data

## Changes
- profiles: allow anon SELECT (leaderboard needs it)
- scores: allow anon SELECT (leaderboard needs it)
- categories: allow anon SELECT (home page category list)
- ads: allow anon SELECT (home and game page ads)
- questions: allow anon SELECT (game needs questions)
*/

-- profiles: anon can read
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

-- scores: anon can read
DROP POLICY IF EXISTS "scores_select_all" ON scores;
CREATE POLICY "scores_select_all" ON scores FOR SELECT
  TO anon, authenticated USING (true);

-- categories: anon can read
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- ads: anon can read
DROP POLICY IF EXISTS "ads_select_all" ON ads;
CREATE POLICY "ads_select_all" ON ads FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- questions: anon can read
DROP POLICY IF EXISTS "questions_select_all" ON questions;
CREATE POLICY "questions_select_all" ON questions FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- site_settings: anon can read
DROP POLICY IF EXISTS "settings_select_all" ON site_settings;
CREATE POLICY "settings_select_all" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);
