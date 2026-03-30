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
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <section
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 24,
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 420px', minWidth: 320 }}>
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
                <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
                  {whisky.brand} {whisky.name}
                </h1>

                <div style={{ marginTop: 16, color: '#4b5563', fontSize: 15, lineHeight: 1.8 }}>
                  <div>Category: {whisky.category ?? 'Unknown'}</div>
                  <div>Age: {whisky.age_years ?? '—'}</div>
                  <div>
                    Price: {whisky.cost != null ? `$${Number(whisky.cost).toFixed(2)}` : '—'}
                  </div>
                  <div>
                    Provided by:{' '}
                    {whisky.provided_by?.display_name ?? whisky.provided_by_profile_id ?? '—'}
                  </div>
                  <div>Average rating: {avg ?? '—'} / 10</div>
                </div>
              </div>

              <Link
                href={`/whiskies/upload-photo?whiskyId=${encodeURIComponent(whisky.id)}`}
                style={{
                  display: 'inline-block',
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: '#111827',
                  fontSize: 14,
                  fontWeight: 600,
                  background: '#fff',
                  whiteSpace: 'nowrap',
                }}
              >
                Upload Photo
              </Link>
            </div>
          </div>

          <div style={{ width: 320, flexShrink: 0 }}>
            {whisky.image_url ? (
              <img
                src={whisky.image_url}
                alt={`${whisky.brand} ${whisky.name}`}
                style={{
                  width: '100%',
                  height: 220,
                  objectFit: 'cover',
                  borderRadius: 16,
                  border: '1px solid #e5e7eb',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 220,
                  borderRadius: 16,
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: 14,
                }}
              >
                No bottle photo yet
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Reviews</h2>

        {reviews.length === 0 ? (
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 16,
              color: '#6b7280',
              fontSize: 14,
            }}
          >
            No reviews yet.
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {review.profile?.display_name ?? 'Unknown reviewer'}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
                    {review.review_date} · {review.session?.location ?? 'Unknown location'}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: 9999,
                    padding: '6px 12px',
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {review.rating}/10
                </div>
              </div>

              {review.notes ? (
                <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>{review.notes}</p>
              ) : null}
            </div>
          ))
        )}
      </section>
    </main>
  )
}
