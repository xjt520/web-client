interface BiddingPanelProps {
  onBid: (value: number) => void
  maxBid: number
  hasBid: boolean
  isSpectator?: boolean
}

export function BiddingPanel({ onBid, maxBid, hasBid, isSpectator }: BiddingPanelProps) {
  // 观战者或已叫分，显示等待提示
  if (isSpectator || hasBid) {
    return (
      <div className="text-center text-gray-400 py-4">
        等待其他玩家叫分...
      </div>
    )
  }

  const availableBids = [0, 1, 2, 3].filter((v) => v === 0 || v > maxBid)

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <h3 className="text-white text-lg font-medium">请选择叫分</h3>

      <div className="flex gap-3">
        {availableBids.map((value) => (
          <button
            key={value}
            onClick={() => onBid(value)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              value === 0
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {value === 0 ? '不叫' : `${value}分`}
          </button>
        ))}
      </div>

      {maxBid > 0 && (
        <p className="text-gray-400 text-sm">当前最高叫分: {maxBid}分</p>
      )}
    </div>
  )
}
