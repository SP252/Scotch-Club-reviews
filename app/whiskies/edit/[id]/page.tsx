'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function EditWhiskyPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    brand: '',
    name: '',
    category: '',
    age_years: '',
    cost: '',
  })

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('whiskies')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setForm({
        brand: data.brand ?? '',
        name: data.name ?? '',
        category: data.category ?? '',
        age_years: data.age_years?.toString() ?? '',
        cost: data.cost?.toString() ?? '',
      })

      setLoading(false)
    }

    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Saving...')

    const { error } = await supabase
      .from('whiskies')
      .update({
        brand: form.brand,
        name: form.name,
        category: form.category || null,
        age_years: form.age_years ? Number(form.age_years) : null,
        cost: form.cost ? Number(form.cost) : null,
      })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Saved!')

    // go back to whisky page
    router.push(`/whiskies/${id}`)
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Edit Bottle</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <input
          placeholder="Brand"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
        />

        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Category (Scotch, Bourbon, etc)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />

        <input
          type="number"
          placeholder="Age"
          value={form.age_years}
          onChange={(e) => setForm({ ...form, age_years: e.target.value })}
        />

        <input
          type="number"
          placeholder="Price"
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: e.target.value })}
        />

        <button type="submit" style={buttonStyle}>
          Save Changes
        </button>

        {message && <div>{message}</div>}
      </form>
    </main>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: 12,
  background: '#2563eb',
  color: 'white',
  border: 'none',
  fontWeight: 700,
  cursor: 'pointer',
}
