'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type WhiskyRow = {
  id: string
  brand: string
  name: string
  category: string | null
  image_url: string | null
  cost: number | null
  provided_by_profile_id: string | null
  provided_by: MaybeArray<{ display_name: string }>
}

type Whisky = {
  id: string
  brand: string
  name: string
  category: string | null
  image_url: string | null
  cost: number | null
  provided_by_profile_id: string | null
  provided_by: { display_name: string } | null
  review_count: number
  avg_rating: number | null
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
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

export default function WhiskiesPage() {
  const [whiskies, setWhiskies] = useState<Whisky[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadWhiskies() {
      setLoading(true)
      setError('')

      const [{ data: whiskiesData, error: whiskiesError }, { data: statsData, error: statsError }] =
        await Promise.all([
          supabase
            .from('whiskies')
            .select(`
              id,
              brand,
              name,
              category,
              image_url,
              cost,
              provided_by_profile_id,
              provided_by:profiles!whiskies_provided_by_profile_id_fkey(display_name)
            `)
            .order('brand', { ascending: true }),
          supabase.from('whisky_stats').select('id, review_count, avg_rating'),
        ])

      if (whiskiesError) {
        setError(whiskiesError.message)
        setLoading(false)
        return
      }

      if (statsError) {
        setError(statsError.message)
        setLoading(false)
        return
      }

      const statsMap = new Map(
        (statsData ?? []).map((row: any) => [
          row.id,
          {
            review_count: Number(row.review_count ?? 0),
            avg_rating: row.avg_rating != null ? Number(row.avg_rating) : null,
          },
        ])
      )

      const merged = ((whiskiesData ?? []) as WhiskyRow[]).map((whisky) => {
        const stats = statsMap.get(whisky.id)

        return {
          id: whisky.id,
          brand: whisky.brand,
          name: whisky.name,
          category: whisky.category,
          image_url: whisky.image_url,
          cost: whisky.cost != null ? Number(whisky.cost) : null,
          provided_by_profile_id: whisky.provided_by_profile_id,
          provided_by: firstOrSelf(whisky.provided_by),
          review_count: stats?.review_count ?? 0,
          avg_rating: stats?.avg_rating ?? null,
        }
      })

      setWhiskies(merged)
      setLoading(false)
    }

    loadWhiskies()
  }, [])

  const filteredWhiskies = useMemo(() => {
    const q = normalize(search)
    if (!q) return whiskies

    return whiskies.filter((whisky) => {
      const searchable = normalize(
        [
          whisky.brand,
          whisky.name,
          `${whisky.brand} ${whisky.name}`,
          whisky.category ?? '',
          whisky.provided_by?.display_name ?? '',
          whisky.provided_by_profile_id ?? '',
        ].join(' ')
      )

      return searchable.includes(q)
    })
  }, [whiskies, search])

  const groupedWhiskies = useMemo(() => {
    const groups = new Map<string, Whisky[]>()

    for (const whisky of filteredWhiskies) {
      const category = normalizeCategory(whisky.category)
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category)!.push(whisky)
    }

    for (const [, items] of groups) {
      items.sort((a, b) =>
        `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`)
      )
    }

    return Array.from(groups.entries()).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a[0])
      const bIndex = categoryOrder.indexOf(b[0])

      if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [filteredWhiskies])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 8 }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Whiskies</h1>
        <p style={heroText}>Browse the club bottle list by category.</p>
        <input
          type="text"
          placeholder="Search bottles, categories, or providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
      </section>

      {loading ? (
        <div style={cardStyle}>Loading whiskies...</div>
      ) : error ? (
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gap: 28 }}>
          {groupedWhiskies.map(([category, items]) => (
            <section key={category}>
              <h2 style={{ color: '#f8fafc', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
                {category}
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                }}
              >
                {items.map((whisky) => (
                  <Link
                    key={whisky.id}
                    href={`/whiskies/${whisky.id}`}
                    style={{
                      ...cardStyle,
                      textDecoration: 'none',
                      color: '#0f172a',
                    }}
                  >
                    {whisky.image_url ? (
                      <img
                        src={whisky.image_url}
                        alt={`${whisky.brand} ${whisky.name}`}
                        style={{
                          width: '100%',
                          height: 170,
                          objectFit: 'cover',
                          borderRadius: 14,
                          border: '1px solid #d7e2f0',
                          display: 'block',
                          marginBottom: 12,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 170,
                          borderRadius: 14,
                          border: '1px solid #d7e2f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          fontSize: 14,
                          marginBottom: 12,
                          background: '#f8fbff',
                        }}
                      >
                        No photo
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
                        {whisky.brand} {whisky.name}
                      </div>
                      <div style={{ fontSize: 14, color: '#475569' }}>
                        {whisky.category ?? 'Unknown category'}
                      </div>
                      <div style={{ fontSize: 14, color: '#475569' }}>
                        Price: {whisky.cost != null ? `$${whisky.cost.toFixed(2)}` : '—'}
                      </div>
                      <div style={{ fontSize: 14, color: '#475569' }}>
                        Provided by:{' '}
                        {whisky.provided_by?.display_name ?? whisky.provided_by_profile_id ?? '—'}
                      </div>
                      <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
                        Average: {whisky.avg_rating != null ? whisky.avg_rating.toFixed(2) : '—'} · Reviews:{' '}
                        {whisky.review_count}
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
  marginBottom: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  border: '1px solid #bfd0e6',
  borderRadius: 14,
  fontSize: 15,
  background: '#ffffff',
  color: '#0f172a',
  outline: 'none',
}

const cardStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: 18,
  background: 'linear-gradient(180deg, #eef4fc 0%, #dfe9f7 100%)',
  border: '1px solid #d7e2f0',
  boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
}
