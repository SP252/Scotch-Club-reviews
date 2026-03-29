import { ReviewCard } from '@/components/ReviewCard'
import { getDashboardStats, getRecentReviews } from '@/lib/data'

export default async function HomePage() {
  const [reviews, stats] = await Promise.all([
    getRecentReviews(25),
    getDashboardStats(),
  ])

  return (
    <main>
      <section className="stats">
        <div className="card">
          <div className="muted">Recent reviews loaded</div>
          <div className="statNumber">{stats.totalReviews}</div>
        </div>
        <div className="card">
          <div className="muted">Bottles tracked</div>
          <div className="statNumber">{stats.totalWhiskies}</div>
        </div>
        <div className="card">
          <div className="muted">Top bottle</div>
          <div className="statNumber" style={{ fontSize: '1.2rem' }}>
            {stats.topBottle ? `${stats.topBottle.brand} ${stats.topBottle.name}` : '—'}
          </div>
        </div>
      </section>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Recent Reviews</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Latest club tasting notes and ratings.
        </p>
      </div>

      <div className="grid">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </main>
  )
}
