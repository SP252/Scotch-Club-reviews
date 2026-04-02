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

type WhiskyStatRow = {
  id: string
  review_count: number | null
  avg_rating: number | null
}

type ReviewRow = {
  whisky_id: string | null
  review_date: string | null
}

type RecentlyReviewedBottle = {
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
  last_review_date: string | null
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function RecentReviewsPage() {
  const [bottles, setBottles] = useState<RecentlyReviewedBottle[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRecentlyReviewedBottles() {
      setLoading(true)
      setError('')

      const [
        { data: whiskiesData, error: whiskiesError },
        { data: statsData, error: statsError },
        { data: reviewsData, error: reviewsError },
      ] = await Promise.all([
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
          `),
        supabase.from('whisky_stats').select('id, review_count, avg_rating'),
        supabase
          .from('reviews')
          .select('whisky_id, review_date')
          .not('whisky_id', 'is', null)
          .order('review_date', { ascending: false }),
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

      if (reviewsError) {
        setError(reviewsError.message)
        setLoading(false)
        return
      }

      const statsMap = new Map(
        ((statsData ?? []) as WhiskyStatRow[]).map((row) => [
          row.id,
          {
            review_count: Number(row.review_count ?? 0),
            avg_rating: row.avg_rating != null ? Number(row.avg_rating) : null,
          },
        ])
      )

      const lastReviewMap = new Map<string, string>()

      for (const review of (reviewsData ?? []) as ReviewRow[]) {
        if (!review.whisky_id || !review.review_date) continue

        const existing = lastReviewMap.get(review.whisky_id)
        if (!existing || review.review_date > existing) {
          lastReviewMap.set(review.whisky_id, review.review_date)
        }
      }

      const merged = ((whiskiesData ?? []) as WhiskyRow[])
        .filter((whisky) => lastReviewMap.has(whisky.id))
        .map((whisky) => {
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
            last_review_date: lastReviewMap.get(whisky.id) ?? null,
          }
        })
        .sort((a, b) => {
          const aDate = a.last_review_date ?? ''
          const bDate = b.last_review_date ?? ''
          if (aDate !== bDate) return bDate.localeCompare(aDate)
          return `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`)
        })

      setBottles(merged)
      setLoading(false)
    }

    loadRecentlyReviewedBottles()
  }, [])

  const filteredBottles = useMemo(() => {
    const q = normalize(search)
    if (!q) return bottles

    return bottles.filter((bottle) => {
      const searchable = normalize(
        [
          bottle.brand,
          bottle.name,
          `${bottle.brand} ${bottle.name}`,
          bottle.category ?? '',
          bottle.provided_by?.display_name ?? '',
          bottle.provided_by_profile_id ?? '',
          bottle.last_review_date ?? '',
        ].join(' ')
      )

      return searchable.includes(q)
    })
  }, [bottles, search])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 8 }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Recently Reviewed Bottles</h1>
        <p style={heroText}>
          One card per bottle, sorted by the most recent review date.
        </p>
        <input
          type="text"
          placeholder="Search bottles, categories, or providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
      </section>

      {loading ? (
        <div style={cardStyle}>Loading recently reviewed bottles...</div>
      ) : error ? (
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error}</div>
      ) : filteredBottles.length === 0 ? (
        <div style={cardStyle}>No reviewed bottles found.</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filteredBottles.map((whisky) => (
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
                  Last reviewed: {formatDate(whisky.last_review_date)}
                </div>

                <div style={{ fontSize: 14, color: '#475569' }}>
                  Provided by:{' '}
                  {whisky.provided_by?.display_name ?? whisky.provided_by_profile_id ?? '—'}
                </div>

                <div style={{ fontSize: 14, color: '#475569' }}>
                  Price: {whisky.cost != null ? `$${whisky.cost.toFixed(2)}` : '—'}
                </div>

                <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
                  Average: {whisky.avg_rating != null ? whisky.avg_rating.toFixed(2) : '—'} · Reviews:{' '}
                  {whisky.review_count}
                </div>
              </div>
            </Link>
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
