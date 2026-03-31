'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type ReviewRow = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  whisky_id: string
  profile: MaybeArray<{ display_name: string }>
  whisky: MaybeArray<{ id: string; brand: string; name: string; category: string | null }>
  session: MaybeArray<{ tasting_date: string; location: string }>
}

type Review = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  whisky_id: string
  profile: { display_name: string } | null
  whisky: { id: string; brand: string; name: string; category: string | null } | null
  session: { tasting_date: string; location: string } | null
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

export default function HomePage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReviews() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          review_date,
          rating,
          notes,
          whisky_id,
          profile:profiles(display_name),
          whisky:whiskies(id, brand, name, category),
          session:tasting_sessions(tasting_date, location)
        `)
        .order('review_date', { ascending: false })
        .limit(200)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const normalized: Review[] = ((data ?? []) as ReviewRow[]).map((review) => ({
        id: review.id,
        review_date: review.review_date,
        rating: Number(review.rating),
        notes: review.notes,
        whisky_id: review.whisky_id,
        profile: firstOrSelf(review.profile),
        whisky: firstOrSelf(review.whisky),
        session: firstOrSelf(review.session),
      }))

      setReviews(normalized)
      setLoading(false)
    }

    loadReviews()
  }, [])

  const filteredReviews = useMemo(() => {
    const q = normalize(search)
    if (!q) return reviews

    return reviews.filter((review) => {
      const reviewer = review.profile?.display_name ?? ''
      const brand = review.whisky?.brand ?? ''
      const name = review.whisky?.name ?? ''
      const bottle = `${brand} ${name}`
      const category = review.whisky?.category ?? ''
      const location = review.session?.location ?? ''
      const notes = review.notes ?? ''
      const date = review.review_date ?? ''

      const searchable = normalize(
        [reviewer, brand, name, bottle, category, location, notes, date].join(' ')
      )

      return searchable.includes(q)
    })
  }, [reviews, search])

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 8 }}>
      <section
        style={{
          borderRadius: 24,
          padding: 28,
          background: 'linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%)',
          border: '1px solid rgba(255,255,255,0.55)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.30)',
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0, color: '#0f172a' }}>
          Recent Reviews
        </h1>
        <p style={{ fontSize: 15, color: '#334155', marginTop: 10, marginBottom: 16 }}>
          Browse recent tasting notes from the club.
        </p>

        <input
          type="text"
          placeholder="Search reviews, bottles, reviewers, locations, notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />

        <p style={{ fontSize: 14, color: '#334155', marginTop: 10, marginBottom: 0 }}>
          Showing {filteredReviews.length} of {reviews.length} reviews
        </p>
      </section>

      {loading ? (
        <div style={cardStyle}>Loading reviews...</div>
      ) : error ? (
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredReviews.map((review) => (
            <div key={review.id} style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  {review.whisky ? (
                    <Link
                      href={`/whiskies/${review.whisky.id}`}
                      style={{
                        fontWeight: 800,
                        color: '#0f172a',
                        textDecoration: 'none',
                      }}
                    >
                      {review.whisky.brand} {review.whisky.name}
                    </Link>
                  ) : (
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>Unknown bottle</div>
                  )}

                  <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
                    {review.profile?.display_name ?? 'Unknown reviewer'} · {review.review_date}
                  </div>

                  {review.session?.location ? (
                    <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
                      {review.session.location}
                    </div>
                  ) : null}
                </div>

                <div style={pillStyle}>{review.rating}/10</div>
              </div>

              {review.notes ? (
                <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: '#1e293b' }}>
                  {review.notes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  )
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
