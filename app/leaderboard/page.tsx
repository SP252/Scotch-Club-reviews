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
    <main>
      <section
        style={{
          border: '1px solid rgba(148, 163, 184, 0.16)',
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          background:
            'linear-gradient(135deg, rgba(30,41,59,0.85), rgba(39,30,23,0.75))',
          boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            color: '#f8fafc',
          }}
        >
          Leaderboard
        </h1>

        <p
          style={{
            fontSize: 14,
            color: '#cbd5e1',
            marginTop: 6,
            marginBottom: 0,
          }}
        >
          Top-rated bottles grouped by category
        </p>
      </section>

      {loading ? (
        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.16)',
            borderRadius: 16,
            padding: 16,
            color: '#cbd5e1',
            background: 'rgba(15, 23, 36, 0.72)',
          }}
        >
          Loading leaderboard...
        </div>
      ) : error ? (
        <div
          style={{
            border: '1px solid rgba(248, 113, 113, 0.5)',
            borderRadius: 16,
            padding: 16,
            color: '#fecaca',
            background: 'rgba(69, 10, 10, 0.45)',
          }}
        >
          {error}
        </div>
      ) : groupedWhiskies.length === 0 ? (
        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.16)',
            borderRadius: 16,
            padding: 16,
            color: '#cbd5e1',
            background: 'rgba(15, 23, 36, 0.72)',
          }}
        >
          No leaderboard data yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 28 }}>
          {groupedWhiskies.map(([category, items]) => (
            <section key={category}>
              <div
                style={{
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: '#f8fafc',
                  }}
                >
                  {category}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: '#cbd5e1',
                  }}
                >
                  {items.length} bottle{items.length === 1 ? '' : 's'}
                </p>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {items.map((whisky, index) => (
                  <Link
                    key={whisky.id}
                    href={`/whiskies/${whisky.id}`}
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      color: '#f8fafc',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: 18,
                      padding: 16,
                      background:
                        'linear-gradient(180deg, rgba(30,41,59,0.86), rgba(30,27,24,0.86))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                    }}
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
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#f8fafc',
                            marginBottom: 4,
                          }}
                        >
                          #{index + 1} · {whisky.brand} {whisky.name}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: '#cbd5e1',
                          }}
                        >
                          {whisky.review_count} review{whisky.review_count === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div
                        style={{
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          borderRadius: 9999,
                          padding: '8px 14px',
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#f8fafc',
                          background: 'rgba(255,255,255,0.04)',
                          whiteSpace: 'nowrap',
                        }}
                      >
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
