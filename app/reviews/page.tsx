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
  provided_by_profile_id: string | null
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

      if (reviewsError) {
        setError(reviewsError.message)
        setLoading(false)
        return
      }

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

        const currentDate = review.review_date ?? ''
        const existingDate = existing.last_review_date ?? ''
        if (currentDate > existingDate) {
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
        .filter((whisky) => latestReviewByBottle.has(whisky.id))
        .map((whisky) => {
          const latest = latestReviewByBottle.get(whisky.id)
          const stats = statsMap.get(whisky.id)

          return {
            id: whisky.id,
            brand: whisky.brand,
            name: whisky.name,
            fullName: `${whisky.brand} ${whisky.name}`,
            category: whisky.category,
            image_url: whisky.image_url,
            provided_by_profile_id: whisky.provided_by_profile_id,
            provided_by: firstOrSelf(whisky.provided_by),
            review_count: stats?.review_count ?? 0,
            avg_rating: stats?.avg_rating ?? null,
            last_review_date: latest?.last_review_date ?? null,
            last_location: latest?.last_location ?? null,
          }
        })
        .sort((a, b) => {
          const aDate = a.last_review_date ?? ''
          const bDate = b.last_review_date ?? ''
          if (aDate !== bDate) return bDate.localeCompare(aDate)
          return a.fullName.localeCompare(b.fullName)
        })

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
          item.last_review_date ?? '',
        ].join(' ')
      ).includes(q)
    )
  }, [items, search])

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
      <section
        style={{
          background: '#e9eef8',
          borderRadius: 28,
          padding: 28,
          marginBottom: 18,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 800,
            color: '#0f172a',
          }}
        >
          Recent Reviews
        </h1>

        <p
          style={{
            marginTop: 12,
            marginBottom: 18,
            fontSize: 15,
            color: '#475569',
          }}
        >
          Browse recently reviewed bottles from the club.
        </p>

        <input
          type="text"
          placeholder="Search bottles, categories, providers, locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 16,
            border: '1px solid #cbd5e1',
            fontSize: 15,
            outline: 'none',
            marginBottom: 14,
          }}
        />

        <div style={{ fontSize: 14, color: '#475569' }}>
          {loading
            ? 'Loading bottles...'
            : `Showing ${filteredItems.length} of ${items.length} bottles`}
        </div>
      </section>

      {error ? (
        <div
          style={{
            background: '#fff',
            borderRadius: 24,
            padding: 20,
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 14 }}>
        {!loading &&
          !error &&
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/whiskies/${item.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                background: '#eef3fb',
                borderRadius: 24,
                padding: 20,
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  {item.fullName}
                </div>

                <div style={{ fontSize: 15, color: '#475569', marginBottom: 4 }}>
                  Last reviewed: {formatDate(item.last_review_date)}
                </div>

                <div style={{ fontSize: 15, color: '#475569', marginBottom: 4 }}>
                  {item.last_location ?? 'No location'}
                </div>

                <div style={{ fontSize: 15, color: '#475569' }}>
                  {item.review_count} review{item.review_count === 1 ? '' : 's'}
                  {' · '}
                  Avg{' '}
                  {item.avg_rating != null ? `${item.avg_rating.toFixed(1)}/10` : '—'}
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  padding: '12px 18px',
                  borderRadius: 999,
                  border: '1px solid #bfd0e6',
                  fontWeight: 800,
                  fontSize: 16,
                  color: '#1d4ed8',
                  background: '#f8fbff',
                }}
              >
                {item.avg_rating != null ? `${item.avg_rating.toFixed(1)}/10` : '—'}
              </div>
            </Link>
          ))}

        {!loading && !error && filteredItems.length === 0 ? (
          <div
            style={{
              background: '#eef3fb',
              borderRadius: 24,
              padding: 20,
              color: '#475569',
            }}
          >
            No bottles found.
          </div>
        ) : null}
      </div>
    </main>
  )
}
