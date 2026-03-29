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

type Whisky = {
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
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function WhiskiesPage() {
  const [whiskies, setWhiskies] = useState<Whisky[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadWhiskies() {
      setLoading(true)
      setError('')

      const [{ data: whiskiesData, error: whiskiesError }, { data: statsData, error: statsError }] =
        await Promise.all([
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
            `)
            .order('brand', { ascending: true }),
          supabase
            .from('whisky_stats')
            .select('id, review_count, avg_rating'),
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

      const statsMap = new Map(
        (statsData ?? []).map((row: any) => [
          row.id,
          {
            review_count: Number(row.review_count ?? 0),
            avg_rating: row.avg_rating != null ? Number(row.avg_rating) : null,
          },
        ])
      )

      const merged = ((whiskiesData ?? []) as WhiskyRow[]).map((whisky) => {
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
        }
      })

      setWhiskies(merged)
      setLoading(false)
    }

    loadWhiskies()
  }, [])

  const filteredWhiskies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return whiskies

    return whiskies.filter((whisky) => {
      const haystack = [
        whisky.brand,
        whisky.name,
        whisky.category ?? '',
        whisky.provided_by?.display_name ?? '',
        whisky.provided_by_profile_id ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [whiskies, search])

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 space-y-3">
        <div>
          <h1 className="text-3xl font-bold">Whiskies</h1>
          <p className="text-sm text-gray-500">Browse the club bottle list</p>
        </div>

        <input
          type="text"
          placeholder="Search bottles, categories, or providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border p-3"
        />

        <p className="text-sm text-gray-500">
          Showing {filteredWhiskies.length} of {whiskies.length} bottles
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border p-6 text-sm text-gray-500">Loading whiskies...</div>
      ) : error ? (
        <div className="rounded-2xl border p-6 text-sm text-red-600">{error}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWhiskies.map((whisky) => (
            <Link
              key={whisky.id}
              href={`/whiskies/${whisky.id}`}
              className="rounded-2xl border p-4 shadow-sm transition hover:shadow-md"
            >
              {whisky.image_url ? (
                <img
                  src={whisky.image_url}
                  alt={`${whisky.brand} ${whisky.name}`}
                  className="mb-3 aspect-[4/3] w-full rounded-xl border object-cover"
                />
              ) : (
                <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-xl border text-sm text-gray-500">
                  No photo
                </div>
              )}

              <div className="space-y-1">
                <h2 className="font-semibold">
                  {whisky.brand} {whisky.name}
                </h2>

                <p className="text-sm text-gray-500">
                  {whisky.category ?? 'Unknown category'}
                </p>

                <p className="text-sm text-gray-500">
                  Price: {whisky.cost != null ? `$${whisky.cost.toFixed(2)}` : '—'}
                </p>

                <p className="text-sm text-gray-500">
                  Provided by:{' '}
                  {whisky.provided_by?.display_name ?? whisky.provided_by_profile_id ?? '—'}
                </p>

                <p className="text-sm">
                  Average: {whisky.avg_rating != null ? whisky.avg_rating.toFixed(2) : '—'} · Reviews:{' '}
                  {whisky.review_count}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
