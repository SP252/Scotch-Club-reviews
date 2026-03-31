'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Profile = {
  id: string
  display_name: string
}

export default function NewBottlePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    id: '',
    brand: '',
    name: '',
    category: '',
    age_years: '',
    cost: '',
    provided_by_profile_id: '',
    date_added: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    async function loadProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name', { ascending: true })

      if (error) {
        setMessage(error.message)
        return
      }

      setProfiles(data ?? [])
    }

    loadProfiles()
  }, [])

  function makeBottleId() {
    const cleanBrand = form.brand.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanName = form.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    return `${cleanBrand}-${cleanName}`.slice(0, 40)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!form.brand.trim() || !form.name.trim()) {
      setMessage('Brand and bottle name are required.')
      return
    }

    setLoading(true)

    const bottleId = form.id.trim() || makeBottleId()

    const { error } = await supabase.from('whiskies').insert({
      id: bottleId,
      brand: form.brand.trim(),
      name: form.name.trim(),
      category: form.category.trim() || null,
      age_years: form.age_years ? Number(form.age_years) : null,
      cost: form.cost ? Number(form.cost) : null,
      provided_by_profile_id: form.provided_by_profile_id || null,
      date_added: form.date_added || null,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage(`Bottle added successfully with ID: ${bottleId}`)
    setForm({
      id: '',
      brand: '',
      name: '',
      category: '',
      age_years: '',
      cost: '',
      provided_by_profile_id: '',
      date_added: new Date().toISOString().slice(0, 10),
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
          Add New Bottle
        </h1>
        <p style={{ fontSize: 14, color: '#cbd5e1', marginTop: 6, marginBottom: 18 }}>
          Add a new whisky to the club list.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <input
            type="text"
            placeholder="Bottle ID (optional — auto-generated if blank)"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Brand"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Bottle Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Category (Scotch, Bourbon, Irish, etc.)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={inputStyle}
          />

          <input
            type="number"
            step="0.1"
            placeholder="Age (optional)"
            value={form.age_years}
            onChange={(e) => setForm({ ...form, age_years: e.target.value })}
            style={inputStyle}
          />

          <input
            type="number"
            step="0.01"
            placeholder="Cost"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
            style={inputStyle}
          />

          <select
            value={form.provided_by_profile_id}
            onChange={(e) => setForm({ ...form, provided_by_profile_id: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select provider</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.date_added}
            onChange={(e) => setForm({ ...form, date_added: e.target.value })}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
          >
            {loading ? 'Saving...' : 'Add Bottle'}
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
