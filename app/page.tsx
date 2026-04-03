'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type ReviewRow = {
  whisky_id: string | null
  review_date: string | null
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

export default function HomePage() {
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
          .select('whisky_id, review_date')
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
        { last_review_date: string | null }
      >()

      for (const review of (reviewsData ?? []) as ReviewRow[]) {
        if (!review.whisky_id) continue

        const existing = latestReviewByBottle.get(review.whisky_id)

        if (!existing) {
          latestReviewByBottle.set(review.whisky_id, {
            last_review_date: review.review_date ?? null,
          })
          continue
        }

        if ((review.review_date ?? '') > (existing.last_review_date ?? '')) {
          latestReviewByBottle.set(review.whisky_id, {
            last_review_date: review.review_date ?? null,
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
        ].join(' ')
      ).includes(q)
    )
  }, [items, search])

  return (
    <main style={pageStyle}>
      <section style={heroShellStyle}>
        <h1 style={siteTitleStyle}>Scotch Club</h1>
        <p style={siteSubtitleStyle}>Private whiskey reviews for the club</p>

        <div style={navRowStyle}>
          <Link href="/" style={navPillStyle}>
            Recent Reviews
          </Link>
          <Link href="/whiskies" style={navPillStyle}>
            Whiskies
          </Link>
          <Link href="/whiskies/new" style={navPillStyle}>
            Add Bottle
          </Link>
          <Link href="/leaderboard" style={navPillStyle}>
            Leaderboard
          </Link>
          <Link href="/events" style={navPillStyle}>
            Events
          </Link>
          <Link href="/member-rankings" style={navPillStyle}>
            Member Rankings
          </Link>
          <Link href="/provider-spend" style={navPillStyle}>
            Provider Spend
          </Link>
          <Link href="/reviews/new" style={navPillStyle}>
            Add Review
          </Link>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={panelTitleStyle}>Recent Reviews</h2>
        <p style={panelSubtitleStyle}>
          Browse recently reviewed bottles from the club.
        </p>

        <input
          type="text"
          placeholder="Search bottles, categories, providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchStyle}
        />

        <div style={countStyle}>
          {loading
            ? 'Loading bottles...'
            : `Showing ${filteredItems.length} of ${items.length} bottles`}
        </div>
      </section>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <section style={listStyle}>
        {!loading &&
          !error &&
          filteredItems.map((item) => (
            <Link key={item.id} href={`/whiskies/${item.id}`} style={cardStyle}>
              <div style={thumbWrapStyle}>
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.fullName}
                    style={thumbImageStyle}
                  />
                ) : (
                  <div style={thumbFallbackStyle}>No image</div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={cardTitleStyle}>{item.fullName}</div>

                <div style={metaStyle}>
                  Last reviewed: {formatDate(item.last_review_date)}
                </div>

                <div style={metaStyle}>
                  {item.review_count} review{item.review_count === 1 ? '' : 's'} · Avg{' '}
                  {item.avg_rating != null
                    ? `${item.avg_rating.toFixed(1)}/10`
                    : '—'}
                </div>
              </div>

              <div style={scorePillStyle}>
                {item.avg_rating != null
                  ? `${item.avg_rating.toFixed(1)}/10`
                  : '—'}
              </div>
            </Link>
          ))}

        {!loading && !error && filteredItems.length === 0 ? (
          <div style={emptyStyle}>No bottles found.</div>
        ) : null}
      </section>
    </main>
  )
}

/* styles unchanged */

const pageStyle = { maxWidth: 1220, margin: '0 auto', padding: '8px 8px 40px' }
const heroShellStyle = {
  borderRadius: 28,
  padding: '22px 24px 16px',
  marginBottom: 36,
  background:
    'radial-gradient(circle at top left, rgba(30,64,175,0.18), transparent 35%), radial-gradient(circle at top right, rgba(180,83,9,0.18), transparent 35%), linear-gradient(135deg, rgba(15,23,42,0.96), rgba(41,37,36,0.96))',
}
const siteTitleStyle = { color: '#fff', fontSize: 38, fontWeight: 800 }
const siteSubtitleStyle = { color: '#fff', marginBottom: 18 }
const navRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 12 }
const navPillStyle = {
  color: '#fff',
  padding: '12px 18px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.14)',
}
const panelStyle = {
  maxWidth: 980,
  margin: '0 auto 22px',
  background: '#e9eff9',
  borderRadius: 32,
  padding: 34,
}
const panelTitleStyle = { fontSize: 66, fontWeight: 800 }
const panelSubtitleStyle = { marginTop: 14, marginBottom: 22 }
const searchStyle = {
  width: '100%',
  padding: 15,
  borderRadius: 18,
  border: '1px solid #cbd5e1',
}
const countStyle = { marginTop: 14 }
const listStyle = { maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }
const cardStyle = {
  display: 'grid',
  gridTemplateColumns: '88px 1fr auto',
  gap: 16,
  background: '#eef3fb',
  borderRadius: 24,
  padding: 18,
}
const thumbWrapStyle = {
  width: 88,
  height: 88,
  borderRadius: 16,
  overflow: 'hidden',
  background: '#fff',
}
const thumbImageStyle = { width: '100%', height: '100%', objectFit: 'contain' }
const thumbFallbackStyle = { fontSize: 12, color: '#64748b' }
const cardTitleStyle = { fontSize: 20, fontWeight: 800 }
const metaStyle = { fontSize: 15, color: '#475569' }
const scorePillStyle = { fontWeight: 800 }
const emptyStyle = { padding: 20 }
const errorStyle = { color: '#991b1b' }
