'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Option = { id: string; display_name?: string; brand?: string; name?: string }

export default function NewReviewPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Option[]>([])
  const [whiskies, setWhiskies] = useState<Option[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    review_date: new Date().toISOString().slice(0, 10),
    location: '',
    profile_id: '',
    whisky_id: '',
    rating: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: profilesData, error: profilesError }, { data: whiskiesData, error: whiskiesError }] = await Promise.all([
        supabase.from('profiles').select('id, display_name').order('display_name'),
        supabase.from('whiskies').select('id, brand, name').order('brand'),
      ])

      if (profilesError) setMessage(profilesError.message)
      if (whiskiesError) setMessage(whiskiesError.message)
      setProfiles(profilesData ?? [])
      setWhiskies(whiskiesData ?? [])
    }

    load()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const { data: sessionRow, error: sessionError } = await supabase
      .from('tasting_sessions')
      .upsert([{ tasting_date: form.review_date, location: form.location }], { onConflict: 'tasting_date,location' })
      .select('id')
      .single()

    if (sessionError) {
      setSaving(false)
      setMessage(sessionError.message)
      return
    }

    const { error: reviewError } = await supabase.from('reviews').insert({
      id: crypto.randomUUID(),
      review_date: form.review_date,
      session_id: sessionRow.id,
      profile_id: form.profile_id || null,
      whisky_id: form.whisky_id,
      rating: Number(form.rating),
      notes: form.notes || null,
    })

    setSaving(false)

    if (reviewError) {
      setMessage(reviewError.message)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main>
      <div className="card" style={{ maxWidth: 720 }}>
        <h2 style={{ marginTop: 0 }}>Add Review</h2>
        <p className="muted">Use this form for new tasting notes after your spreadsheet import.</p>
        <form onSubmit={handleSubmit}>
          <input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} required />
          <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />

          <select value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })} required>
            <option value="">Select reviewer</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.display_name}</option>
            ))}
          </select>

          <select value={form.whisky_id} onChange={(e) => setForm({ ...form, whisky_id: e.target.value })} required>
            <option value="">Select whisky</option>
            {whiskies.map((whisky) => (
              <option key={whisky.id} value={whisky.id}>{whisky.brand} {whisky.name}</option>
            ))}
          </select>

          <input type="number" min="0" max="10" step="0.1" placeholder="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} required />
          <textarea rows={5} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save review'}</button>
          {message ? <div className="muted">{message}</div> : null}
        </form>
      </div>
    </main>
  )
}
