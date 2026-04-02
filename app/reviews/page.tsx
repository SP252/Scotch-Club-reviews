'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type ReviewRow = {
  whisky_id: string | null
  review_date: string | null
  location: string | null
}

type WhiskyRow = {
  id: string
  brand: string
  name: string
  category: string | null
  image_url: string | null
  provided_by_profile_id: string | null
  provided_by: MaybeArray<{ display_name: string }>
}

type WhiskyStatRow = {
  id: string
  review_count: number | null
  avg_rating: number | null
}

type BottleCard = {
  id: string
  brand: string
  name: string
  fullName: string
  category: string | null
  image_url: string | null
  provided_by: { display_name: string } | null
  review_count: number
  avg_rating: number | null
  last_review_date: string | null
  last_location: string | null
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
  const [items, setItems] = useState<BottleCard[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPage() {
      setLoading(true)
      setError('')

      const [
        { data: reviewsData, error: reviewsError },
        { data: whiskiesData, error: whiskiesError },
        { data: statsData, error: statsError },
      ] = await Promise.all([
        supabase
          .from('reviews')
          .select('whisky_id, review_date, location')
          .not('whisky_id', 'is', null)
          .order('review_date', { ascending: false }),
        supabase
          .from('whiskies')
          .select(`
            id,
            brand,
            name,
            category,
            image_url,
            provided_by_profile_id,
            provided_by:profiles!whiskies_provided_by_profile_id_fkey(display_name)
          `),
        supabase.from('whisky_stats').select('id, review_count, avg_rating'),
      ])

      if (reviewsError || whiskiesError || statsError) {
        setError(
          reviewsError?.message ||
            whiskiesError?.message ||
            statsError?.message ||
            'Error loading data'
        )
        setLoading(false)
        return
      }

      const latestReviewByBottle = new Map<
        string,
        { last_review_date: string | null; last_location: string | null }
      >()

      for (const review of (reviewsData ?? []) as ReviewRow[]) {
        if (!review.whisky_id) continue

        const existing = latestReviewByBottle.get(review.whisky_id)

        if (!existing) {
          latestReviewByBottle.set(review.whisky_id, {
            last_review_date: review.review_date ?? null,
            last_location: review.location ?? null,
          })
          continue
        }

        if ((review.review_date ?? '') > (existing.last_review_date ?? '')) {
          latestReviewByBottle.set(review.whisky_id, {
            last_review_date: review.review_date ?? null,
            last_location: review.location ?? null,
          })
        }
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

      const bottleCards = ((whiskiesData ?? []) as WhiskyRow[])
        .filter((w) => latestReviewByBottle.has(w.id))
        .map((w) => {
          const latest = latestReviewByBottle.get(w.id)
          const stats = statsMap.get(w.id)

          return {
            id: w.id,
            brand: w.brand,
            name: w.name,
            fullName: `${w.brand} ${w.name}`,
            category: w.category,
            image_url: w.image_url,
            provided_by: firstOrSelf(w.provided_by),
            review_count: stats?.review_count ?? 0,
            avg_rating: stats?.avg_rating ?? null,
            last_review_date: latest?.last_review_date ?? null,
            last_location: latest?.last_location ?? null,
          }
        })
        .sort((a, b) =>
          (b.last_review_date ?? '').localeCompare(a.last_review_date ?? '')
        )

      setItems(bottleCards)
      setLoading(false)
    }

    loadPage()
  }, [])

  const filteredItems = useMemo(() => {
    const q = normalize(search)
    if (!q) return items

    return items.filter((item) =>
      normalize(
        [
          item.fullName,
          item.category ?? '',
          item.provided_by?.display_name ?? '',
          item.last_location ?? '',
        ].join(' ')
      ).includes(q)
    )
  }, [items, search])

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 36, fontWeight: 800 }}>Recent Reviews</h1>

      <input
        type="text"
        placeholder="Search bottles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: 12,
          margin: '16px 0',
          borderRadius: 12,
          border: '1px solid #ccc',
        }}
      />

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 14 }}>
        {!loading &&
          !error &&
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/whiskies/${item.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '88px 1fr auto',
                alignItems: 'center',
                gap: 16,
                background: '#eef3fb',
                borderRadius: 20,
                padding: 16,
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              {/* IMAGE */}
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#fff',
                  border: '1px solid #ccc',
                }}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.fullName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      fontSize: 12,
                      color: '#777',
                    }}
                  >
                    No image
                  </div>
                )}
              </div>

              {/* TEXT */}
              <div>
                <div style={{ fontWeight: 700 }}>{item.fullName}</div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  Last reviewed: {formatDate(item.last_review_date)}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  {item.last_location ?? 'No location'}
                </div>
                <div style={{ fontSize: 14, color: '#555' }}>
                  {item.review_count} reviews · Avg{' '}
                  {item.avg_rating != null
                    ? `${item.avg_rating.toFixed(1)}/10`
                    : '—'}
                </div>
              </div>

              {/* SCORE */}
              <div style={{ fontWeight: 800 }}>
                {item.avg_rating != null
                  ? `${item.avg_rating.toFixed(1)}/10`
                  : '—'}
              </div>
            </Link>
          ))}
      </div>
    </main>
  )
}
