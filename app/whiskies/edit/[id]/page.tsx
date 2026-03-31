'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Profile = {
  id: string
  display_name: string
}

type WhiskyRow = {
  id: string
  brand: string | null
  name: string | null
  category: string | null
  age_years: number | null
  cost: number | null
  provided_by_profile_id: string | null
  date_added: string | null
}

export default function EditWhiskyPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params.id ?? '')

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    brand: '',
    name: '',
    category: '',
    age_years: '',
    cost: '',
    provided_by_profile_id: '',
    date_added: '',
  })

  useEffect(() => {
    async function loadPage() {
      if (!id) {
        setMessage('Missing bottle ID.')
        setLoading(false)
        return
      }

      setLoading(true)
      setMessage('')

      const [{ data: whiskyData, error: whiskyError }, { data: profilesData, error: profilesError }] =
        await Promise.all([
          supabase
            .from('whiskies')
            .select(
              'id, brand, name, category, age_years, cost, provided_by_profile_id, date_added'
            )
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('id, display_name')
            .order('display_name', { ascending: true }),
        ])

      if (profilesError) {
        setMessage(profilesError.message)
        setLoading(false)
        return
      }

      setProfiles(profilesData ?? [])

      if (whiskyError) {
        setMessage(whiskyError.message)
        setLoading(false)
        return
      }

      if (!whiskyData) {
        setMessage(`Could not find bottle with ID: ${id}`)
        setLoading(false)
        return
      }

      const whisky = whiskyData as WhiskyRow

      setForm({
        brand: whisky.brand ?? '',
        name: whisky.name ?? '',
        category: whisky.category ?? '',
        age_years: whisky.age_years != null ? String(whisky.age_years) : '',
        cost: whisky.cost != null ? String(whisky.cost) : '',
        provided_by_profile_id: whisky.provided_by_profile_id ?? '',
        date_added: whisky.date_added ?? '',
      })

      setLoading(false)
    }

    loadPage()
  }, [id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!form.brand.trim() || !form.name.trim()) {
      setMessage('Brand and bottle name are required.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('whiskies')
      .update({
        brand: form.brand.trim(),
        name: form.name.trim(),
        category: form.category.trim() || null,
        age_years: form.age_years ? Number(form.age_years) : null,
        cost: form.cost ? Number(form.cost) : null,
        provided_by_profile_id: form.provided_by_profile_id || null,
        date_added: form.date_added || null,
      })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    router.push(`/whiskies/${encodeURIComponent(id)}`)
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '8px 24px 24px' }}>
        <section style={panelStyle}>
          <h1 style={titleStyle}>Edit Bottle</h1>
          <p style={subtleTextStyle}>Loading bottle details...</p>
        </section>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '8px 24px 24px' }}>
      <section style={panelStyle}>
        <h1 style={titleStyle}>Edit Bottle</h1>
        <p style={subtleTextStyle}>Update the bottle details below.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          <Field label="Brand">
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              style={inputStyle}
              placeholder="Brand"
            />
          </Field>

          <Field label="Bottle Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
              placeholder="Bottle Name"
            />
          </Field>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <Field label="Category">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={inputStyle}
                placeholder="Scotch, Bourbon, etc."
              />
            </Field>

            <Field label="Age">
              <input
                type="number"
                step="0.1"
                value={form.age_years}
                onChange={(e) => setForm({ ...form, age_years: e.target.value })}
                style={inputStyle}
                placeholder="Age"
              />
            </Field>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <Field label="Price">
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                style={inputStyle}
                placeholder="Price"
              />
            </Field>

            <Field label="Date Added">
              <input
                type="date"
                value={form.date_added}
                onChange={(e) => setForm({ ...form, date_added: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Provided By">
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
          </Field>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/whiskies/${encodeURIComponent(id)}`)}
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
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#1e293b',
        }}
      >
        {label}
      </span>
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
