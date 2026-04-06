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

type BottleGroup = {
  whiskyId: string
  bottleName: string
  avgRating: number
  reviews: Review[]
}

type EventGroup = {
  id: string
  tasting_date: string
  location: string
  reviews: Review[]
  bottles: BottleGroup[]
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
  if (!date) return 'Unknown date'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function bottleSortKey(review: Review) {
  const brand = review.whisky?.brand ?? ''
  const name = review.whisky?.name ?? ''
  return `${brand} ${name}`.trim().toLowerCase()
}

async function fetchAllReviews(): Promise<ReviewRow[]> {
  const pageSize = 1000
  let from = 0
  let done = false
  const allRows: ReviewRow[] = []

  while (!done) {
    const { data, error } = await supabase
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
      .not('review_date', 'is', null)
      .order('review_date', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) {
      throw error
    }

    const rows = (data ?? []) as ReviewRow[]
    allRows.push(...rows)

    if (rows.length < pageSize) {
      done = true
    } else {
      from += pageSize
    }
  }

  return allRows
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventGroup[]>([])
  const [selectedYear, setSelectedYear] = useState('all')
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([])
  const [expandedBottleKeys, setExpandedBottleKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      setError('')

      try {
        const [
          { data: sessionsData, error: sessionsError },
          reviewsData,
        ] = await Promise.all([
          supabase
            .from('tasting_sessions')
            .select('id, tasting_date, location')
            .order('tasting_date', { ascending: false }),
          fetchAllReviews(),
        ])

        if (sessionsError) {
          setError(sessionsError.message)
          setLoading(false)
          return
        }

        const normalizedReviews: Review[] = reviewsData.map((review) => ({
          id: review.id,
          review_date: review.review_date,
          rating: Number(review.rating),
          notes: review.notes,
          session_id: review.session_id,
          profile: firstOrSelf(review.profile),
          whisky: firstOrSelf(review.whisky),
        }))

        const sessionByDate = new Map<string, SessionRow>()

        for (const session of (sessionsData ?? []) as SessionRow[]) {
          if (!sessionByDate.has(session.tasting_date)) {
            sessionByDate.set(session.tasting_date, session)
          }
        }

        const reviewMapByDate = new Map<string, Review[]>()

        for (const review of normalizedReviews) {
          const date = review.review_date
          if (!date) continue

          if (!reviewMapByDate.has(date)) {
            reviewMapByDate.set(date, [])
          }

          reviewMapByDate.get(date)!.push(review)
        }

        const groupedEvents: EventGroup[] = Array.from(reviewMapByDate.entries())
          .map(([date, reviews]) => {
            const session = sessionByDate.get(date)

            const sortedReviews = reviews.slice().sort((a, b) => {
              const bottleCompare = bottleSortKey(a).localeCompare(bottleSortKey(b))
              if (bottleCompare !== 0) return bottleCompare
              if (b.rating !== a.rating) return b.rating - a.rating
              const reviewerA = (a.profile?.display_name ?? '').toLowerCase()
              const reviewerB = (b.profile?.display_name ?? '').toLowerCase()
              return reviewerA.localeCompare(reviewerB)
            })

            const bottleMap = new Map<string, Review[]>()

            for (const review of sortedReviews) {
              const whiskyId = review.whisky?.id
              if (!whiskyId) continue

              if (!bottleMap.has(whiskyId)) {
                bottleMap.set(whiskyId, [])
              }

              bottleMap.get(whiskyId)!.push(review)
            }

            const bottles: BottleGroup[] = Array.from(bottleMap.entries())
              .map(([whiskyId, bottleReviews]) => {
                const firstReview = bottleReviews[0]
                const brand = firstReview.whisky?.brand ?? ''
                const name = firstReview.whisky?.name ?? ''
                const bottleName = `${brand} ${name}`.trim() || 'Unknown bottle'
                const avgRating =
                  bottleReviews.reduce((sum, r) => sum + Number(r.rating), 0) / bottleReviews.length

                const sortedBottleReviews = bottleReviews.slice().sort((a, b) => {
                  if (b.rating !== a.rating) return b.rating - a.rating
                  const reviewerA = (a.profile?.display_name ?? '').toLowerCase()
                  const reviewerB = (b.profile?.display_name ?? '').toLowerCase()
                  return reviewerA.localeCompare(reviewerB)
                })

                return {
                  whiskyId,
                  bottleName,
                  avgRating,
                  reviews: sortedBottleReviews,
                }
              })
              .sort((a, b) => a.bottleName.toLowerCase().localeCompare(b.bottleName.toLowerCase()))

            return {
              id: date,
              tasting_date: date,
              location: session?.location ?? 'Unknown location',
              reviews: sortedReviews,
              bottles,
            }
          })
          .sort((a, b) => b.tasting_date.localeCompare(a.tasting_date))

        setEvents(groupedEvents)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading events')
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  const years = useMemo(() => {
    return Array.from(new Set(events.map((event) => yearFromDate(event.tasting_date)))).sort(
      (a, b) => {
        if (a === 'Unknown') return 1
        if (b === 'Unknown') return -1
        return Number(b) - Number(a)
      }
    )
  }, [events])

  const filteredEvents = useMemo(() => {
    if (selectedYear === 'all') return events
    return events.filter((event) => yearFromDate(event.tasting_date) === selectedYear)
  }, [events, selectedYear])

  function toggleEvent(eventId: string) {
    setExpandedEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId]
    )
  }

  function toggleBottle(eventId: string, whiskyId: string) {
    const key = `${eventId}::${whiskyId}`
    setExpandedBottleKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  function isBottleExpanded(eventId: string, whiskyId: string) {
    return expandedBottleKeys.includes(`${eventId}::${whiskyId}`)
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 8 }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Events</h1>
        <p style={heroText}>Browse tasting events, then drill into bottles and their reviews.</p>

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
          {filteredEvents.map((event) => {
            const isExpanded = expandedEventIds.includes(event.id)

            return (
              <section key={event.id} style={cardStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: isExpanded ? 14 : 0,
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
                      {event.reviews.length === 1 ? '' : 's'} · {event.bottles.length} bottle
                      {event.bottles.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={pillStyle}>{yearFromDate(event.tasting_date)}</div>

                    <button
                      type="button"
                      onClick={() => toggleEvent(event.id)}
                      style={buttonStyle}
                    >
                      {isExpanded ? 'Hide Bottles' : 'Show Bottles'}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  event.bottles.length > 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {event.bottles.map((bottle) => {
                        const bottleExpanded = isBottleExpanded(event.id, bottle.whiskyId)

                        return (
                          <div key={bottle.whiskyId} style={innerCardStyle}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 16,
                                flexWrap: 'wrap',
                                marginBottom: bottleExpanded ? 12 : 0,
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                                  <Link
                                    href={`/whiskies/${encodeURIComponent(bottle.whiskyId)}`}
                                    style={{ color: '#0f172a', textDecoration: 'none' }}
                                  >
                                    {bottle.bottleName}
                                  </Link>
                                </div>

                                <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
                                  Average: {bottle.avgRating.toFixed(2)} / 10 · {bottle.reviews.length}{' '}
                                  review{bottle.reviews.length === 1 ? '' : 's'}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  gap: 10,
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={scorePillStyle}>{bottle.avgRating.toFixed(2)}</div>

                                <button
                                  type="button"
                                  onClick={() => toggleBottle(event.id, bottle.whiskyId)}
                                  style={buttonStyle}
                                >
                                  {bottleExpanded ? 'Hide Reviews' : 'Show Reviews'}
                                </button>
                              </div>
                            </div>

                            {bottleExpanded ? (
                              <div style={{ display: 'grid', gap: 10 }}>
                                {bottle.reviews.map((review) => (
                                  <div key={review.id} style={reviewCardStyle}>
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
                                        <div
                                          style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: '#0f172a',
                                          }}
                                        >
                                          {review.profile?.display_name ?? 'Unknown reviewer'}
                                        </div>

                                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                                          {formatDate(review.review_date)}
                                        </div>
                                      </div>

                                      <div style={smallScorePillStyle}>{review.rating}/10</div>
                                    </div>

                                    {review.notes ? (
                                      <p
                                        style={{
                                          marginTop: 10,
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
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={innerCardStyle}>No bottles or reviews linked to this event yet.</div>
                  )
                ) : null}
              </section>
            )
          })}
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

const reviewCardStyle: React.CSSProperties = {
  borderRadius: 14,
  padding: 12,
  background: '#ffffff',
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

const smallScorePillStyle: React.CSSProperties = {
  border: '1px solid #93c5fd',
  borderRadius: 9999,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 800,
  color: '#1d4ed8',
  background: '#eff6ff',
  whiteSpace: 'nowrap',
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 14px',
  border: '1px solid #1d4ed8',
  borderRadius: 12,
  background: '#ffffff',
  color: '#1d4ed8',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
