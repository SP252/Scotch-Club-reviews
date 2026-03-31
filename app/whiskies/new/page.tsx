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

  async function uploadBottlePhoto(bottleId: string) {
    if (!file) return null

    let uploadFile = file

    if (isHeicLike(file)) {
      uploadFile = await convertHeicToJpeg(file)
    }

    const ext = uploadFile.name.split('.').pop() || 'jpg'
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${bottleId}.${safeExt}`

    const { error: uploadError } = await supabase.storage
      .from('bottle-photos')
      .upload(path, uploadFile, {
        upsert: true,
        contentType: uploadFile.type || 'image/jpeg',
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage
      .from('bottle-photos')
      .getPublicUrl(path)

    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!form.brand.trim() || !form.name.trim()) {
      setMessage('Brand and bottle name are required.')
      return
    }

    setLoading(true)

    try {
      const id = makeBottleId()
      const image_url = file ? await uploadBottlePhoto(id) : null

      const { error } = await supabase.from('whiskies').insert({
        id,
        brand: form.brand.trim(),
        name: form.name.trim(),
        category: form.category.trim() || null,
        age_years: form.age_years ? Number(form.age_years) : null,
        cost: form.cost ? Number(form.cost) : null,
        provided_by_profile_id: form.provided_by_profile_id || null,
        date_added: form.date_added,
        image_url,
      })

      if (error) {
        throw new Error(error.message)
      }

      setMessage('Bottle added successfully.')
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

      const input = document.getElementById('new-bottle-photo') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error adding bottle.')
    }

    setLoading(false)
  }

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '8px 24px 24px',
      }}
    >
      <section
        style={{
          borderRadius: 24,
          padding: 30,
          background: 'linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%)',
          border: '1px solid rgba(255,255,255,0.55)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.30)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#315b9d',
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            Bottle Entry
          </div>

          <h1
            style={{
              fontSize: 42,
              lineHeight: 1.05,
              fontWeight: 800,
              margin: 0,
              color: '#0f172a',
            }}
          >
            Add New Bottle
          </h1>

          <p
            style={{
              fontSize: 15,
              color: '#334155',
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            Add a new bottle to the club and optionally upload a photo right away.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <Field label="Brand">
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              style={inputStyle}
              placeholder="Balvenie"
            />
          </Field>

          <Field label="Bottle Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
              placeholder="Caribbean Cask"
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
                placeholder="Scotch"
              />
            </Field>

            <Field label="Age">
              <input
                type="number"
                step="0.1"
                value={form.age_years}
                onChange={(e) => setForm({ ...form, age_years: e.target.value })}
                style={inputStyle}
                placeholder="14"
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
            <Field label="Cost">
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                style={inputStyle}
                placeholder="89.99"
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
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Bottle Photo">
            <input
              id="new-bottle-photo"
              type="file"
              accept="image/*,.heic,.heif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={inputStyle}
            />
          </Field>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 6,
            }}
          >
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Saving Bottle...' : 'Add Bottle'}
            </button>

            {message ? (
              <div style={{ color: '#1e3a5f', fontSize: 14, fontWeight: 600 }}>
                {message}
              </div>
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
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#1e293b',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
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
  boxShadow: '0 8px 18px rgba(37, 99, 235, 0.22)',
}
