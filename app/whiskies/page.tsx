'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import heic2any from 'heic2any'

type Whisky = {
  id: string
  brand: string
  name: string
}

export default function UploadBottlePhotoPage() {
  const [whiskies, setWhiskies] = useState<Whisky[]>([])
  const [whiskyId, setWhiskyId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('whiskyId')
    if (fromUrl) setWhiskyId(fromUrl)
  }, [])

  useEffect(() => {
    async function loadWhiskies() {
      const { data, error } = await supabase
        .from('whiskies')
        .select('id, brand, name')
        .order('brand')

      if (error) {
        setMessage(error.message)
        return
      }

      setWhiskies(data ?? [])
    }

    loadWhiskies()
  }, [])

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!whiskyId) return setMessage('Please choose a bottle.')
    if (!file) return setMessage('Please choose an image.')

    setLoading(true)

    try {
      let uploadFile = file

      // 🔥 Convert HEIC → JPG
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
        })

        uploadFile = new File(
          [convertedBlob as Blob],
          file.name.replace(/\.heic$/i, '.jpg'),
          { type: 'image/jpeg' }
        )
      }

      const fileExt = uploadFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filePath = `${whiskyId}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('bottle-photos')
        .upload(filePath, uploadFile, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data } = supabase.storage
        .from('bottle-photos')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('whiskies')
        .update({ image_url: data.publicUrl })
        .eq('id', whiskyId)

      if (updateError) throw new Error(updateError.message)

      setMessage('Photo uploaded successfully.')
      setFile(null)

      const input = document.getElementById('photo-input') as HTMLInputElement
      if (input) input.value = ''
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed.')
    }

    setLoading(false)
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Upload Bottle Photo</h1>

      <form onSubmit={handleUpload} className="space-y-4 rounded-2xl border p-6">
        <select
          className="w-full rounded-xl border p-3"
          value={whiskyId}
          onChange={(e) => setWhiskyId(e.target.value)}
        >
          <option value="">Select bottle</option>
          {whiskies.map((w) => (
            <option key={w.id} value={w.id}>
              {w.brand} {w.name}
            </option>
          ))}
        </select>

        <input
          id="photo-input"
          type="file"
          accept="image/*,.heic"
          className="w-full rounded-xl border p-3"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border px-4 py-2"
        >
          {loading ? 'Uploading...' : 'Upload Photo'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  )
}
