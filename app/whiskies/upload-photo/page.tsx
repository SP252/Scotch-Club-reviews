'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

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
    if (fromUrl) {
      setWhiskyId(fromUrl)
    }
  }, [])

  useEffect(() => {
    async function loadWhiskies() {
      const { data, error } = await supabase
        .from('whiskies')
        .select('id, brand, name')
        .order('brand', { ascending: true })

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

    if (!whiskyId) {
      setMessage('Please choose a bottle.')
      return
    }

    if (!file) {
      setMessage('Please choose an image.')
      return
    }

    setLoading(true)

    try {
      let uploadFile = file

      const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif')

      if (isHeic) {
        const heic2any = (await import('heic2any')).default

        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
        })

        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

        uploadFile = new File(
          [finalBlob as Blob],
          file.name.replace(/\.(heic|heif)$/i, '.jpg'),
          { type: 'image/jpeg' }
        )
      }

      const fileExt = uploadFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExt = fileExt.replace(/[^a-z0-9]/g, '') || 'jpg'
      const filePath = `${whiskyId}.${safeExt}`

      const { error: uploadError } = await supabase.storage
        .from('bottle-photos')
        .upload(filePath, uploadFile, { upsert: true })

      if (uploadError) {
        setMessage(uploadError.message)
        setLoading(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('bottle-photos')
        .getPublicUrl(filePath)

      const imageUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from('whiskies')
        .update({ image_url: imageUrl })
        .eq('id', whiskyId)

      if (updateError) {
        setMessage(updateError.message)
        setLoading(false)
        return
      }

      setMessage('Photo uploaded successfully.')
      setFile(null)

      const input = document.getElementById('photo-input') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed.')
    }

    setLoading(false)
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Upload Bottle Photo</h1>
      <p className="mb-6 text-sm text-gray-500">
        Select a whisky and upload an image for it.
      </p>

      <form
        onSubmit={handleUpload}
        className="space-y-4 rounded-2xl border p-6 shadow-sm"
      >
        <div>
          <label className="mb-2 block text-sm font-medium">Bottle</label>
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
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Photo</label>
          <input
            id="photo-input"
            type="file"
            accept="image/*,.heic,.heif"
            className="w-full rounded-xl border p-3"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border px-4 py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload Photo'}
        </button>

        {message ? <p className="text-sm">{message}</p> : null}
      </form>
    </main>
  )
}
