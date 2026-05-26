interface StarRatingProps {
  /** Average rating 0-5 */
  rating: number
  /** Total reviews */
  reviewCount: number
  /** Mothers who recommended */
  recommendCount?: number
  size?: 'sm' | 'md'
}

/**
 * Displays a visual star rating row with review count and optional recommendation count.
 */
export default function StarRating({
  rating,
  reviewCount,
  recommendCount,
  size = 'sm',
}: StarRatingProps) {
  const starSize = size === 'md' ? 16 : 12
  const rounded = Math.round(rating * 2) / 2 // round to nearest 0.5

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Stars */}
      <span className="flex items-center gap-0.5" aria-label={`${rounded} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(rounded)
          const half = !filled && star - 0.5 === rounded
          return (
            <svg
              key={star}
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {half ? (
                <>
                  <defs>
                    <linearGradient id={`half-${star}`}>
                      <stop offset="50%" stopColor="#E97451" />
                      <stop offset="50%" stopColor="#D1D5DB" />
                    </linearGradient>
                  </defs>
                  <path
                    fill={`url(#half-${star})`}
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  />
                </>
              ) : (
                <path
                  fill={filled ? '#E97451' : '#D1D5DB'}
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              )}
            </svg>
          )
        })}
      </span>

      {/* Numeric + count */}
      {reviewCount > 0 ? (
        <span className={`text-gray-500 ${size === 'md' ? 'text-sm' : 'text-xs'}`}>
          <span className="font-semibold text-gray-700">{rounded.toFixed(1)}</span>
          {' '}({reviewCount})
        </span>
      ) : (
        <span className={`text-gray-400 ${size === 'md' ? 'text-sm' : 'text-xs'}`}>
          No reviews yet
        </span>
      )}

      {/* Recommendation count */}
      {typeof recommendCount === 'number' && recommendCount > 0 && (
        <span className={`text-teal-600 ${size === 'md' ? 'text-sm' : 'text-xs'} font-medium`}>
          · Recommended by {recommendCount} {recommendCount === 1 ? 'mother' : 'mothers'}
        </span>
      )}
    </div>
  )
}
