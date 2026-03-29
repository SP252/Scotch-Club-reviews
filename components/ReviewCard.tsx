import Link from 'next/link'
import type { ReviewListItem } from '@/lib/types'

export function ReviewCard({ review }: { review: ReviewListItem }) {
  return (
    <div className="card">
      <div className="reviewHeader">
        <div>
          <h3 style={{ margin: '0 0 8px' }}>
            <Link href={`/whiskies/${review.whisky_id}`}>
              {review.whisky_brand} {review.whisky_name}
            </Link>
          </h3>
          <div className="meta">
            <span>{review.profile_name ?? 'Unknown reviewer'}</span>
            <span>{review.review_date}</span>
            {review.location ? <span>{review.location}</span> : null}
          </div>
        </div>
        <div className="badge">{review.rating}/10</div>
      </div>
      {review.notes ? <p style={{ margin: '14px 0 0' }}>{review.notes}</p> : null}
    </div>
  )
}
