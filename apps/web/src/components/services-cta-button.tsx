'use client'

import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth'

/**
 * Auth-gated CTA for the Services section.
 * Authenticated  → /services
 * Unauthenticated → /auth?redirect=/services
 */
export default function ServicesCTAButton() {
  const router = useRouter()

  function handleClick() {
    const token = getToken()
    if (token) {
      router.push('/services')
    } else {
      router.push('/auth?redirect=/services')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'inline-flex items-center gap-2',
        'bg-[#1F4A45] dark:bg-[#29676f] text-white',
        'font-semibold px-9 py-4 rounded-full text-base',
        'hover:bg-[#173934] dark:hover:bg-[#1F4A45]',
        'active:scale-[0.98]',
        'transition-all duration-200',
        'shadow-lg shadow-[#1F4A45]/20',
        'min-h-[52px]',
      ].join(' ')}
    >
      View all registry services
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 8l4 4m0 0l-4 4m4-4H3"
        />
      </svg>
    </button>
  )
}
