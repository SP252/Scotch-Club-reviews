'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type ReviewRow = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  profile_id: string | null
  profile: MaybeArray<{ display_name: string }>
  whisky: MaybeArray<{ id: string; brand: string; name: string; category: string | null }>
  session: MaybeArray<{ tasting_date: string; location: string }>
}

type Review = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  profile_id: string | null
  profile: { display_name: string } | null
  whisky: { id: string; brand: string; name: string; category: string | null } | null
  session: { tasting_date: string; location: string } | null
}

type PersonOption = {
  id: string
  display_name: string
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function yearFromDate(date: string | null | undefined) {
  if (!date) return ''
  return String(date).slice(0, 4)
}

export default function MemberRankingsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [people, setPeople] = useState<PersonOption[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [mode, setMode] = useState<'top' | 'bottom'>('top')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      const [{ data: peopleData, error: peopleError }, { data: reviewsData, error: reviewsError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, display_name')
            .order('display_name', { ascending: true }),
          supabase
            .from('reviews')
            .select(`
              id,
              review_date,
              rating,
              notes,
              profile_id,
              profile:profiles(display_name),
              whisky:whiskies(id, brand, name, category),
              session:tasting_sessions(tasting_date, location)
            `)
            .order('review_date', { ascending: false }),
        ])

      if (peopleError) {
        setError(peopleError.message)
        setLoading(false)
        return
      }

      if (reviewsError) {
        setError(reviewsError.message)
        setLoading(false)
        return
      }

      const normalizedPeople: PersonOption[] = (peopleData ?? []).map((p: any) => ({
        id: p.id,
        display_name: p.display_name,
      }))

      const normalizedReviews: Review[] = ((reviewsData ?? []) as ReviewRow[]).map((review) => ({
        id: review.id,
        review_date: review.review_date,
        rating: Number(review.rating),
        notes: review.notes,
        profile_id: review.profile_id,
        profile: firstOrSelf(review.profile),
        whisky: firstOrSelf(review.whisky),
        session: firstOrSelf(review.session),
      }))

      setPeople(normalizedPeople)
      setReviews(normalizedReviews)

      if (normalizedPeople.length > 0) {
        setSelectedPersonId((current) => current || normalizedPeople[0].id)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const years = useMemo(() => {
    const uniqueYears = Array.from(
      new Set(
        reviews
          .map((r) => yearFromDate(r.review_date))
          .filter(Boolean)
      )
    ).sort((a, b) => Number(b) - Number(a))

    return uniqueYears
  }, [reviews])

  const filteredReviews = useMemo(() => {
    let result = reviews.filter((review) => review.profile_id === selectedPersonId)

    if (selectedYear !== 'all') {
      result = result.filter((review) => yearFromDate(review.review_date) === selectedYear)
    }

    result = [...result].sort((a, b) => {
      if (mode === 'top') {
        if (b.rating !== a.rating) return b.rating - a.rating
      } else {
        if (a.rating !== b.rating) return a.rating - b.rating
      }

      return a.review_date.localeCompare(b.review_date)
    })

    return result.slice(0, 10)
  }, [reviews, selectedPersonId, selectedYear, mode])

  const selectedPerson = people.find((p) => p.id === selectedPersonId)

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
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
          Member Rankings
        </h1>

        <p
          style={{
            fontSize: 14,
            color: '#cbd5e1',
            marginTop: 6,
            marginBottom: 18,
          }}
        >
          See each member&apos;s top 10 or bottom 10 reviews by year or all-time.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#cbd5e1',
                marginBottom: 6,
              }}
            >
              Member
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid rgba(148, 163, 184, 0.28)',
                borderRadius: 12,
                fontSize: 14,
                background: 'rgba(15, 23, 36, 0.72)',
                color: '#f8fafc',
              }}
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#cbd5e1',
                marginBottom: 6,
              }}
            >
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid rgba(148, 163, 184, 0.28)',
                borderRadius: 12,
                fontSize: 14,
                background: 'rgba(15, 23, 36, 0.72)',
                color: '#f8fafc',
              }}
            >
              <option value="all">All-time</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#cbd5e1',
                marginBottom: 6,
              }}
            >
              Ranking Type
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'top' | 'bottom')}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid rgba(148, 163, 184, 0.28)',
                borderRadius: 12,
                fontSize: 14,
                background: 'rgba(15, 23, 36, 0.72)',
                color: '#f8fafc',
              }}
            >
              <option value="top">Top 10</option>
              <option value="bottom">Bottom 10</option>
            </select>
          </div>
        </div>
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
          Loading rankings...
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
      ) : (
        <>
          <div
            style={{
              marginBottom: 14,
              color: '#e5e7eb',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {selectedPerson?.display_name ?? 'Member'} — {mode === 'top' ? 'Top 10' : 'Bottom 10'}{' '}
            {selectedYear === 'all' ? 'All-time Reviews' : `Reviews for ${selectedYear}`}
          </div>

          {filteredReviews.length === 0 ? (
            <div
              style={{
                border: '1px solid rgba(148, 163, 184, 0.16)',
                borderRadius: 16,
                padding: 16,
                color: '#cbd5e1',
                background: 'rgba(15, 23, 36, 0.72)',
              }}
            >
              No reviews found for that member/year combination.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredReviews.map((review, index) => (
                <Link
                  key={review.id}
                  href={review.whisky ? `/whiskies/${review.whisky.id}` : '#'}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    color: '#f8fafc',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    borderRadius: 18,
                    padding: 16,
                    background:
                      'linear-gradient(180deg, rgba(30,41,59,0.86), rgba(30,27,24,0.86))',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                  }}
                >
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
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#f8fafc',
                          marginBottom: 4,
                        }}
                      >
                        #{index + 1} · {review.whisky ? `${review.whisky.brand} ${review.whisky.name}` : 'Unknown bottle'}
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          color: '#cbd5e1',
                          marginBottom: 4,
                        }}
                      >
                        {review.review_date}
                        {review.session?.location ? ` · ${review.session.location}` : ''}
                      </div>

                      {review.notes ? (
                        <div
                          style={{
                            fontSize: 14,
                            color: '#e5e7eb',
                            lineHeight: 1.5,
                            maxWidth: 700,
                          }}
                        >
                          {review.notes}
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: 9999,
                        padding: '8px 14px',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#f8fafc',
                        background: 'rgba(255,255,255,0.04)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {review.rating.toFixed(1)} / 10
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
