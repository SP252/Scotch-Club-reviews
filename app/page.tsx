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
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold">Scotch Club</h1>
          <p className="text-sm text-gray-500">Recent reviews from the club</p>
        </div>

        <input
          type="text"
          placeholder="Search reviews, bottles, reviewers, locations, notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border p-3"
        />

        <p className="text-sm text-gray-500">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border p-6 text-sm text-gray-500">
          Loading reviews...
        </div>
      ) : error ? (
        <div className="rounded-2xl border p-6 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => (
            <div key={review.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {review.whisky ? (
                    <Link
                      href={`/whiskies/${review.whisky.id}`}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {review.whisky.brand} {review.whisky.name}
                    </Link>
                  ) : (
                    <h2 className="font-semibold">Unknown bottle</h2>
                  )}

                  <p className="text-sm text-gray-500">
                    {review.profile?.display_name ?? 'Unknown reviewer'} · {review.review_date}
                  </p>

                  {review.session?.location ? (
                    <p className="text-sm text-gray-500">{review.session.location}</p>
                  ) : null}
                </div>

                <div className="rounded-full border px-3 py-1 text-sm font-medium">
                  {review.rating}/10
                </div>
              </div>

              {review.notes ? (
                <p className="mt-3 text-sm leading-6">{review.notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
