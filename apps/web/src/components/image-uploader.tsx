'use client'

import React, { useRef, useCallback, useState } from 'react'
import { getApiUrl } from '@/lib/api'
import { getToken } from '@/lib/auth'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  className?: string
}

export default function ImageUploader({ value, onChange, className = '' }: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, WebP, GIF)')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5 MB')
        return
      }
      setError(null)
      setUploading(true)
      try {
        const token = getToken()
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(getApiUrl('/assets/upload'), {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: 'Upload failed' }))
          throw new Error(
            typeof body.message === 'string' ? body.message : 'Upload failed'
          )
        }
        const { imageUrl } = await res.json()
        onChange(imageUrl as string)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) upload(file)
    },
    [upload]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) upload(file)
    },
    [upload]
  )

  if (value) {
    return (
      <div className={`relative rounded-xl overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Cover preview" className="w-full h-44 object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => {
              onChange('')
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="bg-white/95 text-[#00343a] text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white transition-colors shadow"
          >
            Remove & replace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload cover image"
        className={[
          'relative border-2 border-dashed rounded-xl transition-all cursor-pointer select-none',
          dragging
            ? 'border-[#29676f] bg-[#e8f4f0]'
            : 'border-[#c8d8d5] hover:border-[#29676f] bg-[#f7faf9] dark:bg-[#002a30] dark:border-[#054f57]/60 dark:hover:border-[#29676f]',
          uploading ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center py-9 px-4 gap-3">
          {uploading ? (
            <>
              <svg
                className="animate-spin w-8 h-8 text-[#29676f]"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-[#70797a]">Uploading…</p>
            </>
          ) : (
            <>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#29676f"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#00343a] dark:text-[#95d0d9]">
                  Drop your photo here, or{' '}
                  <span className="text-[#29676f] underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-[#8a9da0] mt-1">JPEG, PNG, WebP · up to 5 MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  )
}
