import Link from 'next/link'

export function Header() {
  return (
    <header className="header">
      <div className="brand">
        <h1>Scotch Club</h1>
        <p>Private whiskey reviews for the club</p>
      </div>
      <nav className="nav">
        <Link href="/">Recent Reviews</Link>
        <Link href="/whiskies">Whiskies</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/reviews/new">Add Review</Link>
      </nav>
    </header>
  )
}
