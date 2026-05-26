import type { ApplicationStatus } from '@tribe/shared'

interface VerifiedBadgeProps {
  applicationStatus: ApplicationStatus
  /** Size of the badge icon. Defaults to 'sm'. */
  size?: 'sm' | 'md'
  /** Show a text label next to the icon. Defaults to false. */
  showLabel?: boolean
}

/**
 * Renders a teal shield-checkmark badge **only** when `applicationStatus === 'approved'`.
 * Returns null for pending / rejected providers.
 */
export default function VerifiedBadge({
  applicationStatus,
  size = 'sm',
  showLabel = false,
}: VerifiedBadgeProps) {
  if (applicationStatus !== 'approved') return null

  const dim = size === 'md' ? 18 : 14

  return (
    <span
      className="inline-flex items-center gap-1 text-teal-600"
      title="Verified Provider"
      aria-label="Verified Provider"
    >
      {/* Shield with checkmark */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        <path
          d="M10 14.4l-2.8-2.8-1.4 1.4L10 17.2l7.2-7.2-1.4-1.4L10 14.4z"
          fill="white"
        />
      </svg>
      {showLabel && (
        <span className="text-xs font-semibold text-teal-600 leading-none">
          Verified
        </span>
      )}
    </span>
  )
}
