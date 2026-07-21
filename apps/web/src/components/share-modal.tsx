'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface ShareModalProps {
  url: string
  title: string
  motherName: string | null
  onClose: () => void
}

type ShareView = 'options' | 'qr' | 'instagram'

export default function ShareModal({ url, title, motherName, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<ShareView>('options')

  const displayName = motherName ?? 'a new mother'
  const text = `Help support ${displayName}'s postpartum care registry on TRIBE 💛`
  const encodedText = encodeURIComponent(`${text}\n${url}`)
  const encodedUrl = encodeURIComponent(url)

  // Try native share on mobile only (not on desktop/Windows)
  useEffect(() => {
    const isMobile = () => {
      return (
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      )
    }

    if (isMobile() && 'share' in navigator) {
      navigator
        .share({ title, text, url })
        .then(() => onClose())
        .catch(() => {
          // User cancelled or browser blocked → show our fallback UI (do nothing)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for browsers that block clipboard
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [url])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#001a1e]/75 backdrop-blur-sm" aria-hidden />

      {/* Sheet */}
      <div
        className="relative w-full max-w-sm bg-[#fcf9f8] dark:bg-[#001f23] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Teal gradient top stripe */}
        <div className="h-1 bg-gradient-to-r from-[#00343a] via-[#29676f] to-[#95d0d9]" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            {view !== 'options' ? (
              <button
                onClick={() => setView('options')}
                className="flex items-center gap-1.5 text-sm text-[#40484a] dark:text-[#95d0d9] hover:text-[#00343a] dark:hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
            ) : (
              <div>
                <h2 className="font-display text-lg font-bold text-[#00343a] dark:text-[#e0f5f7]">
                  Share this registry
                </h2>
                <p className="text-xs text-[#70797a] mt-0.5">
                  Help {displayName} get the support she deserves
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="ml-auto text-[#70797a] hover:text-[#00343a] dark:hover:text-white transition-colors p-1 -mr-1"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Views ──────────────────────────────────────────────────── */}

          {view === 'options' && (
            <div className="space-y-3">
              {/* Top row: SMS + WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`sms:?body=${encodedText}`}
                  className="flex flex-col items-center gap-2 p-4 bg-[#f7f4f2] dark:bg-[#00272c] rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/30 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e8f4f0] dark:bg-[#004c54]/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#00343a] dark:text-[#95d0d9]" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[#40484a] dark:text-[#95d0d9]">Messages</span>
                </a>
                <a
                  href={`https://wa.me/?text=${encodedText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 bg-[#f7f4f2] dark:bg-[#00272c] rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e8f4f0] dark:bg-[#004c54]/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[#40484a] dark:text-[#95d0d9]">WhatsApp</span>
                </a>
              </div>

              {/* Second row: Facebook + Instagram */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 bg-[#f7f4f2] dark:bg-[#00272c] rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e8f4f0] dark:bg-[#004c54]/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[#40484a] dark:text-[#95d0d9]">Facebook</span>
                </a>
                <button
                  onClick={() => setView('instagram')}
                  className="flex flex-col items-center gap-2 p-4 bg-[#f7f4f2] dark:bg-[#00272c] rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e8f4f0] dark:bg-[#004c54]/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="url(#ig-grad)">
                      <defs>
                        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f09433"/>
                          <stop offset="25%" stopColor="#e6683c"/>
                          <stop offset="50%" stopColor="#dc2743"/>
                          <stop offset="75%" stopColor="#cc2366"/>
                          <stop offset="100%" stopColor="#bc1888"/>
                        </linearGradient>
                      </defs>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[#40484a] dark:text-[#95d0d9]">Instagram</span>
                </button>
              </div>

              {/* Bottom row: Copy Link + QR Code */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => void copyLink()}
                  className="flex flex-col items-center gap-2 p-4 bg-[#f7f4f2] dark:bg-[#00272c] rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e8f4f0] dark:bg-[#004c54]/40 flex items-center justify-center">
                    {copied ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#29676f]" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#00343a] dark:text-[#95d0d9]" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-semibold transition-colors ${copied ? 'text-[#29676f]' : 'text-[#40484a] dark:text-[#95d0d9]'}`}>
                    {copied ? 'Copied!' : 'Copy link'}
                  </span>
                </button>
                <button
                  onClick={() => setView('qr')}
                  className="flex flex-col items-center gap-2 p-4 bg-[#f7f4f2] dark:bg-[#00272c] rounded-xl hover:bg-[#e8f4f0] dark:hover:bg-[#004c54]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e8f4f0] dark:bg-[#004c54]/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#00343a] dark:text-[#95d0d9]" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                      <path d="M14 14h.01M14 17h.01M17 14h.01M17 17h.01M20 14h.01M20 17h.01M17 20h.01M20 20h.01"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[#40484a] dark:text-[#95d0d9]">QR code</span>
                </button>
              </div>
            </div>
          )}

          {/* ── QR View ──────────────────────────────────────────────────── */}
          {view === 'qr' && (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-sm text-[#40484a] dark:text-[#70797a] text-center">
                Let someone scan this to open the registry instantly.
              </p>
              <div className="p-4 bg-white rounded-2xl shadow-inner">
                <QRCodeSVG
                  value={url}
                  size={192}
                  bgColor="#ffffff"
                  fgColor="#00343a"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-[#70797a] text-center break-all max-w-full">{url}</p>
              <button
                onClick={() => void copyLink()}
                className="w-full py-3 rounded-xl bg-[#00343a] text-white font-semibold text-sm hover:bg-[#004c54] transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy link too'}
              </button>
            </div>
          )}

          {/* ── Instagram tip view ───────────────────────────────────────── */}
          {view === 'instagram' && (
            <div className="flex flex-col gap-4 py-2">
              <div className="bg-gradient-to-br from-[#f09433]/10 to-[#bc1888]/10 border border-[#e6683c]/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-[#00343a] dark:text-[#e0f5f7] mb-2">
                  Sharing to Instagram Story
                </p>
                <ol className="text-sm text-[#40484a] dark:text-[#70797a] space-y-2 list-decimal list-inside">
                  <li>Copy the link below</li>
                  <li>Open Instagram and create a new Story</li>
                  <li>Tap the <strong>link sticker</strong> and paste the URL</li>
                  <li>Share , friends can tap to open the registry!</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 bg-[#f7f4f2] dark:bg-[#00272c] rounded-xl px-4 py-3">
                <p className="flex-1 text-xs text-[#40484a] dark:text-[#95d0d9] truncate">{url}</p>
              </div>

              <button
                onClick={() => void copyLink()}
                className="w-full py-3 rounded-xl bg-[#00343a] text-white font-semibold text-sm hover:bg-[#004c54] transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy link for Instagram'}
              </button>

              <p className="text-center text-xs text-[#70797a]">
                Or{' '}
                <button onClick={() => setView('qr')} className="underline hover:text-[#00343a] dark:hover:text-[#95d0d9]">
                  show the QR code
                </button>{' '}
                to scan in-person
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
