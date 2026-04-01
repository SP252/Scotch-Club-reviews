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

export default function NewBottlePage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
      const [{ data: profilesData }, { data: whiskyData }] = await Promise.all([
        supabase.from('profiles').select('id, display_name'),
        supabase.from('whiskies').select('brand'),
      ])

      setProfiles(profilesData ?? [])

      const uniqueBrands = Array.from(
        new Set((whiskyData ?? []).map((w) => w.brand).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))

      setBrands(uniqueBrands)
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

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function makeBottleId(brand: string, name: string) {
    const cleanBrand = brand.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const cleanName = name.toUpperCase().replace(/[^A-Z0-9]/g, '')
    return `${cleanBrand}-${cleanName}`.slice(0, 40)
  }

  async function createProviderIfNeeded() {
    if (form.provider_choice !== '__new__') {
      return form.provider_choice || null
    }

    const displayName = form.new_provider_name.trim()
    if (!displayName) {
      throw new Error('Enter new provider name.')
    }

    const id = `P-${slugify(displayName)}-${Date.now().toString(36)}`

    const { error } = await supabase.from('profiles').insert({
      id,
      display_name: displayName,
    })

    if (error) throw new Error(error.message)

    setProfiles((p) =>
      [...p, { id, display_name: displayName }].sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      )
    )

    return id
  }

  async function handleSubmit(e: React.FormEvent) {
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
      setMessage('Bottle name required.')
      return
    }

    const finalCategory =
      form.category_choice === '__new__'
        ? form.new_category.trim()
        : form.category_choice.trim()

    if (!finalCategory) {
      setMessage('Choose a category.')
      return
    }

    setLoading(true)

    try {
      const providerId = await createProviderIfNeeded()
      const id = makeBottleId(finalBrand, form.name)

      const { error } = await supabase.from('whiskies').insert({
        id,
        brand: finalBrand,
        name: form.name.trim(),
        category: finalCategory,
        age_years: form.age_years ? Number(form.age_years) : null,
        cost: form.cost ? Number(form.cost) : null,
        provided_by_profile_id: providerId,
        date_added: form.date_added,
      })

      if (error) throw new Error(error.message)

      setMessage('Bottle added successfully.')

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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error')
    }

    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>Add New Bottle</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        {/* BRAND */}
        <label>
          Brand
          <select
            value={form.brand_choice}
            onChange={(e) => setForm({ ...form, brand_choice: e.target.value })}
          >
            <option value="">Select brand</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
            <option value="__new__">Add new brand...</option>
          </select>
        </label>

        {form.brand_choice === '__new__' && (
          <input
            placeholder="New Brand"
            value={form.new_brand}
            onChange={(e) => setForm({ ...form, new_brand: e.target.value })}
          />
        )}

        {/* NAME */}
        <input
          placeholder="Bottle Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        {/* CATEGORY */}
        <select
          value={form.category_choice}
          onChange={(e) => setForm({ ...form, category_choice: e.target.value })}
        >
          <option value="">Category</option>
          {categoryOptions.map((c) => (
            <option key={c}>{c}</option>
          ))}
          <option value="__new__">Add new category...</option>
        </select>

        {form.category_choice === '__new__' && (
          <input
            placeholder="New Category"
            value={form.new_category}
            onChange={(e) => setForm({ ...form, new_category: e.target.value })}
          />
        )}

        {/* PROVIDER */}
        <select
          value={form.provider_choice}
          onChange={(e) => setForm({ ...form, provider_choice: e.target.value })}
        >
          <option value="">Provided By</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
          <option value="__new__">Add new person...</option>
        </select>

        {form.provider_choice === '__new__' && (
          <input
            placeholder="New Person"
            value={form.new_provider_name}
            onChange={(e) =>
              setForm({ ...form, new_provider_name: e.target.value })
            }
          />
        )}

        <button disabled={loading}>
          {loading ? 'Saving...' : 'Add Bottle'}
        </button>

        {message && <div>{message}</div>}
      </form>
    </main>
  )
}
