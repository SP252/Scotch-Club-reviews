'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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

  const reviews: Review[] = ((reviewsData ?? []) as ReviewRow[]).map((review) => ({
    id: review.id,
    review_date: review.review_date,
    rating: Number(review.rating),
    notes: review.notes,
    profile: firstOrSelf(review.profile),
    session: firstOrSelf(review.session),
  }))

  return { whisky, reviews }
}

export default function WhiskyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [whisky, setWhisky] = useState<Whisky | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingBottle, setDeletingBottle] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

  useEffect(() => {
    async function loadPage() {
      setLoading(true)
      setError('')

      try {
        const { id } = await params
        const data = await getWhiskyDetail(id)
        setWhisky(data.whisky)
        setReviews(data.reviews)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading bottle')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [params])

  const avg = useMemo(() => {
    if (reviews.length === 0) return null
    return (
      reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
    ).toFixed(2)
  }, [reviews])

  async function handleDeleteBottle() {
    if (!whisky || deletingBottle) return

    const confirmed = window.confirm(
      'Delete this bottle and all its reviews? This cannot be undone.'
    )
    if (!confirmed) return

    setDeletingBottle(true)

    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .eq('whisky_id', whisky.id)

    if (reviewsError) {
      alert(reviewsError.message)
      setDeletingBottle(false)
      return
    }

    const { error: bottleError } = await supabase
      .from('whiskies')
      .delete()
      .eq('id', whisky.id)

    if (bottleError) {
      alert(bottleError.message)
      setDeletingBottle(false)
      return
    }

    router.push('/whiskies')
    router.refresh()
  }

  async function handleDeleteReview(reviewId: string) {
    if (deletingReviewId) return

    const confirmed = window.confirm('Delete this review?')
    if (!confirmed) return

    setDeletingReviewId(reviewId)

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)

    if (error) {
      alert(error.message)
      setDeletingReviewId(null)
      return
    }

    setReviews((current) => current.filter((review) => review.id !== reviewId))
    setDeletingReviewId(null)
    router.refresh()
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 8 }}>
        <div style={cardStyle}>Loading bottle...</div>
      </main>
    )
  }

  if (error || !whisky) {
    return (
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 8 }}>
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error || 'Bottle not found.'}</div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 8 }}>
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
                <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {whisky.brand} {whisky.name}
                </h1>

                <div style={{ marginTop: 16, color: '#334155', fontSize: 15, lineHeight: 1.8 }}>
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

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href={`/reviews/new?whisky_id=${encodeURIComponent(whisky.id)}`} style={primaryButtonStyle}>
                  Add Review
                </Link>

                <Link
                  href={`/whiskies/${encodeURIComponent(whisky.id)}/edit`}
                  style={neutralButtonStyle}
                >
                  Edit Bottle
                </Link>

                <Link
                  href={`/whiskies/upload-photo?whiskyId=${encodeURIComponent(whisky.id)}`}
                  style={primaryButtonStyle}
                >
                  Upload Photo
                </Link>

                <button
                  type="button"
                  onClick={handleDeleteBottle}
                  disabled={deletingBottle}
                  style={{
                    ...dangerButtonStyle,
                    opacity: deletingBottle ? 0.7 : 1,
                    cursor: deletingBottle ? 'wait' : 'pointer',
                  }}
                >
                  {deletingBottle ? 'Deleting Bottle...' : 'Delete Bottle'}
                </button>
              </div>
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
                  border: '1px solid #d7e2f0',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 220,
                  borderRadius: 16,
                  border: '1px solid #d7e2f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: 14,
                  background: '#f8fbff',
                }}
              >
                No bottle photo yet
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Reviews
          </h2>

          <Link href={`/reviews/new?whisky_id=${encodeURIComponent(whisky.id)}`} style={primaryButtonStyle}>
            Add Review
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div style={cardStyle}>No reviews yet.</div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} style={{ ...cardStyle, marginBottom: 12 }}>
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
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>
                    {review.profile?.display_name ?? 'Unknown reviewer'}
                  </div>
                  <div style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                    {review.review_date} · {review.session?.location ?? 'Unknown location'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={pillStyle}>{review.rating}/10</div>

                  <Link
                    href={`/reviews/${encodeURIComponent(review.id)}/edit`}
                    style={neutralSmallButtonStyle}
                  >
                    Edit Review
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDeleteReview(review.id)}
                    disabled={deletingReviewId === review.id}
                    style={{
                      ...dangerSmallButtonStyle,
                      opacity: deletingReviewId === review.id ? 0.7 : 1,
                      cursor: deletingReviewId === review.id ? 'wait' : 'pointer',
                    }}
                  >
                    {deletingReviewId === review.id ? 'Deleting...' : 'Delete Review'}
                  </button>
                </div>
              </div>

              {review.notes ? (
                <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: '#1e293b' }}>
                  {review.notes}
                </p>
              ) : null}
            </div>
          ))
        )}
      </section>
    </main>
  )
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

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  border: '1px solid #1d4ed8',
  borderRadius: 14,
  textDecoration: 'none',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 800,
  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
  whiteSpace: 'nowrap',
}

const neutralButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  border: '1px solid #0f172a',
  borderRadius: 14,
  textDecoration: 'none',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 800,
  background: '#ffffff',
  whiteSpace: 'nowrap',
}

const dangerButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  border: '1px solid #dc2626',
  borderRadius: 14,
  color: '#dc2626',
  fontSize: 14,
  fontWeight: 800,
  background: '#ffffff',
  whiteSpace: 'nowrap',
}

const neutralSmallButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 14px',
  border: '1px solid #0f172a',
  borderRadius: 12,
  textDecoration: 'none',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 700,
  background: '#ffffff',
  whiteSpace: 'nowrap',
}

const dangerSmallButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 14px',
  border: '1px solid #dc2626',
  borderRadius: 12,
  color: '#dc2626',
  fontSize: 14,
  fontWeight: 700,
  background: '#ffffff',
  whiteSpace: 'nowrap',
}
