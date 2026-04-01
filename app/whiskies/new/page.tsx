'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Profile = {
  id: string
  display_name: string
}

const DEFAULT_CATEGORIES = [
  'Scotch',
  'Bourbon',
  'American',
  'Irish',
  'Japanese',
  'Canadian',
  'Rye',
  'Other',
]

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
    throw new Error('HEIC conversion failed.')
  }

  return new File(
    [blob],
    file.name.replace(/\.(heic|heif)$/i, '.jpg'),
    { type: 'image/jpeg' }
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewBottlePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    brand_choice: '',
    new_brand: '',
    name: '',
    category_choice: '',
    new_category: '',
    age_years: '',
    cost: '',
    provider_choice: '',
    new_provider_name: '',
    date_added: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    async function loadData() {
      const [
        { data: profilesData, error: profilesError },
        { data: whiskiesData, error: whiskiesError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name')
          .order('display_name', { ascending: true }),
        supabase
          .from('whiskies')
          .select('brand')
          .order('brand', { ascending: true }),
      ])

      if (profilesError) {
        setMessage(`Failed to load providers: ${profilesError.message}`)
        return
      }

      if (whiskiesError) {
        setMessage(`Failed to load brands: ${whiskiesError.message}`)
        return
      }

      setProfiles(profilesData ?? [])

      const uniqueBrands = Array.from(
        new Set((whiskiesData ?? []).map((row: any) => row.brand).filter(Boolean))
      ).sort((a, b) => String(a).localeCompare(String(b)))

      setBrands(uniqueBrands as string[])
    }

    loadData()
  }, [])

  const categoryOptions = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES)

    if (
      form.category_choice &&
      form.category_choice !== '__new__' &&
      form.category_choice.trim()
    ) {
      set.add(form.category_choice.trim())
    }

    return Array.from(set)
  }, [form.category_choice])

  function makeBottleId(brand: string, name: string) {
    const cleanBrand = brand.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    return `${cleanBrand}-${cleanName}`.slice(0, 40)
  }

  async function createProviderIfNeeded() {
    if (form.provider_choice !== '__new__') {
      return form.provider_choice || null
    }

    const displayName = form.new_provider_name.trim()
    if (!displayName) {
      throw new Error('Please enter the new provider name.')
    }

    const generatedId = `P-${slugify(displayName)}-${Date.now().toString(36)}`

    const { error } = await supabase.from('profiles').insert({
      id: generatedId,
      display_name: displayName,
    })

    if (error) {
      throw new Error(`Could not create new provider: ${error.message}`)
    }

    setProfiles((current) =>
      [...current, { id: generatedId, display_name: displayName }].sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      )
    )

    return generatedId
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
      throw new Error(`Photo upload failed: ${uploadError.message}`)
    }

    const { data } = supabase.storage
      .from('bottle-photos')
      .getPublicUrl(path)

    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    const finalBrand =
      form.brand_choice === '__new__'
        ? form.new_brand.trim()
        : form.brand_choice.trim()

    if (!finalBrand) {
      setMessage('Please choose or enter a brand.')
      return
    }

    if (!form.name.trim()) {
      setMessage('Bottle name is required.')
      return
    }

    const finalCategory =
      form.category_choice === '__new__'
        ? form.new_category.trim()
        : form.category_choice.trim()

    if (!finalCategory) {
      setMessage('Please choose a category or add a new one.')
      return
    }

    setLoading(true)

    try {
      const providerId = await createProviderIfNeeded()
      const id = makeBottleId(finalBrand, form.name)
      const imageUrl = file ? await uploadBottlePhoto(id) : null

      const { error } = await supabase.from('whiskies').insert({
        id,
        brand: finalBrand,
        name: form.name.trim(),
        category: finalCategory,
        age_years: form.age_years ? Number(form.age_years) : null,
        cost: form.cost ? Number(form.cost) : null,
        provided_by_profile_id: providerId,
        date_added: form.date_added || null,
        image_url: imageUrl,
      })

      if (error) {
        throw new Error(`Could not add bottle: ${error.message}`)
      }

      setMessage(`Bottle added successfully. ID: ${id}`)

      if (form.brand_choice === '__new__' && finalBrand) {
        setBrands((current) => Array.from(new Set([...current, finalBrand])).sort((a, b) => a.localeCompare(b)))
      }

      setForm({
        brand_choice: '',
        new_brand: '',
        name: '',
        category_choice: '',
        new_category: '',
        age_years: '',
        cost: '',
        provider_choice: '',
        new_provider_name: '',
        date_added: new Date().toISOString().slice(0, 10),
      })
      setFile(null)

      const input = document.getElementById('new-bottle-photo') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unknown error adding bottle.')
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
      <section style={panelStyle}>
        <div style={{ marginBottom: 24 }}>
          <div style={eyebrowStyle}>Bottle Entry</div>

          <h1 style={titleStyle}>Add New Bottle</h1>

          <p style={subtleTextStyle}>
            Add a new bottle to the club and optionally upload a photo right away.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <Field label="Brand">
            <select
              value={form.brand_choice}
              onChange={(e) => setForm({ ...form, brand_choice: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
              <option value="__new__">Add new brand...</option>
            </select>
          </Field>

          {form.brand_choice === '__new__' ? (
            <Field label="New Brand">
              <input
                value={form.new_brand}
                onChange={(e) => setForm({ ...form, new_brand: e.target.value })}
                style={inputStyle}
                placeholder="Enter new brand"
              />
            </Field>
          ) : null}

          <Field label="Bottle Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
              placeholder="Distiller's Dram"
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
              <select
                value={form.category_choice}
                onChange={(e) => setForm({ ...form, category_choice: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="__new__">Add new category...</option>
              </select>
            </Field>

            <Field label="Age">
              <input
                type="number"
                step="0.1"
                value={form.age_years}
                onChange={(e) => setForm({ ...form, age_years: e.target.value })}
                style={inputStyle}
                placeholder="16"
              />
            </Field>
          </div>

          {form.category_choice === '__new__' ? (
            <Field label="New Category">
              <input
                value={form.new_category}
                onChange={(e) => setForm({ ...form, new_category: e.target.value })}
                style={inputStyle}
                placeholder="Enter new category"
              />
            </Field>
          ) : null}

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
                placeholder="200"
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
              value={form.provider_choice}
              onChange={(e) => setForm({ ...form, provider_choice: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select provider</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
              <option value="__new__">Add new person...</option>
            </select>
          </Field>

          {form.provider_choice === '__new__' ? (
            <Field label="New Person Name">
              <input
                value={form.new_provider_name}
                onChange={(e) => setForm({ ...form, new_provider_name: e.target.value })}
                style={inputStyle}
                placeholder="Enter new person name"
              />
            </Field>
          ) : null}

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

const eyebrowStyle: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#315b9d',
  fontWeight: 800,
  marginBottom: 8,
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
  boxShadow: '0 8px 18px rgba(37, 99, 235, 0.22)',
}
