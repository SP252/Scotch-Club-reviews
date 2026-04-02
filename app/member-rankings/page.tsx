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

export default function MemberRankingsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [people, setPeople] = useState<PersonOption[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedBrand, setSelectedBrand] = useState('all')
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
      new Set(reviews.map((r) => yearFromDate(r.review_date)).filter(Boolean))
    ).sort((a, b) => Number(b) - Number(a))
    return uniqueYears
  }, [reviews])

  const categories = useMemo(() => {
    const found = Array.from(
      new Set(
        reviews
          .map((review) => normalizeCategory(review.whisky?.category ?? null))
          .filter(Boolean)
      )
    )

    return found.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a)
      const bIndex = categoryOrder.indexOf(b)

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [reviews])

  const brands = useMemo(() => {
    return Array.from(
      new Set(
        reviews
          .map((review) => review.whisky?.brand?.trim() ?? '')
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [reviews])

  const filteredReviews = useMemo(() => {
    let result = reviews.filter((review) => review.profile_id === selectedPersonId)

    if (selectedYear !== 'all') {
      result = result.filter((review) => yearFromDate(review.review_date) === selectedYear)
    }

    if (selectedCategory !== 'all') {
      result = result.filter(
        (review) => normalizeCategory(review.whisky?.category ?? null) === selectedCategory
      )
    }

    if (selectedBrand !== 'all') {
      result = result.filter(
        (review) => (review.whisky?.brand?.trim() ?? '') === selectedBrand
      )
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
  }, [reviews, selectedPersonId, selectedYear, selectedCategory, selectedBrand, mode])

  const selectedPerson = people.find((p) => p.id === selectedPersonId)

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 8 }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Member Rankings</h1>
        <p style={heroText}>
          See each member&apos;s top 10 or bottom 10 reviews by year, whiskey type, and brand.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <select value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)} style={inputStyle}>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name}
              </option>
            ))}
          </select>

          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={inputStyle}>
            <option value="all">All-time</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={inputStyle}>
            <option value="all">All Types</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} style={inputStyle}>
            <option value="all">All Brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>

          <select value={mode} onChange={(e) => setMode(e.target.value as 'top' | 'bottom')} style={inputStyle}>
            <option value="top">Top 10</option>
            <option value="bottom">Bottom 10</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div style={cardStyle}>Loading rankings...</div>
      ) : error ? (
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error}</div>
      ) : filteredReviews.length === 0 ? (
        <div style={cardStyle}>No reviews found for that combination.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredReviews.map((review, index) => (
            <Link
              key={review.id}
              href={review.whisky ? `/whiskies/${review.whisky.id}` : '#'}
              style={{ ...cardStyle, textDecoration: 'none', color: '#0f172a' }}
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
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                    #{index + 1} · {review.whisky ? `${review.whisky.brand} ${review.whisky.name}` : 'Unknown bottle'}
                  </div>
                  <div style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>
                    {selectedPerson?.display_name ?? 'Member'} · {review.review_date}
                    {review.session?.location ? ` · ${review.session.location}` : ''}
                  </div>
                  {review.notes ? (
                    <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5, maxWidth: 700 }}>
                      {review.notes}
                    </div>
                  ) : null}
                </div>

                <div style={pillStyle}>{review.rating.toFixed(1)} / 10</div>
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
