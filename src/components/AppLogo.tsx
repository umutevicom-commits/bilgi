import { BorderBeam } from './BorderBeam'

interface AppLogoProps {
  size?: number
  className?: string
  animated?: boolean
}

/**
 * Uygulamanın marka amblemi (favicon.svg ile aynı taç/kupa motifi).
 * `animated` true olduğunda kenarında premium bir Border Beam döner.
 */
export function AppLogo({ size = 44, className = '', animated = true }: AppLogoProps) {
  return (
    <div
      className={`relative flex-shrink-0 rounded-[14px] overflow-hidden ${className}`}
      style={{ width: size, height: size, transform: 'translateZ(0)' }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="block">
        <defs>
          <linearGradient id="app-logo-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f9cb72" />
            <stop offset="1" stopColor="#e8951c" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="#050816" />
        <path d="M20 40 L32 16 L44 40 L38 40 L32 30 L26 40 Z" fill="url(#app-logo-gradient)" />
        <rect x="22" y="42" width="20" height="4" rx="2" fill="url(#app-logo-gradient)" />
      </svg>
      {animated && (
        <BorderBeam size={size} duration={5} borderWidth={1.5} colorFrom="#f9cb72" colorTo="#4d7aa8" />
      )}
    </div>
  )
}
