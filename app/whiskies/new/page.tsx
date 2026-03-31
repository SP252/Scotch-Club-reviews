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
      const bottleId = form.id.trim() || makeBottleId()
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
      setFile(null)

      const input = document.getElementById('new-bottle-photo') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add bottle.')
    }

    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <section
        style={{
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 20,
          padding: 24,
          background:
            'linear-gradient(135deg, rgba(20,28,44,0.96), rgba(48,30,16,0.92))',
          boxShadow: '0 12px 34px rgba(0,0,0,0.34)',
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: '#ffffff' }}>
          Add New Bottle
        </h1>
        <p style={{ fontSize: 14, color: '#dbe4f0', marginTop: 6, marginBottom: 18 }}>
          Add a new whisky to the club list, with an optional bottle photo.
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

          <input
            id="new-bottle-photo"
            type="file"
            accept="image/*,.heic,.heif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
            <div style={{ color: '#f3f4f6', fontSize: 14 }}>{message}</div>
          ) : null}
        </form>
      </section>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 12,
  fontSize: 14,
  background: 'rgba(8, 15, 26, 0.88)',
  color: '#ffffff',
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 16px',
  border: '1px solid rgba(255,255,255,0.28)',
  borderRadius: 12,
  background: 'linear-gradient(180deg, rgba(37,99,235,0.85), rgba(29,78,216,0.9))',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}
