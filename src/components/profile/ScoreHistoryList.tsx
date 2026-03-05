import type { ScoreHistory } from '../../module_bindings/types'

interface ScoreHistoryListProps {
  history: ScoreHistory[]
}

export function ScoreHistoryList({ history }: ScoreHistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">暂无积分记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {history.map((item) => (
        <div
          key={item.id.toString()}
          className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3 hover:bg-gray-700/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              item.change > 0 ? 'bg-green-900/50' : 'bg-red-900/50'
            }`}>
              <span className={`text-lg ${item.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {item.change > 0 ? '↑' : '↓'}
              </span>
            </div>
            <div>
              <p className="text-white text-sm">{item.reason}</p>
              <p className="text-gray-500 text-xs">{formatTime(Number(item.createdAt.microsSinceUnixEpoch) / 1000)}</p>
            </div>
          </div>
          <span className={`font-bold ${
            item.change > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {item.change > 0 ? '+' : ''}{item.change}
          </span>
        </div>
      ))}
    </div>
  )
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')

  return `${month}月${day}日 ${hour}:${minute}`
}
