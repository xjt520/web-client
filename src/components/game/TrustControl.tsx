interface TrustControlProps {
  isTrusted: boolean
  onToggle: (trusted: boolean) => void
  disabled?: boolean
  isCompact?: boolean
}

/**
 * 托管控制组件
 */
export function TrustControl({
  isTrusted,
  onToggle,
  disabled = false,
  isCompact = false,
}: TrustControlProps) {
  return (
    <button
      onClick={() => onToggle(!isTrusted)}
      disabled={disabled}
      className={`
        rounded-md font-medium transition-all flex items-center gap-1.5
        ${isCompact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
        ${isTrusted
          ? 'bg-orange-600/80 hover:bg-orange-500 text-white'
          : 'bg-gray-700/80 hover:bg-gray-600 text-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={isTrusted ? '点击取消托管' : '点击托管，系统将自动出牌'}
    >
      <svg
        className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isTrusted ? 'animate-pulse' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isTrusted ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        )}
      </svg>
      {isTrusted ? '托管中' : '托管'}
    </button>
  )
}
