import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'

interface BorderBeamProps {
  /** Beam kafasının kare boyutu (px) */
  size?: number
  /** Bir tam turun süresi (saniye) */
  duration?: number
  /** Başlangıç gecikmesi (saniye) - birden fazla beam'i faz kaydırmak için */
  delay?: number
  /** Beam'in başlangıç rengi */
  colorFrom?: string
  /** Beam'in bitiş rengi */
  colorTo?: string
  /** Çerçeve kalınlığı (px) */
  borderWidth?: number
  className?: string
}

/**
 * Bolt.new / Magic UI tarzında animasyonlu çerçeve (Animated Border Beam).
 *
 * Nasıl çalışır: `offset-path` ile üst elemanın kenarlarını takip eden
 * küçük bir gradyan "ışın" elemanı, `offset-distance` değeri 0%'dan
 * 100%'e animasyonlanarak kenar boyunca döndürülür. Bu teknik tamamen
 * kompozitör (GPU) tarafından hızlandırılır; layout/paint tetiklemez,
 * bu yüzden düşük güçlü mobil cihazlarda bile 60 FPS'te akıcı kalır.
 *
 * Kullanım: hedef elemanı `className="relative ... overflow-hidden"` ile
 * sarmalayıp içine <BorderBeam /> ekleyin. `rounded-[inherit]` sayesinde
 * ebeveynin border-radius'unu otomatik miras alır.
 */
export function BorderBeam({
  size = 60,
  duration = 6,
  delay = 0,
  colorFrom = '#f5b041',
  colorTo = '#4d7aa8',
  borderWidth = 1.5,
  className = '',
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] ${className}`}
      style={{ borderWidth, willChange: 'transform' }}
    >
      <motion.div
        className="absolute aspect-square"
        style={
          {
            width: size,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            willChange: 'offset-distance',
            transform: 'translateZ(0)',
          } as CSSProperties
        }
        initial={{ offsetDistance: '0%' }}
        animate={{ offsetDistance: '100%' }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration,
          delay: -delay,
        }}
      />
    </div>
  )
}
