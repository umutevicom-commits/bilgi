import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Ortam değişkenleri eksikse ARTIK burada throw ETMİYORUZ.
// Modül seviyesinde throw etmek, bu dosyayı import eden her şeyin
// (AuthContext -> App -> main) yüklenmeden önce çökmesine ve
// React'in hiç render edilememesine yol açıyordu (beyaz ekran).
// Bunun yerine durumu dışa açıyoruz; UI tarafı bunu kullanıcıya
// düzgün bir mesajla gösteriyor (bkz. src/main.tsx).
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY eksik. ' +
      'Build sırasında bu değerlerin tanımlı olduğundan emin olun.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
