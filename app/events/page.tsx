'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type SessionRow = {
  id: number
  tasting_date: string
  location: string
}

type ReviewRow = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  session_id: number | null
  profile: MaybeArray<{ display_name: string }>
  whisky: MaybeArray<{ id: string; brand: string; name: string; category: string | null }>
}

type Review = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  session_id: number | null
  profile: { display_name: string } | null
  whisky: { id: string; brand: string; name: string; category: string | null } | null
}

type EventGroup = {
  id: number
  tasting_date: string
  location: string
  reviews: Review[]
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function yearFromDate(date: string | null | undefined) {
  if (!date) return 'Unknown'
  return String(date).slice(0, 4)
}

function formatDate(date: string) {
  return date
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventGroup[]>([])
  const [selectedYear, setSelectedYear] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      setError('')

      const [
        { data: sessionsData, error: sessionsError },
        { data: reviewsData, error: reviewsError },
      ] = await Promise.all([
        supabase
          .from('tasting_sessions')
          .select('id, tasting_date, location')
          .order('tasting_date', { ascending: false }),
        supabase
          .from('reviews')
          .select(`
            id,
            review_date,
            rating,
            notes,
            session_id,
            profile:profiles(display_name),
            whisky:whiskies(id, brand, name, category)
          `)
          .order('review_date', { ascending: false }),
      ])

      if (sessionsError) {
        setError(sessionsError.message)
        setLoading(false)
        return
      }

      if (reviewsError) {
        setError(reviewsError.message)
        setLoading(false)
        return
      }

      const normalizedReviews: Review[] = ((reviewsData ?? []) as ReviewRow[]).map((review) => ({
        id: review.id,
        review_date: review.review_date,
        rating: Number(review.rating),
        notes: review.notes,
        session_id: review.session_id,
        profile: firstOrSelf(review.profile),
        whisky: firstOrSelf(review.whisky),
      }))

      const reviewMap = new Map<number, Review[]>()

      for (const review of normalizedReviews) {
        if (review.session_id == null) continue
        if (!reviewMap.has(review.session_id)) {
          reviewMap.set(review.session_id, [])
        }
        reviewMap.get(review.session_id)!.push(review)
      }

      const groupedEvents: EventGroup[] = ((sessionsData ?? []) as SessionRow[])
        .map((session) => ({
          id: Number(session.id),
          tasting_date: session.tasting_date,
          location: session.location,
          reviews: reviewMap.get(Number(session.id)) ?? [],
        }))
        .filter((event) => event.reviews.length > 0)
        .sort((a, b) => {
          if (a.tasting_date !== b.tasting_date) {
            return b.tasting_date.localeCompare(a.tasting_date)
          }
          return a.location.localeCompare(b.location)
        })

      setEvents(groupedEvents)
      setLoading(false)
    }

    loadEvents()
  }, [])

  const years = useMemo(() => {
    return Array.from(new Set(events.map((event) => yearFromDate(event.tasting_date))))
      .sort((a, b) => Number(b) - Number(a))
  }, [events])

  const filteredEvents = useMemo(() => {
    if (selectedYear === 'all') return events
    return events.filter((event) => yearFromDate(event.tasting_date) === selectedYear)
  }, [events, selectedYear])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 8 }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Events</h1>
        <p style={heroText}>Browse tasting events and the reviews submitted at each one.</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 320px)',
            gap: 12,
            marginTop: 16,
          }}
        >
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <div style={cardStyle}>Loading events...</div>
      ) : error ? (
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error}</div>
      ) : filteredEvents.length === 0 ? (
        <div style={cardStyle}>No events found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {filteredEvents.map((event) => (
            <section key={event.id} style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    {event.location}
                  </h2>
                  <div style={{ marginTop: 6, fontSize: 14, color: '#475569' }}>
                    {formatDate(event.tasting_date)} · {event.reviews.length} review
                    {event.reviews.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div style={pillStyle}>{yearFromDate(event.tasting_date)}</div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {event.reviews.map((review) => (
                  <div key={review.id} style={innerCardStyle}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                          {review.whisky ? (
                            <Link
                              href={`/whiskies/${encodeURIComponent(review.whisky.id)}`}
                              style={{ color: '#0f172a', textDecoration: 'none' }}
                            >
                              {review.whisky.brand} {review.whisky.name}
                            </Link>
                          ) : (
                            'Unknown bottle'
                          )}
                        </div>

                        <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
                          {review.profile?.display_name ?? 'Unknown reviewer'}
                        </div>
                      </div>

                      <div style={scorePillStyle}>{review.rating}/10</div>
                    </div>

                    {review.notes ? (
                      <p
                        style={{
                          marginTop: 12,
                          marginBottom: 0,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: '#1e293b',
                        }}
                      >
                        {review.notes}
                      </p>
                    ) : null}
                  </div>
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

const innerCardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 14,
  background: '#f8fbff',
  border: '1px solid #d7e2f0',
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

const scorePillStyle: React.CSSProperties = {
  border: '1px solid #93c5fd',
  borderRadius: 9999,
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 800,
  color: '#1d4ed8',
  background: '#eff6ff',
  whiteSpace: 'nowrap',
}
