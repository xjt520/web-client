import { useState } from 'react'

interface PauseButtonProps {
  isPaused: boolean
  isOwner: boolean
  onPause: () => Promise<void>
  onResume: () => Promise<void>
  disabled?: boolean
}

export function PauseButton({
  isPaused,
  isOwner,
  onPause,
  onResume,
  disabled = false,
}: PauseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!isOwner) return null

  const handleClick = async () => {
    if (isLoading || disabled) return

    setIsLoading(true)
    try {
      if (isPaused) {
        await onResume()
      } else {
        await onPause()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        transition-all duration-200
        ${isPaused
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
        }
        ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : isPaused ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      )}
      <span>{isPaused ? '继续' : '暂停'}</span>
    </button>
  )
}
