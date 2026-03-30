import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type ReviewRow = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  profile: MaybeArray<{ display_name: string }>
  session: MaybeArray<{ tasting_date: string; location: string }>
}

type Review = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  profile: { display_name: string } | null
  session: { tasting_date: string; location: string } | null
}

type WhiskyRow = {
  id: string
  brand: string
  name: string
  category: string | null
  age_years: number | null
  cost: number | null
  image_url: string | null
  provided_by_profile_id: string | null
  provided_by: MaybeArray<{ display_name: string }>
}

type Whisky = {
  id: string
  brand: string
  name: string
  category: string | null
  age_years: number | null
  cost: number | null
  image_url: string | null
  provided_by_profile_id: string | null
  provided_by: { display_name: string } | null
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

async function getWhiskyDetail(id: string): Promise<{ whisky: Whisky; reviews: Review[] }> {
  const [{ data: whiskyData, error: whiskyError }, { data: reviewsData, error: reviewsError }] =
    await Promise.all([
      supabase
        .from('whiskies')
        .select(`
          id,
          brand,
          name,
          category,
          age_years,
          cost,
          image_url,
          provided_by_profile_id,
          provided_by:profiles!whiskies_provided_by_profile_id_fkey(display_name)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('reviews')
        .select(`
          id,
          review_date,
          rating,
          notes,
          profile:profiles(display_name),
          session:tasting_sessions(tasting_date, location)
        `)
        .eq('whisky_id', id)
        .order('review_date', { ascending: false }),
    ])

  if (whiskyError) throw new Error(whiskyError.message)
  if (reviewsError) throw new Error(reviewsError.message)

  const whiskyRow = whiskyData as WhiskyRow

  const whisky: Whisky = {
    id: whiskyRow.id,
    brand: whiskyRow.brand,
    name: whiskyRow.name,
    category: whiskyRow.category,
    age_years: whiskyRow.age_years,
    cost: whiskyRow.cost,
    image_url: whiskyRow.image_url,
    provided_by_profile_id: whiskyRow.provided_by_profile_id,
    provided_by: firstOrSelf(whiskyRow.provided_by),
  }

  const normalizedReviews: Review[] = ((reviewsData ?? []) as ReviewRow[]).map((review) => ({
    id: review.id,
    review_date: review.review_date,
    rating: Number(review.rating),
    notes: review.notes,
    profile: firstOrSelf(review.profile),
    session: firstOrSelf(review.session),
  }))

  return {
    whisky,
    reviews: normalizedReviews,
  }
}

export default async function WhiskyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { whisky, reviews } = await getWhiskyDetail(id)

  const avg =
    reviews.length > 0
      ? (
          reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
        ).toFixed(2)
      : null

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <section className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">
                  {whisky.brand} {whisky.name}
                </h1>

                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <p>Category: {whisky.category ?? 'Unknown'}</p>
                  <p>Age: {whisky.age_years ?? '—'}</p>
                  <p>Price: {whisky.cost != null ? `$${Number(whisky.cost).toFixed(2)}` : '—'}</p>
                  <p>
                    Provided by:{' '}
                    {whisky.provided_by?.display_name ?? whisky.provided_by_profile_id ?? '—'}
                  </p>
                  <p>Average rating: {avg ?? '—'} / 10</p>
                </div>
              </div>

              <Link
                href={`/whiskies/upload-photo?whiskyId=${encodeURIComponent(whisky.id)}`}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Upload Photo
              </Link>
            </div>
          </div>

          <div className="w-full md:w-[280px] md:flex-shrink-0">
            {whisky.image_url ? (
              <img
                src={whisky.image_url}
                alt={`${whisky.brand} ${whisky.name}`}
                className="h-48 w-full rounded-xl border object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-xl border text-sm text-gray-500">
                No bottle photo yet
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Reviews</h2>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border p-4 text-sm text-gray-500">
            No reviews yet.
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {review.profile?.display_name ?? 'Unknown reviewer'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {review.review_date} · {review.session?.location ?? 'Unknown location'}
                  </p>
                </div>

                <div className="rounded-full border px-3 py-1 text-sm font-medium">
                  {review.rating}/10
                </div>
              </div>

              {review.notes ? (
                <p className="mt-3 text-sm leading-6">{review.notes}</p>
              ) : null}
            </div>
          ))
        )}
      </section>
    </main>
  )
}
