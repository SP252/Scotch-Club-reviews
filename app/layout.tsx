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
    border: '1px solid rgba(148, 163, 184, 0.25)',
    borderRadius: 9999,
    textDecoration: 'none',
    color: '#e5e7eb',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(4px)',
    fontSize: 14,
    fontWeight: 600,
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
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: 20,
              background:
                'linear-gradient(135deg, rgba(28, 37, 54, 0.92), rgba(39, 30, 23, 0.92))',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
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
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#f8fafc',
                    marginBottom: 4,
                  }}
                >
                  Scotch Club
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: '#cbd5e1',
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
                <Link href="/leaderboard" style={navLinkStyle}>
                  Leaderboard
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
