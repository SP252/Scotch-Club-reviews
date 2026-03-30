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

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Whiskies</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
          Browse the club bottle list
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search bottles, categories, or providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 12,
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 10 }}>
          Showing {filteredWhiskies.length} of {whiskies.length} bottles
        </p>
      </div>

      {loading ? (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 16,
            color: '#6b7280',
            fontSize: 14,
          }}
        >
          Loading whiskies...
        </div>
      ) : error ? (
        <div
          style={{
            border: '1px solid #fecaca',
            borderRadius: 16,
            padding: 16,
            color: '#b91c1c',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filteredWhiskies.map((whisky) => (
            <Link
              key={whisky.id}
              href={`/whiskies/${whisky.id}`}
              style={{
                display: 'block',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                textDecoration: 'none',
                color: '#111827',
                background: '#fff',
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
                    border: '1px solid #e5e7eb',
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
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                >
                  No photo
                </div>
              )}

              <div style={{ display: 'grid', gap: 6 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>
                  {whisky.brand} {whisky.name}
                </h2>

                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  {whisky.category ?? 'Unknown category'}
                </p>

                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  Price: {whisky.cost != null ? `$${whisky.cost.toFixed(2)}` : '—'}
                </p>

                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  Provided by:{' '}
                  {whisky.provided_by?.display_name ?? whisky.provided_by_profile_id ?? '—'}
                </p>

                <p style={{ fontSize: 14, margin: 0 }}>
                  Average: {whisky.avg_rating != null ? whisky.avg_rating.toFixed(2) : '—'} · Reviews:{' '}
                  {whisky.review_count}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
