'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type WhiskyStat = {
  id: string
  brand: string
  name: string
  category: string | null
  review_count: number
  avg_rating: number | null
}

function normalizeCategory(category: string | null) {
  const raw = (category ?? '').trim()
  if (!raw) return 'Other'

  const lower = raw.toLowerCase()

  if (lower.includes('scotch')) return 'Scotch'
  if (lower.includes('bourbon')) return 'Bourbon'
  if (lower.includes('irish')) return 'Irish'
  if (lower.includes('japanese')) return 'Japanese'
  if (lower.includes('american')) return 'American'
  if (lower.includes('canadian')) return 'Canadian'
  if (lower.includes('rye')) return 'Rye'

  return raw
}

const categoryOrder = [
  'Scotch',
  'Bourbon',
  'American',
  'Irish',
  'Japanese',
  'Canadian',
  'Rye',
  'Other',
]

export default function LeaderboardPage() {
  const [whiskies, setWhiskies] = useState<WhiskyStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('whisky_stats')
        .select('id, brand, name, category, review_count, avg_rating')
        .gte('review_count', 1)
        .order('avg_rating', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const normalized = (data ?? []).map((row: any) => ({
        id: row.id,
        brand: row.brand,
        name: row.name,
        category: row.category,
        review_count: Number(row.review_count ?? 0),
        avg_rating: row.avg_rating != null ? Number(row.avg_rating) : null,
      }))

      setWhiskies(normalized)
      setLoading(false)
    }

    loadLeaderboard()
  }, [])

  const groupedWhiskies = useMemo(() => {
    const groups = new Map<string, WhiskyStat[]>()

    for (const whisky of whiskies) {
      const category = normalizeCategory(whisky.category)
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category)!.push(whisky)
    }

    for (const [, items] of groups) {
      items.sort((a, b) => {
        const aRating = a.avg_rating ?? -1
        const bRating = b.avg_rating ?? -1
        if (bRating !== aRating) return bRating - aRating
        return `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`)
      })
    }

    return Array.from(groups.entries()).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a[0])
      const bIndex = categoryOrder.indexOf(b[0])

      if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [whiskies])

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 8 }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Leaderboard</h1>
        <p style={heroText}>Top-rated bottles grouped by category.</p>
      </section>

      {loading ? (
        <div style={cardStyle}>Loading leaderboard...</div>
      ) : error ? (
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gap: 28 }}>
          {groupedWhiskies.map(([category, items]) => (
            <section key={category}>
              <h2 style={{ color: '#f8fafc', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
                {category}
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {items.map((whisky, index) => (
                  <Link
                    key={whisky.id}
                    href={`/whiskies/${whisky.id}`}
                    style={{ ...cardStyle, textDecoration: 'none', color: '#0f172a' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                          #{index + 1} · {whisky.brand} {whisky.name}
                        </div>
                        <div style={{ fontSize: 14, color: '#475569' }}>
                          {whisky.review_count} review{whisky.review_count === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div style={pillStyle}>
                        {whisky.avg_rating != null ? whisky.avg_rating.toFixed(2) : '—'} / 10
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

const heroStyle: React.CSSProperties = {
  borderRadius: 24,
  padding: 28,
  background: 'linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 18px 40px rgba(0,0,0,0.30)',
  marginBottom: 20,
}

const heroTitle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 800,
  margin: 0,
  color: '#0f172a',
}

const heroText: React.CSSProperties = {
  fontSize: 15,
  color: '#334155',
  marginTop: 10,
  marginBottom: 0,
}

const cardStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: 18,
  background: 'linear-gradient(180deg, #eef4fc 0%, #dfe9f7 100%)',
  border: '1px solid #d7e2f0',
  boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
}

const pillStyle: React.CSSProperties = {
  border: '1px solid #93c5fd',
  borderRadius: 9999,
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 800,
  color: '#1d4ed8',
  background: '#eff6ff',
  whiteSpace: 'nowrap',
}
