'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Whisky = {
  id: string
  brand: string
  name: string
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

      if (isHeicLike(file)) {
        setMessage('Converting HEIC photo...')

        try {
          uploadFile = await convertHeicToJpeg(file)
        } catch (err) {
          const text = err instanceof Error ? err.message : 'Unknown conversion
