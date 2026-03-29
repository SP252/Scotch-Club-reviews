import Link from 'next/link'
import { getWhiskies } from '@/lib/data'

export default async function LeaderboardPage() {
  const whiskies = (await getWhiskies()).filter((w) => w.review_count >= 2)

  return (
    <main>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Top-rated bottles with at least two reviews.
        </p>
      </div>

      <div className="tableLike">
        {whiskies.map((whisky, index) => (
          <div key={whisky.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                #{index + 1} <Link href={`/whiskies/${whisky.id}`}>{whisky.brand} {whisky.name}</Link>
              </div>
              <div className="muted">{whisky.category ?? 'Unknown'} · {whisky.review_count} reviews</div>
            </div>
            <div className="badge">{whisky.avg_rating?.toFixed(2) ?? '—'}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
