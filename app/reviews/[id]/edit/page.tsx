'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

type ReviewRow = {
  id: string
  review_date: string | null
  rating: number | null
  notes: string | null
  whisky_id: string | null
  profile_id: string | null
  session_id: number | null
}

export default function EditReviewPage() {
  const router = useRouter()
  const params = useParams()
  const reviewId = String(params.id ?? '')

  const [whiskies, setWhiskies] = useState<Whisky[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    review_date: '',
    location_choice: '',
    new_location: '',
    profile_id: '',
    whisky_id: '',
    rating: '',
    notes: '',
  })

  useEffect(() => {
    async function loadPage() {
      if (!reviewId) {
        setMessage('Missing review ID.')
        setLoading(false)
        return
      }

      const [
        { data: whiskiesData, error: whiskiesError },
        { data: profilesData, error: profilesError },
        { data: sessionsData, error: sessionsError },
        { data: reviewData, error: reviewError },
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
        supabase
          .from('reviews')
          .select('id, review_date, rating, notes, whisky_id, profile_id, session_id')
          .eq('id', reviewId)
          .maybeSingle(),
      ])

      if (whiskiesError || profilesError || sessionsError || reviewError) {
        setMessage(
          whiskiesError?.message ||
            profilesError?.message ||
            sessionsError?.message ||
            reviewError?.message ||
            'Failed to load review.'
        )
        setLoading(false)
        return
      }

      if (!reviewData) {
        setMessage('Review not found.')
        setLoading(false)
        return
      }

      const review = reviewData as ReviewRow
      const sessionForReview =
        (sessionsData ?? []).find((s: any) => Number(s.id) === Number(review.session_id)) ?? null

      setWhiskies(whiskiesData ?? [])
      setProfiles(profilesData ?? [])
      setSessions((sessionsData ?? []) as Session[])

      setForm({
        review_date: review.review_date ?? sessionForReview?.tasting_date ?? '',
        location_choice: sessionForReview?.location ?? '',
        new_location: '',
        profile_id: review.profile_id ?? '',
        whisky_id: review.whisky_id ?? '',
        rating: review.rating != null ? String(review.rating) : '',
        notes: review.notes ?? '',
      })

      setLoading(false)
    }

    loadPage()
  }, [reviewId])

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(sessions.map((s) => s.location).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [sessions])

  async function getNextSessionId() {
    const { data, error } = await supabase
      .from('tasting_sessions')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)

    if (error) {
      throw new Error(`Could not determine next tasting session id: ${error.message}`)
    }

    const highestId = data && data.length > 0 ? Number(data[0].id) : 0

    if (Number.isNaN(highestId)) {
      throw new Error('Existing tasting session ids are not numeric.')
    }

    return highestId + 1
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
      return Number(existingSession.id)
    }

    const nextId = await getNextSessionId()

    const { data: newSession, error: insertError } = await supabase
      .from('tasting_sessions')
      .insert([
        {
          id: nextId,
          tasting_date: reviewDate,
          location,
        },
      ])
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`Could not create tasting session: ${insertError.message}`)
    }

    return Number(newSession.id)
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

    if (!form.profile_id || !form.whisky_id || !form.rating) {
      setMessage('Reviewer, bottle, and rating are required.')
      return
    }

    const numericRating = Number(form.rating)
    if (Number.isNaN(numericRating) || numericRating < 0 || numericRating > 10) {
      setMessage('Rating must be between 0 and 10.')
      return
    }

    setSaving(true)

    try {
      const sessionId = await getOrCreateSession(form.review_date, finalLocation)

      const { error } = await supabase
        .from('reviews')
        .update({
          review_date: form.review_date,
          session_id: sessionId,
          profile_id: form.profile_id,
          whisky_id: form.whisky_id,
          rating: numericRating,
          notes: form.notes.trim() || null,
        })
        .eq('id', reviewId)

      if (error) {
        throw new Error(`Could not save review: ${error.message}`)
      }

      router.push(`/whiskies/${encodeURIComponent(form.whisky_id)}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unknown error saving review.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '8px 24px 24px' }}>
        <section style={panelStyle}>
          <h1 style={titleStyle}>Edit Review</h1>
          <p style={subtleTextStyle}>Loading review details...</p>
        </section>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '8px 24px 24px' }}>
      <section style={panelStyle}>
        <h1 style={titleStyle}>Edit Review</h1>
        <p style={subtleTextStyle}>Update the review details below.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
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
              placeholder="8.5"
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

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? 'Saving...' : 'Save Review'}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/whiskies/${encodeURIComponent(form.whisky_id)}`)}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
          </div>

          {message ? (
            <div style={{ color: '#1e3a5f', fontSize: 14, fontWeight: 600 }}>{message}</div>
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

const panelStyle: React.CSSProperties = {
  borderRadius: 24,
  padding: 30,
  background: 'linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 18px 40px rgba(0,0,0,0.30)',
}

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  lineHeight: 1.05,
  fontWeight: 800,
  margin: 0,
  color: '#0f172a',
}

const subtleTextStyle: React.CSSProperties = {
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
  boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
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
  padding: '13px 18px',
  border: '1px solid #94a3b8',
  borderRadius: 14,
  background: '#ffffff',
  color: '#0f172a',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
}
