'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type MaybeArray<T> = T | T[] | null

type WhiskyRow = {
  id: string
  brand: string
  name: string
  cost: number | null
  date_added: string | null
  provided_by_profile_id: string | null
  provided_by: MaybeArray<{ display_name: string }>
}

type Whisky = {
  id: string
  brand: string
  name: string
  cost: number
  date_added: string | null
  provided_by_profile_id: string | null
  provided_by_name: string
}

type SpendRow = {
  providerId: string
  providerName: string
  year: string
  bottleCount: number
  totalSpend: number
}

function firstOrSelf<T>(value: MaybeArray<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function yearFromDate(date: string | null | undefined) {
  if (!date) return 'Unknown'
  return String(date).slice(0, 4)
}

function currency(value: number) {
  return `$${value.toFixed(2)}`
}

export default function ProviderSpendPage() {
  const [whiskies, setWhiskies] = useState<Whisky[]>([])
  const [selectedYear, setSelectedYear] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadWhiskies() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('whiskies')
        .select(`
          id,
          brand,
          name,
          cost,
          date_added,
          provided_by_profile_id,
          provided_by:profiles!whiskies_provided_by_profile_id_fkey(display_name)
        `)
        .order('date_added', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const normalized: Whisky[] = ((data ?? []) as WhiskyRow[]).map((row) => ({
        id: row.id,
        brand: row.brand,
        name: row.name,
        cost: row.cost != null ? Number(row.cost) : 0,
        date_added: row.date_added,
        provided_by_profile_id: row.provided_by_profile_id,
        provided_by_name:
          firstOrSelf(row.provided_by)?.display_name ??
          row.provided_by_profile_id ??
          'Unknown',
      }))

      setWhiskies(normalized)
      setLoading(false)
    }

    loadWhiskies()
  }, [])

  const years = useMemo(() => {
    const found = Array.from(
      new Set(
        whiskies
          .map((w) => yearFromDate(w.date_added))
          .filter((y) => y !== 'Unknown')
      )
    ).sort((a, b) => Number(b) - Number(a))

    return found
  }, [whiskies])

  const spendRows = useMemo(() => {
    const map = new Map<string, SpendRow>()

    for (const whisky of whiskies) {
      const year = yearFromDate(whisky.date_added)

      if (selectedYear !== 'all' && year !== selectedYear) continue

      const providerId = whisky.provided_by_profile_id ?? 'unknown'
      const providerName = whisky.provided_by_name
      const key = `${providerId}__${year}`

      if (!map.has(key)) {
        map.set(key, {
          providerId,
          providerName,
          year,
          bottleCount: 0,
          totalSpend: 0,
        })
      }

      const row = map.get(key)!
      row.bottleCount += 1
      row.totalSpend += whisky.cost
    }

    return Array.from(map.values()).sort((a, b) => {
      if (selectedYear === 'all' && a.year !== b.year) {
        if (a.year === 'Unknown') return 1
        if (b.year === 'Unknown') return -1
        return Number(b.year) - Number(a.year)
      }

      if (b.totalSpend !== a.totalSpend) return b.totalSpend - a.totalSpend
      return a.providerName.localeCompare(b.providerName)
    })
  }, [whiskies, selectedYear])

  const overallTotal = useMemo(
    () => spendRows.reduce((sum, row) => sum + row.totalSpend, 0),
    [spendRows]
  )

  const overallBottleCount = useMemo(
    () => spendRows.reduce((sum, row) => sum + row.bottleCount, 0),
    [spendRows]
  )

  const groupedRows = useMemo(() => {
    if (selectedYear !== 'all') {
      return [['Selected Year', spendRows]] as [string, SpendRow[]][]
    }

    const groups = new Map<string, SpendRow[]>()

    for (const row of spendRows) {
      if (!groups.has(row.year)) groups.set(row.year, [])
      groups.get(row.year)!.push(row)
    }

    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 'Unknown') return 1
      if (b[0] === 'Unknown') return -1
      return Number(b[0]) - Number(a[0])
    })
  }, [spendRows, selectedYear])

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 8 }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Provider Spend</h1>
        <p style={heroText}>Total bottle spend by provider, broken out by year.</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginTop: 16,
          }}
        >
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
            <option value="Unknown">Unknown</option>
          </select>

          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Total Spend</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              {currency(overallTotal)}
            </div>
          </div>

          <div style={statCardStyle}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>Bottles Counted</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
              {overallBottleCount}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div style={cardStyle}>Loading provider spend...</div>
      ) : error ? (
        <div style={{ ...cardStyle, color: '#991b1b' }}>{error}</div>
      ) : groupedRows.length === 0 || spendRows.length === 0 ? (
        <div style={cardStyle}>No provider spend found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {groupedRows.map(([groupLabel, rows]) => (
            <section key={groupLabel}>
              <h2 style={{ color: '#f8fafc', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
                {selectedYear === 'all' ? groupLabel : selectedYear}
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {rows.map((row, index) => (
                  <div key={`${row.providerId}-${row.year}`} style={cardStyle}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                          #{index + 1} · {row.providerName}
                        </div>
                        <div style={{ fontSize: 14, color: '#475569' }}>
                          {row.bottleCount} bottle{row.bottleCount === 1 ? '' : 's'} · Year: {row.year}
                        </div>
                      </div>

                      <div style={pillStyle}>{currency(row.totalSpend)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

const heroStyle: React.CSSProperties = {
  borderRadius: 24,
  padding: 28,
  background: 'linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 18px 40px rgba(0,0,0,0.30)',
  marginBottom: 20,
}

const heroTitle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 800,
  margin: 0,
  color: '#0f172a',
}

const heroText: React.CSSProperties = {
  fontSize: 15,
  color: '#334155',
  marginTop: 10,
  marginBottom: 0,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  border: '1px solid #bfd0e6',
  borderRadius: 14,
  fontSize: 15,
  background: '#ffffff',
  color: '#0f172a',
  outline: 'none',
}

const statCardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 14,
  background: '#ffffff',
  border: '1px solid #d7e2f0',
  boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
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
