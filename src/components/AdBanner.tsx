import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import type { Ad } from '../types'

export function AdBanner({ placement }: { placement: 'home' | 'game_top' | 'game_bottom' | 'sidebar' }) {
  const [ad, setAd] = useState<Ad | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAd = async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('placement', placement)
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setAd(data as Ad)
      }
      setLoading(false)
    }
    fetchAd()
  }, [placement])

  if (loading || !ad) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-4 overflow-hidden relative"
    >
      <span className="absolute top-1 right-2 text-[10px] text-primary-500 uppercase tracking-wider">
        Reklam
      </span>
      {ad.target_url ? (
        <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="block">
          {ad.image_url ? (
            <img src={ad.image_url} alt={ad.title || 'Reklam'} className="w-full rounded-lg" />
          ) : (
            <div>
              {ad.title && <h4 className="font-semibold text-cream-100 mb-1">{ad.title}</h4>}
              {ad.content_html && (
                <div
                  className="text-sm text-primary-300"
                  dangerouslySetInnerHTML={{ __html: ad.content_html }}
                />
              )}
            </div>
          )}
        </a>
      ) : (
        <div>
          {ad.image_url ? (
            <img src={ad.image_url} alt={ad.title || 'Reklam'} className="w-full rounded-lg" />
          ) : (
            <div>
              {ad.title && <h4 className="font-semibold text-cream-100 mb-1">{ad.title}</h4>}
              {ad.content_html && (
                <div
                  className="text-sm text-primary-300"
                  dangerouslySetInnerHTML={{ __html: ad.content_html }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
