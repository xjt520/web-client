import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface BiddingPanelProps {
  onBid: (value: number) => void
  maxBid: number
  hasBid: boolean
}

export function BiddingPanel({ onBid, maxBid, hasBid }: BiddingPanelProps) {
  const { isMobileLandscape } = useScreenOrientation()

  // 已叫分，显示等待提示
  if (hasBid) {
    return (
      <div className={`text-center text-gray-400 ${isMobileLandscape ? 'py-2 text-sm' : 'py-4'}`}>
        等待其他玩家叫分...
      </div>
    )
  }

  const availableBids = [0, 1, 2, 3].filter((v) => v === 0 || v > maxBid)

  return (
    <div className={`flex flex-col items-center ${isMobileLandscape ? 'gap-2 py-2' : 'gap-4 py-4'}`}>
      <h3 className={`text-white font-medium ${isMobileLandscape ? 'text-base' : 'text-lg'}`}>
        请选择叫分
      </h3>

      <div className={`flex ${isMobileLandscape ? 'gap-2' : 'gap-3'}`}>
        {availableBids.map((value) => (
          <button
            key={value}
            onClick={() => onBid(value)}
            className={`
              rounded-lg font-medium transition-colors
              ${isMobileLandscape ? 'px-4 py-2 text-sm' : 'px-6 py-3'}
              ${value === 0
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {value === 0 ? '不叫' : `${value}分`}
          </button>
        ))}
      </div>

      {maxBid > 0 && (
        <p className={`text-gray-400 ${isMobileLandscape ? 'text-xs' : 'text-sm'}`}>
          当前最高: {maxBid}分
        </p>
      )}
    </div>
  )
}
