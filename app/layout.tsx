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
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <section
        style={{
          border: '1px solid rgba(148, 163, 184, 0.16)',
          borderRadius: 20,
          padding: 20,
          background:
            'linear-gradient(135deg, rgba(30,41,59,0.85), rgba(39,30,23,0.75))',
          boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
          Add Review
        </h1>
        <p style={{ fontSize: 14, color: '#cbd5e1', marginTop: 6, marginBottom: 18 }}>
          Add a new review for a bottle.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <input
            type="date"
            value={form.review_date}
            onChange={(e) => setForm({ ...form, review_date: e.target.value })}
            style={inputStyle}
          />

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

          {form.location_choice === '__new__' ? (
            <input
              type="text"
              placeholder="Enter new location"
              value={form.new_location}
              onChange={(e) => setForm({ ...form, new_location: e.target.value })}
              style={inputStyle}
            />
          ) : null}

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

          <textarea
            rows={5}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
          >
            {loading ? 'Saving...' : 'Save Review'}
          </button>

          {message ? (
            <div style={{ color: '#e5e7eb', fontSize: 14 }}>{message}</div>
          ) : null}
        </form>
      </section>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: 12,
  fontSize: 14,
  background: 'rgba(15, 23, 36, 0.72)',
  color: '#f8fafc',
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 16px',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.06)',
  color: '#f8fafc',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}
