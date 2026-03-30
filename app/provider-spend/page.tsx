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
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <section
        style={{
          border: '1px solid rgba(148, 163, 184, 0.16)',
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          background:
            'linear-gradient(135deg, rgba(30,41,59,0.85), rgba(39,30,23,0.75))',
          boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            color: '#f8fafc',
          }}
        >
          Provider Spend
        </h1>

        <p
          style={{
            fontSize: 14,
            color: '#cbd5e1',
            marginTop: 6,
            marginBottom: 18,
          }}
        >
          Total bottle spend by provider, broken out by year.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#cbd5e1',
                marginBottom: 6,
              }}
            >
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid rgba(148, 163, 184, 0.28)',
                borderRadius: 12,
                fontSize: 14,
                background: 'rgba(15, 23, 36, 0.72)',
                color: '#f8fafc',
              }}
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div
            style={{
              border: '1px solid rgba(148, 163, 184, 0.16)',
              borderRadius: 16,
              padding: 14,
              background: 'rgba(15, 23, 36, 0.42)',
            }}
          >
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
              Total Spend
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>
              {currency(overallTotal)}
            </div>
          </div>

          <div
            style={{
              border: '1px solid rgba(148, 163, 184, 0.16)',
              borderRadius: 16,
              padding: 14,
              background: 'rgba(15, 23, 36, 0.42)',
            }}
          >
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
              Bottles Counted
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>
              {overallBottleCount}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.16)',
            borderRadius: 16,
            padding: 16,
            color: '#cbd5e1',
            background: 'rgba(15, 23, 36, 0.72)',
          }}
        >
          Loading provider spend...
        </div>
      ) : error ? (
        <div
          style={{
            border: '1px solid rgba(248, 113, 113, 0.5)',
            borderRadius: 16,
            padding: 16,
            color: '#fecaca',
            background: 'rgba(69, 10, 10, 0.45)',
          }}
        >
          {error}
        </div>
      ) : groupedRows.length === 0 || spendRows.length === 0 ? (
        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.16)',
            borderRadius: 16,
            padding: 16,
            color: '#cbd5e1',
            background: 'rgba(15, 23, 36, 0.72)',
          }}
        >
          No provider spend found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {groupedRows.map(([groupLabel, rows]) => (
            <section key={groupLabel}>
              <div
                style={{
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: '#f8fafc',
                  }}
                >
                  {selectedYear === 'all' ? groupLabel : selectedYear}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: '#cbd5e1',
                  }}
                >
                  {rows.length} provider{rows.length === 1 ? '' : 's'}
                </p>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {rows.map((row, index) => (
                  <div
                    key={`${row.providerId}-${row.year}`}
                    style={{
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: 18,
                      padding: 16,
                      background:
                        'linear-gradient(180deg, rgba(30,41,59,0.86), rgba(30,27,24,0.86))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
                      color: '#f8fafc',
                    }}
                  >
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
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          #{index + 1} · {row.providerName}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: '#cbd5e1',
                          }}
                        >
                          {row.bottleCount} bottle{row.bottleCount === 1 ? '' : 's'} · Year: {row.year}
                        </div>
                      </div>

                      <div
                        style={{
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          borderRadius: 9999,
                          padding: '8px 14px',
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#f8fafc',
                          background: 'rgba(255,255,255,0.04)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currency(row.totalSpend)}
                      </div>
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
