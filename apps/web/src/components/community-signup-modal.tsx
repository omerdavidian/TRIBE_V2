'use client'

import { useMemo, useState } from 'react'
import { apiRequest } from '@/lib/api'
import { getStoredUser, getToken } from '@/lib/auth'

type TimeBlock = 'morning' | 'afternoon' | 'evening'

interface CommunitySignupModalProps {
  itemId: string
  itemTitle: string
  onClose: () => void
  onSuccess: () => void
}

function defaultDateValue() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function blockHour(block: TimeBlock): number {
  if (block === 'morning') return 9
  if (block === 'afternoon') return 14
  return 18
}

export default function CommunitySignupModal({
  itemId,
  itemTitle,
  onClose,
  onSuccess,
}: CommunitySignupModalProps) {
  const user = useMemo(() => getStoredUser(), [])
  const token = getToken()

  const [date, setDate] = useState(defaultDateValue)
  const [timeBlock, setTimeBlock] = useState<TimeBlock>('afternoon')
  const [volunteerName, setVolunteerName] = useState(
    user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  )
  const [volunteerEmail, setVolunteerEmail] = useState(user?.email ?? '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (saving) return
    setError(null)

    const when = new Date(`${date}T00:00:00`)
    if (Number.isNaN(when.getTime())) {
      setError('Please choose a valid date.')
      return
    }
    when.setHours(blockHour(timeBlock), 0, 0, 0)

    setSaving(true)
    try {
      await apiRequest(`/registries/items/${itemId}/signups`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({
          scheduledFor: when.toISOString(),
          volunteerName: volunteerName.trim() || undefined,
          volunteerEmail: volunteerEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete signup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#d6e6e4] bg-[#fcf9f8] dark:bg-[#001f23] dark:border-[#0c5159] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Sign up to help"
      >
        <h2 className="font-display text-xl font-bold text-[#00343a] dark:text-[#e8f6f7]">Sign Up to Help</h2>
        <p className="text-sm text-[#5a6468] dark:text-[#79a0a6] mt-1">{itemTitle}</p>

        <div className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9da0] mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#d6d2ce] dark:border-[#0c5159] bg-white dark:bg-[#00272c] px-3 text-sm text-[#00343a] dark:text-[#e8f6f7]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9da0] mb-1.5">Time Window</label>
            <div className="grid grid-cols-3 gap-2">
              {(['morning', 'afternoon', 'evening'] as TimeBlock[]).map((block) => (
                <button
                  key={block}
                  type="button"
                  onClick={() => setTimeBlock(block)}
                  className={[
                    'h-10 rounded-lg text-xs font-semibold border transition-colors',
                    timeBlock === block
                      ? 'bg-[#00343a] text-white border-[#00343a]'
                      : 'bg-white dark:bg-[#00272c] text-[#40484a] dark:text-[#95d0d9] border-[#d6d2ce] dark:border-[#0c5159]',
                  ].join(' ')}
                >
                  {block[0]!.toUpperCase() + block.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {!token && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9da0] mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#d6d2ce] dark:border-[#0c5159] bg-white dark:bg-[#00272c] px-3 text-sm text-[#00343a] dark:text-[#e8f6f7]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9da0] mb-1.5">Email</label>
                <input
                  type="email"
                  value={volunteerEmail}
                  onChange={(e) => setVolunteerEmail(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#d6d2ce] dark:border-[#0c5159] bg-white dark:bg-[#00272c] px-3 text-sm text-[#00343a] dark:text-[#e8f6f7]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9da0] mb-1.5">Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#d6d2ce] dark:border-[#0c5159] bg-white dark:bg-[#00272c] px-3 py-2 text-sm text-[#00343a] dark:text-[#e8f6f7] resize-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#d6d2ce] dark:border-[#0c5159] text-sm font-medium text-[#40484a] dark:text-[#95d0d9]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#00343a] hover:bg-[#004c54] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Confirm Signup'}
          </button>
        </div>
      </div>
    </div>
  )
}
