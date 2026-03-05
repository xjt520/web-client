import type { MatchRecord } from '../../module_bindings/types'

interface MatchHistoryProps {
  records: MatchRecord[]
}

export function MatchHistory({ records }: MatchHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">暂无对局记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div
          key={record.id.toString()}
          className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                record.isLandlord ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
              }`}>
                {record.isLandlord ? '地主' : '农民'}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                record.isWinner ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-600 text-gray-400'
              }`}>
                {record.isWinner ? '胜利' : '失败'}
              </span>
            </div>
            <span className={`font-bold ${
              record.scoreChange > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {record.scoreChange > 0 ? '+' : ''}{record.scoreChange}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>炸弹: {record.bombCount}</span>
            {record.isSpring && <span className="text-purple-400">春天</span>}
            <span>{formatTime(Number(record.createdAt.microsSinceUnixEpoch) / 1000)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  }

  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  }

  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`
  }

  // 其他显示日期
  return `${date.getMonth() + 1}/${date.getDate()}`
}
