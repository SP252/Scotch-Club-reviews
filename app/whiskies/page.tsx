import { WhiskyCard } from '@/components/WhiskyCard'
import { getWhiskies } from '@/lib/data'

export default async function WhiskiesPage() {
  const whiskies = await getWhiskies()

  return (
    <main>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Whiskies</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          Browse bottles imported from your spreadsheet.
        </p>
      </div>

      <div className="grid grid-3">
        {whiskies.map((whisky) => (
          <WhiskyCard key={whisky.id} whisky={whisky} />
        ))}
      </div>
    </main>
  )
}
