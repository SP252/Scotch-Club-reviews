'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Whisky = {
  id: string
  brand: string
  name: string
}

function isHeicFile(file: File) {
  const lower = file.name.toLowerCase()
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    lower.endsWith('.heic') ||
    lower.endsWith('.heif')
  )
}

async function convertHeicToJpg(file: File): Promise<File> {
  const heic2anyModule = await import('heic2any')
  const heic2any = heic2anyModule.default

  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  })

  const blob = Array.isArray(result) ? result[0] : result

  if (!(blob instanceof Blob)) {
    throw new Error('HEIC conversion did not return an image file.')
  }

  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')

  return new File([blob], newName, {
    type: 'image/jpeg',
  })
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

      if (isHeicFile(file)) {
        setMessage('Converting HEIC photo...')
        uploadFile = await convertHeicToJpg(file)
      }

      const lowerName = uploadFile.name.toLowerCase()
      const allowed =
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.webp')

      if (!allowed) {
        throw new Error('Please upload a JPG, PNG, WEBP, or HEIC image.')
      }

      const fileExt = uploadFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExt = fileExt.replace(/[^a-z0-9]/g, '') || 'jpg'
      const filePath = `${whiskyId}.${safeExt}`

      setMessage('Uploading photo...')

      const { error: uploadError } = await supabase.storage
        .from('bottle-photos')
        .upload(filePath, uploadFile, {
          upsert: true,
          contentType: uploadFile.type || 'image/jpeg',
        })

      if (uploadError) {
        throw new Error(uploadError.message)
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
        throw new Error(updateError.message)
      }

      setMessage('Photo uploaded successfully.')
      setFile(null)

      const input = document.getElementById('photo-input') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (err) {
      const text =
        err instanceof Error ? err.message : 'Upload failed.'

      if (text.toLowerCase().includes('heic')) {
        setMessage(`HEIC conversion failed: ${text}`)
      } else {
        setMessage(text)
      }
    }

    setLoading(false)
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-3xl font-bold">Upload Bottle Photo</h1>
      <p className="mb-6 text-sm text-gray-500">
        Select a whisky and upload an image for it. HEIC photos from iPhone should convert automatically.
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
          {loading ? 'Working...' : 'Upload Photo'}
        </button>

        {message ? <p className="text-sm">{message}</p> : null}
      </form>
    </main>
  )
}
