interface OpponentHandProps {
  playerName: string
  cardsCount: number
  isLandlord: boolean
  isTrusted?: boolean
}

export function OpponentHand({ playerName, cardsCount, isLandlord, isTrusted = false }: OpponentHandProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-white font-medium">{playerName}</span>
        {isLandlord && <span className="text-yellow-400">👑</span>}
        {isTrusted && (
          <span className="text-orange-400 text-xs bg-orange-900/50 px-1.5 py-0.5 rounded">
            托管
          </span>
        )}
      </div>

      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(cardsCount, 10) }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-6 bg-gradient-to-br from-blue-900 to-blue-950 rounded-sm border border-blue-700"
            style={{
              marginLeft: i > 0 ? '-8px' : '0',
            }}
          />
        ))}
        {cardsCount > 10 && (
          <span className="text-gray-400 text-xs ml-1 self-end">+{cardsCount - 10}</span>
        )}
      </div>

      <div className="text-gray-400 text-sm">{cardsCount} 张</div>
    </div>
  )
}
