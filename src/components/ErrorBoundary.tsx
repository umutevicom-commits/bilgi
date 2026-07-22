import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string | null
}

// Bu bileşen, alt ağaçta oluşan render/lifecycle hatalarını yakalar.
// Yakalamazsak, React ağacı unmount olur ve kullanıcı sadece boş
// (beyaz) bir sayfa görür. Burada en azından bir hata mesajı ve
// "yeniden dene" seçeneği gösteriyoruz.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: null }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Uygulama hatası yakalandı:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Bir şeyler ters gitti</h1>
          <p style={{ color: '#b8c1d1', maxWidth: 480 }}>
            Sayfa yüklenirken beklenmeyen bir hata oluştu. Aşağıdaki mesajı
            geliştiriciyle paylaşabilirsiniz.
          </p>
          {this.state.message && (
            <pre
              style={{
                background: 'rgba(255,255,255,0.06)',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                fontSize: '0.85rem',
                maxWidth: 560,
                overflowX: 'auto',
              }}
            >
              {this.state.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#facc15',
              color: '#0a1428',
              border: 'none',
              padding: '0.6rem 1.4rem',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Yeniden dene
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
