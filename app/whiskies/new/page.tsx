'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Profile = {
  id: string
  display_name: string
}

function isHeicLike(file: File) {
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()

  return (
    type.includes('heic') ||
    type.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const mod = await import('heic2any')
  const heic2any = mod.default

  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  })

  const blob = Array.isArray(result) ? result[0] : result

  if (!(blob instanceof Blob)) {
    throw new Error('HEIC conversion failed')
  }

  return new File(
    [blob],
    file.name.replace(/\.(heic|heif)$/i, '.jpg'),
    { type: 'image/jpeg' }
  )
}

export default function NewBottlePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [form, setForm] = useState({
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
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name')

      setProfiles(data ?? [])
    }

    loadProfiles()
  }, [])

  function makeBottleId() {
    const cleanBrand = form.brand.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanName = form.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    return `${cleanBrand}-${cleanName}`.slice(0, 40)
  }

  async function uploadBottlePhoto(bottleId: string) {
    if (!file) return null

    let uploadFile = file

    if (isHeicLike(file)) {
      uploadFile = await convertHeicToJpeg(file)
    }

    const ext = uploadFile.name.split('.').pop() || 'jpg'
    const path = `${bottleId}.${ext}`

    await supabase.storage
      .from('bottle-photos')
      .upload(path, uploadFile, { upsert: true })

    const { data } = supabase.storage
      .from('bottle-photos')
      .getPublicUrl(path)

    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const id = makeBottleId()
      const image_url = file ? await uploadBottlePhoto(id) : null

      await supabase.from('whiskies').insert({
        id,
        brand: form.brand,
        name: form.name,
        category: form.category || null,
        age_years: form.age_years ? Number(form.age_years) : null,
        cost: form.cost ? Number(form.cost) : null,
        provided_by_profile_id: form.provided_by_profile_id || null,
        date_added: form.date_added,
        image_url,
      })

      setMessage('Bottle added')
      setForm({
        brand: '',
        name: '',
        category: '',
        age_years: '',
        cost: '',
        provided_by_profile_id: '',
        date_added: new Date().toISOString().slice(0, 10),
      })
      setFile(null)
    } catch (err) {
      setMessage('Error adding bottle')
    }

    setLoading(false)
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <section
        style={{
          borderRadius: 20,
          padding: 28,
          background: '#111827',
          border: '1px solid #1f2937',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: '#f9fafb',
            marginBottom: 6,
          }}
        >
          Add New Bottle
        </h1>

        <p style={{ color: '#9ca3af', marginBottom: 24 }}>
          Add a bottle and optionally upload a photo.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <Field label="Brand">
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              style={inputStyle}
            />
          </Field>

          <Field label="Bottle Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Category">
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={inputStyle}
              />
            </Field>

            <Field label="Age">
              <input
                type="number"
                value={form.age_years}
                onChange={(e) => setForm({ ...form, age_years: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cost">
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                style={inputStyle}
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
              onChange={(e) =>
                setForm({ ...form, provided_by_profile_id: e.target.value })
              }
              style={inputStyle}
            >
              <option value="">Select provider</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Bottle Photo">
            <input
              type="file"
              accept="image/*,.heic,.heif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={inputStyle}
            />
          </Field>

          <button type="submit" style={buttonStyle}>
            {loading ? 'Saving...' : 'Add Bottle'}
          </button>

          {message && <div style={{ color: '#93c5fd' }}>{message}</div>}
        </form>
      </section>
    </main>
  )
}

function Field({ label, children }: any) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, color: '#d1d5db', fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: 10,
  border: '1px solid #374151',
  background: '#0f172a',
  color: '#f9fafb',
}

const buttonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '12px',
  borderRadius: 12,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
}
