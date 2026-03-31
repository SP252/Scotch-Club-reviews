'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Whisky = {
  id: string
  brand: string
  name: string
}

type Profile = {
  id: string
  display_name: string
}

type Session = {
  id: number
  tasting_date: string
  location: string
}

type ReviewEntry = {
  reviewer_id: string
  rating: string
  notes: string
}

function makeEmptyEntry(): ReviewEntry {
  return {
    reviewer_id: '',
    rating: '',
    notes: '',
  }
}

export default function NewReviewPage() {
  const [whiskies, setWhiskies] = useState<Whisky[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    review_date: new Date().toISOString().slice(0, 10),
    location_choice: '',
    new_location: '',
    whisky_id: '',
  })

  const [entries, setEntries] = useState<ReviewEntry[]>([
    makeEmptyEntry(),
    makeEmptyEntry(),
  ])

  useEffect(() => {
    async function loadData() {
      const [
        { data: whiskiesData, error: whiskiesError },
        { data: profilesData, error: profilesError },
        { data: sessionsData, error: sessionsError },
      ] = await Promise.all([
        supabase
          .from('whiskies')
          .select('id, brand, name')
          .order('brand', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, display_name')
          .order('display_name', { ascending: true }),
        supabase
          .from('tasting_sessions')
          .select('id, tasting_date, location')
          .order('location', { ascending: true }),
      ])

      if (whiskiesError || profilesError || sessionsError) {
        setMessage(
          whiskiesError?.message ||
            profilesError?.message ||
            sessionsError?.message ||
            'Failed to load data.'
        )
        return
      }

      setWhiskies(whiskiesData ?? [])
      setProfiles(profilesData ?? [])
      setSessions(sessionsData ?? [])
    }

    loadData()
  }, [])

  const uniqueLocations = useMemo(() => {
    return Array.from(
      new Set((sessions ?? []).map((s) => s.location).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b))
  }, [sessions])

  function updateEntry(index: number, patch: Partial<ReviewEntry>) {
    setEntries((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    )
  }

  function addEntry() {
    setEntries((current) => [...current, makeEmptyEntry()])
  }

  function removeEntry(index: number) {
    setEntries((current) => {
      if (current.length === 1) return current
      return current.filter((_, i) => i !== index)
    })
  }

  async function getOrCreateSession(reviewDate: string, location: string) {
    const { data: existingSession, error: findError } = await supabase
      .from('tasting_sessions')
      .select('id, tasting_date, location')
      .eq('tasting_date', reviewDate)
      .eq('location', location)
      .limit(1)
      .maybeSingle()

    if (findError) {
      throw new Error(`Could not look up tasting session: ${findError.message}`)
    }

    if (existingSession?.id != null) {
      return existingSession.id
    }

    const { data: newSession, error: insertError } = await supabase
      .from('tasting_sessions')
      .insert([{ tasting_date: reviewDate, location }])
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`Could not create tasting session: ${insertError.message}`)
    }

    return newSession.id
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    const finalLocation =
      form.location_choice === '__new__'
        ? form.new_location.trim()
        : form.location_choice.trim()

    if (!form.review_date) {
      setMessage('Please choose a review date.')
      return
    }

    if (!finalLocation) {
      setMessage('Please choose or enter a location.')
      return
    }

    if (!form.whisky_id) {
      setMessage('Please select a bottle.')
      return
    }

    const filledEntries = entries.filter(
      (entry) =>
        entry.reviewer_id.trim() || entry.rating.trim() || entry.notes.trim()
    )

    if (filledEntries.length === 0) {
      setMessage('Please enter at least one review.')
      return
    }

    for (const entry of filledEntries) {
      if (!entry.reviewer_id || !entry.rating) {
        setMessage('Each review row needs both a reviewer and a rating.')
        return
      }

      const numericRating = Number(entry.rating)
      if (Number.isNaN(numericRating) || numericRating < 0 || numericRating > 10) {
        setMessage('Ratings must be between 0 and 10.')
        return
      }
    }

    const reviewerIds = filledEntries.map((entry) => entry.reviewer_id)
    const duplicateReviewerIds = reviewerIds.filter(
      (id, index) => reviewerIds.indexOf(id) !== index
    )

    if (duplicateReviewerIds.length > 0) {
      setMessage('The same reviewer appears more than once.')
      return
    }

    setLoading(true)

    try {
      const sessionId = await getOrCreateSession(form.review_date, finalLocation)

      const reviewRows = filledEntries.map((entry) => ({
        id: crypto.randomUUID(),
        review_date: form.review_date,
        session_id: sessionId,
        profile_id: entry.reviewer_id,
        whisky_id: form.whisky_id,
        rating: Number(entry.rating),
        notes: entry.notes.trim() || null,
      }))

      const { error: reviewError } = await supabase
        .from('reviews')
        .insert(reviewRows)

      if (reviewError) {
        throw new Error(`Could not save reviews: ${reviewError.message}`)
      }

      setMessage(`Saved ${reviewRows.length} review${reviewRows.length === 1 ? '' : 's'}.`)
      setForm({
        review_date: new Date().toISOString().slice(0, 10),
        location_choice: '',
        new_location: '',
        whisky_id: '',
      })
      setEntries([makeEmptyEntry(), makeEmptyEntry()])

      const { data: refreshedSessions } = await supabase
        .from('tasting_sessions')
        .select('id, tasting_date, location')
        .order('location', { ascending: true })

      if (refreshedSessions) {
        setSessions(refreshedSessions)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unknown error saving reviews.')
    }

    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '8px 24px 24px' }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Add Group Reviews</h1>
        <p style={heroText}>
          Add several people’s reviews for the same bottle, date, and location.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <Field label="Review Date">
              <input
                type="date"
                value={form.review_date}
                onChange={(e) => setForm({ ...form, review_date: e.target.value })}
                style={inputStyle}
              />
            </Field>

            <Field label="Bottle">
              <select
                value={form.whisky_id}
                onChange={(e) => setForm({ ...form, whisky_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select bottle</option>
                {whiskies.map((whisky) => (
                  <option key={whisky.id} value={whisky.id}>
                    {whisky.brand} {whisky.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Location">
            <select
              value={form.location_choice}
              onChange={(e) => setForm({ ...form, location_choice: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select location</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
              <option value="__new__">Add new location...</option>
            </select>
          </Field>

          {form.location_choice === '__new__' ? (
            <Field label="New Location">
              <input
                type="text"
                placeholder="Enter new location"
                value={form.new_location}
                onChange={(e) => setForm({ ...form, new_location: e.target.value })}
                style={inputStyle}
              />
            </Field>
          ) : null}

          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#0f172a',
                marginTop: 4,
              }}
            >
              Reviews
            </div>

            {entries.map((entry, index) => (
              <div key={index} style={entryCardStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    Review #{index + 1}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    style={secondaryButtonStyle}
                  >
                    Remove
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 1fr) 140px',
                    gap: 12,
                  }}
                >
                  <Field label="Reviewer">
                    <select
                      value={entry.reviewer_id}
                      onChange={(e) =>
                        updateEntry(index, { reviewer_id: e.target.value })
                      }
                      style={inputStyle}
                    >
                      <option value="">Select reviewer</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.display_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Rating">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      placeholder="8.5"
                      value={entry.rating}
                      onChange={(e) =>
                        updateEntry(index, { rating: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Field label="Notes">
                    <textarea
                      rows={3}
                      placeholder="Notes"
                      value={entry.notes}
                      onChange={(e) =>
                        updateEntry(index, { notes: e.target.value })
                      }
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={addEntry} style={secondaryButtonStyle}>
              Add Another Reviewer
            </button>

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Saving...' : 'Save Group Reviews'}
            </button>
          </div>

          {message ? (
            <div style={{ color: '#1e3a5f', fontSize: 14, fontWeight: 600 }}>
              {message}
            </div>
          ) : null}
        </form>
      </section>
    </main>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{label}</span>
      {children}
    </label>
  )
}

const heroStyle: React.CSSProperties = {
  borderRadius: 24,
  padding: 30,
  background: 'linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 18px 40px rgba(0,0,0,0.30)',
}

const heroTitle: React.CSSProperties = {
  fontSize: 42,
  lineHeight: 1.05,
  fontWeight: 800,
  margin: 0,
  color: '#0f172a',
}

const heroText: React.CSSProperties = {
  fontSize: 15,
  color: '#334155',
  marginTop: 10,
  marginBottom: 20,
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

const entryCardStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
  background: '#f8fbff',
  border: '1px solid #d7e2f0',
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '13px 18px',
  border: '1px solid #1d4ed8',
  borderRadius: 14,
  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 16px',
  border: '1px solid #bfd0e6',
  borderRadius: 14,
  background: '#ffffff',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}
What is this?
Very important check
