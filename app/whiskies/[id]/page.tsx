import { ReviewCard } from '@/components/ReviewCard'
import { getReviewsForWhisky, getWhiskyById } from '@/lib/data'

export default async function WhiskyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [whisky, reviews] = await Promise.all([
    getWhiskyById(id),
    getReviewsForWhisky(id),
  ])

  if (!whisky) {
    return <div className="card">Bottle not found.</div>
  }

  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(2)
    : null

  return (
    <main className="grid" style={{ gap: 16 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>{whisky.brand} {whisky.name}</h2>
        <div className="meta">
          <span>Category: {whisky.category ?? 'Unknown'}</span>
          <span>Age: {whisky.age_years ?? '—'}</span>
          <span>Vintage: {whisky.vintage_year ?? '—'}</span>
          <span>Avg rating: {avg ?? '—'}</span>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Reviews</h3>
        <div className="grid">
          {reviews.length ? reviews.map((review) => <ReviewCard key={review.id} review={review} />) : <p className="muted">No reviews yet.</p>}
        </div>
      </section>
    </main>
  )
}
