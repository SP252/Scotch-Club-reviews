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
    throw new Error('HEIC conversion did not return a valid image blob.')
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

    const fileExt = uploadFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExt = fileExt.replace(/[^a-z0-9]/g, '') || 'jpg'
    const filePath = `${bottleId}.${safeExt}`

    const { error: uploadError } = await supabase.storage
      .from('bottle-photos')
      .upload(filePath, uploadFile, {
        upsert: true,
        contentType: uploadFile.type || 'image/jpeg',
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage
      .from('bottle-photos')
      .getPublicUrl(filePath)

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
      const bottleId = makeBottleId()
      const imageUrl = file ? await uploadBottlePhoto(bottleId) : null

      const { error } = await supabase.from('whiskies').insert({
        id: bottleId,
        brand: form.brand.trim(),
        name: form.name.trim(),
        category: form.category.trim() || null,
        age_years: form.age_years ? Number(form.age_years) : null,
        cost: form.cost ? Number(form.cost) : null,
        provided_by_profile_id: form.provided_by_profile_id || null,
        date_added: form.date_added || null,
        image_url: imageUrl,
      })

      if (error) {
        throw new Error(error.message)
      }

      setMessage(`Bottle added successfully.`)
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
      setMessage(err instanceof Error ? err.message : 'Failed to add bottle.')
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
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 24,
          padding: 28,
          background: 'rgba(24, 24, 27, 0.92)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 14,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#d6a85f',
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            Bottle Entry
          </div>

          <h1
            style={{
              fontSize: 40,
              lineHeight: 1.05,
              fontWeight: 800,
              margin: 0,
              color: '#f8f5ef',
            }}
          >
            Add New Bottle
          </h1>

          <p
            style={{
              fontSize: 15,
              color: '#cfc7ba',
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
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              style={inputStyle}
              placeholder="Balvenie"
            />
          </Field>

          <Field label="Bottle Name">
            <input
              type="text"
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
                type="text"
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
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name}
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
            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? 'Saving Bottle...' : 'Add Bottle'}
            </button>

            {message ? (
              <div style={{ color: '#e8dfd2', fontSize: 14 }}>{message}</div>
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
          color: '#e5dccf',
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
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14,
  fontSize: 15,
  background: '#12161c',
  color: '#f8f5ef',
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '13px 18px',
  border: '1px solid rgba(214,168,95,0.45)',
  borderRadius: 14,
  background: 'linear-gradient(180deg, #d6a85f, #b88434)',
  color: '#1a1410',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
}
