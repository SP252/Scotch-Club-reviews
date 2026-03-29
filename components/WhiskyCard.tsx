import Link from 'next/link'
import type { WhiskyStat } from '@/lib/types'

export function WhiskyCard({ whisky }: { whisky: WhiskyStat }) {
  return (
    <Link href={`/whiskies/${whisky.id}`} className="card">
      <h3 style={{ marginTop: 0 }}>{whisky.brand} {whisky.name}</h3>
      <p className="muted">{whisky.category ?? 'Unknown category'}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span className="muted">{whisky.review_count} reviews</span>
        <span className="badge">{whisky.avg_rating?.toFixed(2) ?? '—'}</span>
      </div>
    </Link>
  )
}
