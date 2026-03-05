import { useState } from 'react'
import { QuickMatchModal } from './QuickMatchModal'

interface QuickMatchButtonProps {
  onJoinQueue: () => Promise<void>
  isMatching: boolean
  matchTime: number
  matchedRoomId: bigint | null
  error: string | null
  onLeaveQueue: () => Promise<void>
}

export function QuickMatchButton({
  onJoinQueue,
  isMatching,
  matchTime,
  matchedRoomId,
  error,
  onLeaveQueue,
}: QuickMatchButtonProps) {
  const [showModal, setShowModal] = useState(false)

  const handleClick = async () => {
    if (!isMatching) {
      await onJoinQueue()
      setShowModal(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isMatching}
        className={`
          w-full py-4 px-6 rounded-xl font-bold text-lg
          transition-all duration-200 transform
          ${isMatching
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105 active:scale-95'
          }
          text-white shadow-lg
        `}
      >
        {isMatching ? (
          <span className="flex items-center justify-center gap-2">
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
            匹配中...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            随机匹配
          </span>
        )}
      </button>

      {showModal && isMatching && (
        <QuickMatchModal
          matchTime={matchTime}
          error={error}
          matchedRoomId={matchedRoomId}
          onCancel={async () => {
            await onLeaveQueue()
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
