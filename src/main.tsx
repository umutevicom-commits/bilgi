import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { isSupabaseConfigured } from './lib/supabase'
import './index.css'

const basename = import.meta.env.BASE_URL

const rootEl = document.getElementById('root')!

// Offline/PWA desteği: service worker'ı yalnızca prod build'de ve tarayıcı
// destekliyorsa kaydet. Bu, mevcut oyun/Supabase mantığını hiçbir şekilde
// etkilemez; sadece statik varlıkları önbelleğe alıp offline erişim sağlar.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${basename}sw.js`, { scope: basename })
      .catch((err) => console.error('Service worker kaydı başarısız:', err))
  })
}

// Supabase ortam değişkenleri (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// build sırasında tanımlı değilse, uygulamayı çökertmek yerine
// kullanıcıya net bir uyarı gösteriyoruz. Bu durum genelde GitHub
// Pages build/deploy adımında bu değişkenlerin secrets olarak
// tanımlanmamasından kaynaklanır (bkz. .env.example ve
// .github/workflows/deploy.yml).
if (!isSupabaseConfigured) {
  ReactDOM.createRoot(rootEl).render(
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
        background: '#0a1428',
        color: '#f5f5f5',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Yapılandırma eksik</h1>
      <p style={{ color: '#b8c1d1', maxWidth: 480 }}>
        VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri
        build sırasında tanımlanmamış. Lütfen .env dosyanızı (yerel
        geliştirme) veya GitHub repository secrets'ı (Pages deploy'u)
        kontrol edin.
      </p>
    </div>,
  )
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename={basename}>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
