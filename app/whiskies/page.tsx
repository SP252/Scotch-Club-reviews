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
          supabase
            .from('whisky_stats')
            .select('id, review_count, avg_rating'),
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
      items.sort((a, b) => {
        const aName = `${a.brand} ${a.name}`.toLowerCase()
        const bName = `${b.brand} ${b.name}`.toLowerCase()
        return aName.localeCompare(bName)
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
  }, [filteredWhiskies])

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
          Whiskies
        </h1>

        <p
          style={{
            fontSize: 14,
            color: '#cbd5e1',
            marginTop: 6,
            marginBottom: 16,
          }}
        >
          Browse the club bottle list by category
        </p>

        <input
          type="text"
          placeholder="Search bottles, categories, or providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1px solid rgba(148, 163, 184, 0.28)',
            borderRadius: 12,
            fontSize: 14,
            boxSizing: 'border-box',
            background: 'rgba(15, 23, 36, 0.72)',
            color: '#f8fafc',
            outline: 'none',
          }}
        />

        <p style={{ fontSize: 14, color: '#cbd5e1', marginTop: 10, marginBottom: 0 }}>
          Showing {filteredWhiskies.length} of {whiskies.length} bottles
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
          Loading whiskies...
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
          No whiskies found.
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
                      display: 'block',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: 18,
                      padding: 16,
                      textDecoration: 'none',
                      color: '#f8fafc',
                      background:
                        'linear-gradient(180deg, rgba(30,41,59,0.86), rgba(30,27,24,0.86))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                    }}
                  >
                    {whisky.image_url ? (
                      <img
                        src={whisky.image_url}
                        alt={`${whisky.brand} ${whisky.name}`}
                        style={{
                          width: '100%',
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 12,
                          border: '1px solid rgba(148, 163, 184, 0.16)',
                          display: 'block',
                          marginBottom: 12,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 160,
                          borderRadius: 12,
                          border: '1px solid rgba(148, 163, 184, 0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          fontSize: 14,
                          marginBottom: 12,
                          background: 'rgba(15, 23, 36, 0.55)',
                        }}
                      >
                        No photo
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: 6 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0, color: '#f8fafc' }}>
                        {whisky.brand} {whisky.name}
                      </h3>

                      <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0 }}>
                        {whisky.category ?? 'Unknown category'}
                      </p>

                      <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0 }}>
                        Price: {whisky.cost != null ? `$${whisky.cost.toFixed(2)}` : '—'}
                      </p>

                      <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0 }}>
                        Provided by:{' '}
                        {whisky.provided_by?.display_name ?? whisky.provided_by_profile_id ?? '—'}
                      </p>

                      <p style={{ fontSize: 14, margin: 0, color: '#f8fafc' }}>
                        Average: {whisky.avg_rating != null ? whisky.avg_rating.toFixed(2) : '—'} · Reviews:{' '}
                        {whisky.review_count}
                      </p>
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
