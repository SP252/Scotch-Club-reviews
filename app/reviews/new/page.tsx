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
    profile_id: '',
    whisky_id: '',
    rating: '',
    notes: '',
  })

  useEffect(() => {
    async function loadData() {
      const [
        { data: whiskiesData, error: whiskiesError },
        { data: profilesData, error: profilesError },
        { data: sessionsData, error: sessionsError },
      ] = await Promise.all([
        supabase.from('whiskies').select('id, brand, name').order('brand', { ascending: true }),
        supabase.from('profiles').select('id, display_name').order('display_name', { ascending: true }),
        supabase.from('tasting_sessions').select('id, tasting_date, location').order('location', { ascending: true }),
      ])

      if (whiskiesError || profilesError || sessionsError) {
        setMessage(
          whiskiesError?.message || profilesError?.message || sessionsError?.message || 'Failed to load data.'
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
    return Array.from(new Set((sessions ?? []).map((s) => s.location).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [sessions])

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

    if (!form.profile_id || !form.whisky_id || !form.rating) {
      setMessage('Reviewer, bottle, and rating are required.')
      return
    }

    setLoading(true)

    const { data: sessionRow, error: sessionError } = await supabase
      .from('tasting_sessions')
      .upsert(
        [{ tasting_date: form.review_date, location: finalLocation }],
        { onConflict: 'tasting_date,location' }
      )
      .select()
      .single()

    if (sessionError) {
      setMessage(sessionError.message)
      setLoading(false)
      return
    }

    const reviewId = crypto.randomUUID()

    const { error: reviewError } = await supabase.from('reviews').insert({
      id: reviewId,
      review_date: form.review_date,
      session_id: sessionRow?.id ?? null,
      profile_id: form.profile_id,
      whisky_id: form.whisky_id,
      rating: Number(form.rating),
      notes: form.notes.trim() || null,
    })

    if (reviewError) {
      setMessage(reviewError.message)
      setLoading(false)
      return
    }

    setMessage('Review saved successfully.')
    setForm({
      review_date: new Date().toISOString().slice(0, 10),
      location_choice: '',
      new_location: '',
      profile_id: '',
      whisky_id: '',
      rating: '',
      notes: '',
    })
    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '8px 24px 24px' }}>
      <section style={heroStyle}>
        <h1 style={heroTitle}>Add Review</h1>
        <p style={heroText}>Add a new tasting note and score.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <Field label="Review Date">
            <input
              type="date"
              value={form.review_date}
              onChange={(e) => setForm({ ...form, review_date: e.target.value })}
              style={inputStyle}
            />
          </Field>

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

          <Field label="Reviewer">
            <select
              value={form.profile_id}
              onChange={(e) => setForm({ ...form, profile_id: e.target.value })}
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

          <Field label="Rating">
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="Rating"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              style={inputStyle}
            />
          </Field>

          <Field label="Notes">
            <textarea
              rows={5}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Saving...' : 'Save Review'}
            </button>

            {message ? (
              <div style={{ color: '#1e3a5f', fontSize: 14, fontWeight: 600 }}>{message}</div>
            ) : null}
          </div>
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
