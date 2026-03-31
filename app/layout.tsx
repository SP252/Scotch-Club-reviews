import './globals.css'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Scotch Club',
  description: 'Private whiskey reviews for the club',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const navLinkStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '10px 16px',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 9999,
    textDecoration: 'none',
    color: '#f8fafc',
    background: 'rgba(255,255,255,0.06)',
    fontSize: 14,
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  }

  return (
    <html lang="en">
      <body>
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '20px 24px 40px',
          }}
        >
          <header
            style={{
              marginBottom: 24,
              padding: '18px 20px',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 20,
              background:
                'linear-gradient(135deg, rgba(14,25,42,0.98), rgba(43,27,15,0.90))',
              boxShadow: '0 12px 32px rgba(0,0,0,0.30)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: '#ffffff',
                    marginBottom: 4,
                  }}
                >
                  Scotch Club
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: '#dbe4f0',
                  }}
                >
                  Private whiskey reviews for the club
                </div>
              </div>

              <nav
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <Link href="/" style={navLinkStyle}>
                  Recent Reviews
                </Link>

                <Link href="/whiskies" style={navLinkStyle}>
                  Whiskies
                </Link>

                <Link href="/whiskies/new" style={navLinkStyle}>
                  Add Bottle
                </Link>

                <Link href="/leaderboard" style={navLinkStyle}>
                  Leaderboard
                </Link>

                <Link href="/member-rankings" style={navLinkStyle}>
                  Member Rankings
                </Link>

                <Link href="/provider-spend" style={navLinkStyle}>
                  Provider Spend
                </Link>

                <Link href="/reviews/new" style={navLinkStyle}>
                  Add Review
                </Link>
              </nav>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  )
}
