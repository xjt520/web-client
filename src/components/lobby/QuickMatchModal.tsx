import { useEffect } from 'react'

interface QuickMatchModalProps {
  matchTime: number
  error: string | null
  matchedRoomId: bigint | null
  onCancel: () => Promise<void>
  onClose: () => void
}

const MATCH_TIMEOUT = 10

export function QuickMatchModal({
  matchTime,
  error,
  matchedRoomId,
  onCancel,
  onClose,
}: QuickMatchModalProps) {
  // 匹配成功或失败时自动关闭
  useEffect(() => {
    if (matchedRoomId !== null || error) {
      const timer = setTimeout(onClose, 1500)
      return () => clearTimeout(timer)
    }
  }, [matchedRoomId, error, onClose])

  const progress = Math.min(100, (matchTime / MATCH_TIMEOUT) * 100)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        {matchedRoomId !== null ? (
          // 匹配成功
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">匹配成功!</h3>
            <p className="text-gray-400">正在进入房间...</p>
          </div>
        ) : error ? (
          // 匹配失败
          <div className="text-center">
            <div className="text-6xl mb-4">😢</div>
            <h3 className="text-2xl font-bold text-red-400 mb-2">匹配失败</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              关闭
            </button>
          </div>
        ) : (
          // 匹配中
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              {/* 外圈旋转动画 */}
              <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
              <div
                className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              {/* 中心文字 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{matchTime}s</span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">正在匹配对手...</h3>
            <p className="text-gray-400 mb-6">
              预计等待时间: &lt; 10秒
            </p>

            {/* 进度条 */}
            <div className="w-full h-2 bg-gray-700 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <button
              onClick={onCancel}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              取消匹配
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
