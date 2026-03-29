import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type WhiskyRow = {
  id: string
  brand: string
  name: string
  category: string | null
  image_url: string | null
  cost: number | null
  review_count: number | string | null
  avg_rating: number | string | null
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
  review_count: number
  avg_rating: number | null
  provided_by_profile_id: string | null
  provided_by: { display_name: string } | null
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

async function getWhiskies(): Promise<Whisky[]> {
  const { data, error } = await supabase
    .from('whisky_stats')
    .select(`
      id,
      brand,
      name,
      category,
      image_url,
      cost,
      review_count,
      avg_rating,
      provided_by_profile_id,
      provided_by:profiles!whiskies_provided_by_profile_id_fkey(display_name)
    `)
    .order('brand', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data ?? []) as WhiskyRow[]).map((whisky) => ({
    id: whisky.id,
    brand: whisky.brand,
    name: whisky.name,
    category: whisky.category,
    image_url: whisky.image_url,
    cost: whisky.cost != null ? Number(whisky.cost) : null,
    review_count: Number(whisky.review_count ?? 0),
    avg_rating: whisky.avg_rating != null ? Number(whisky.avg_rating) : null,
    provided_by_profile_id: whisky.provided_by_profile_id,
    provided_by: firstOrSelf(whisky.provided_by),
  }))
}

export default async function WhiskiesPage() {
  const whiskies = await getWhiskies()

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Whiskies</h1>
        <p className="text-sm text-gray-500">Browse the club bottle list</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {whiskies.map((whisky) => (
          <Link
            key={whisky.id}
            href={`/whiskies/${whisky.id}`}
            className="rounded-2xl border p-4 shadow-sm transition hover:shadow-md"
          >
            {whisky.image_url ? (
              <img
                src={whisky.image_url}
                alt={`${whisky.brand} ${whisky.name}`}
                className="mb-3 h-44 w-full rounded-xl border object-cover"
              />
            ) : (
              <div className="mb-3 flex h-44 w-full items-center justify-center rounded-xl border text-sm text-gray-500">
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
    </main>
  )
}
