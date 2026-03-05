import { useState } from 'react'

interface DoublingPanelProps {
  onDouble: (double: boolean) => void
  isMyTurn: boolean
  hasDoubled: boolean
  currentMultiple: number
  isSpectator?: boolean
}

/**
 * 加倍面板组件
 */
export function DoublingPanel({
  onDouble,
  isMyTurn,
  hasDoubled,
  currentMultiple,
  isSpectator,
}: DoublingPanelProps) {
  const [selected, setSelected] = useState<boolean | null>(null)

  const handleDouble = (double: boolean) => {
    setSelected(double)
    onDouble(double)
  }

  if (hasDoubled) {
    return (
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="text-yellow-400 text-lg font-medium">
          当前倍数: {currentMultiple}x
        </div>
        <div className="text-gray-400 text-sm">
          您已选择{selected ? '加倍' : '不加倍'}
        </div>
      </div>
    )
  }

  // 观战者显示等待提示
  const showWaitingMessage = isSpectator || !isMyTurn

  return (
    <div className="flex flex-col items-center gap-3 mb-4">
      <div className="text-white text-lg font-medium">
        加倍阶段
      </div>
      <div className="text-yellow-400 text-sm">
        当前倍数: {currentMultiple}x
      </div>

      {showWaitingMessage ? (
        <div className="text-gray-400 text-sm animate-pulse">
          等待其他玩家选择...
        </div>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={() => handleDouble(true)}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
          >
            加倍
          </button>
          <button
            onClick={() => handleDouble(false)}
            className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white font-medium rounded-lg shadow-lg transform hover:scale-105 transition-all"
          >
            不加倍
          </button>
        </div>
      )}
    </div>
  )
}
