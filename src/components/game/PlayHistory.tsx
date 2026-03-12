import { useState, useMemo, memo, useRef, useEffect } from 'react'
import type { Play, RoomPlayer, PlayerActionEvent } from '../../module_bindings/types'
import { cardRank, cardSuit, isRedCard, getSuitSymbol, cardValue } from '../../lib/gameUtils'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface PlayHistoryProps {
  plays: Play[]
  players: RoomPlayer[]
  actionEvents?: PlayerActionEvent[]
  landlordSeat?: number | null
}

type ActionType = 'play' | 'pass'

interface HistoryItem {
  id: string
  type: ActionType
  timestamp: bigint
  playerIdentity: { toHexString: () => string }
  playerName: string
  seatIndex: number
  isLandlord: boolean
  cards?: Uint8Array
  combinationType?: string
}

/**
 * 迷你卡牌显示组件 - 用于历史记录
 */
function MiniCard({ card }: { card: number }) {
  const suit = cardSuit(card)
  const rank = cardRank(card)
  const red = isRedCard(card)
  const isJoker = card >= 52

  if (isJoker) {
    return (
      <div className={`inline-flex flex-col items-center justify-center w-8 h-10 rounded text-[10px] font-bold shadow-sm
        ${card === 53 ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
        <span className="text-xs">{card === 53 ? '大' : '小'}</span>
        <span className="text-[10px]">王</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center w-8 h-10 rounded bg-white border border-gray-300 shadow-sm
      ${red ? 'text-red-600' : 'text-gray-800'}`}>
      <span className="text-xs font-bold leading-none">{rank}</span>
      <span className="text-[10px] leading-none mt-0.5">{suit ? getSuitSymbol(suit) : ''}</span>
    </div>
  )
}

/**
 * 出牌历史记录组件（优化版）
 */
export function PlayHistory({ plays, players, actionEvents = [], landlordSeat }: PlayHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompact = isMobileLandscape || isCompactScreen
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 打开时滚动到顶部
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [isOpen])

  // 缓存玩家名称映射
  const playerMap = useMemo(() => {
    const map = new Map<string, { name: string; seatIndex: number }>()
    players.forEach(p => {
      map.set(p.playerIdentity.toHexString(), {
        name: p.playerName,
        seatIndex: p.seatIndex
      })
    })
    return map
  }, [players])

  // 合并出牌和不出记录，按时间排序
  const historyItems = useMemo(() => {
    const items: HistoryItem[] = []

    // 添加出牌记录
    plays.forEach(play => {
      const playerInfo = playerMap.get(play.playerIdentity.toHexString())
      items.push({
        id: `play-${play.id}`,
        type: 'play',
        timestamp: typeof play.timestamp === 'bigint' ? play.timestamp : play.timestamp.microsSinceUnixEpoch,
        playerIdentity: play.playerIdentity,
        playerName: playerInfo?.name || '未知玩家',
        seatIndex: playerInfo?.seatIndex ?? 0,
        isLandlord: landlordSeat === playerInfo?.seatIndex,
        cards: play.cards,
        combinationType: play.combinationType
      })
    })

    // 添加不出记录（从 PlayerActionEvent 获取）
    actionEvents.forEach(event => {
      if (event.actionType === 'pass') {
        const playerInfo = playerMap.get(event.playerIdentity.toHexString())
        items.push({
          id: `pass-${event.id}`,
          type: 'pass',
          timestamp: typeof event.createdAt === 'bigint' ? event.createdAt : event.createdAt.microsSinceUnixEpoch,
          playerIdentity: event.playerIdentity,
          playerName: playerInfo?.name || '未知玩家',
          seatIndex: playerInfo?.seatIndex ?? 0,
          isLandlord: landlordSeat === playerInfo?.seatIndex
        })
      }
    })

    // 按时间倒序排序
    return items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
  }, [plays, actionEvents, playerMap, landlordSeat])

  // 按回合分组（每隔3次不出或新一轮开始为一回合）
  const groupedHistory = useMemo(() => {
    const groups: { round: number; items: HistoryItem[] }[] = []
    let currentRound = 1
    let currentGroup: HistoryItem[] = []
    let passCount = 0

    // 正序处理（从最早到最晚）
    const sortedItems = [...historyItems].reverse()

    sortedItems.forEach(item => {
      currentGroup.push(item)

      if (item.type === 'pass') {
        passCount++
      } else {
        passCount = 0
      }

      // 连续2次不出表示一轮结束（因为出牌者不需要不出）
      if (passCount >= 2) {
        groups.push({ round: currentRound, items: [...currentGroup].reverse() })
        currentRound++
        currentGroup = []
        passCount = 0
      }
    })

    // 添加最后一组
    if (currentGroup.length > 0) {
      groups.push({ round: currentRound, items: currentGroup.reverse() })
    }

    // 倒序返回（最新在前）
    return groups.reverse()
  }, [historyItems])

  // 统计数据
  const stats = useMemo(() => {
    let bombCount = 0
    let rocketCount = 0
    plays.forEach(p => {
      if (p.combinationType === 'Bomb') bombCount++
      if (p.combinationType === 'Rocket') rocketCount++
    })
    return { bombCount, rocketCount, totalPlays: plays.length, totalPasses: actionEvents.filter(e => e.actionType === 'pass').length }
  }, [plays, actionEvents])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`${isCompact ? 'px-2.5 py-1 text-xs gap-1' : 'px-3 py-1.5 text-sm gap-1.5'} bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-md transition-colors flex items-center`}
        title="查看出牌历史"
      >
        <svg className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        历史 ({plays.length})
      </button>
    )
  }

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />

      {/* 历史面板 */}
      <div className={`fixed right-0 top-0 h-full ${isCompact ? 'w-full max-w-sm' : 'w-96'} bg-gray-900 shadow-2xl z-50 flex flex-col`}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white text-lg font-medium">出牌历史</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 统计栏 */}
        <div className="flex gap-4 px-4 py-2 bg-gray-800/50 border-b border-gray-700 text-sm">
          <span className="text-gray-400">出牌: <span className="text-white">{stats.totalPlays}</span></span>
          <span className="text-gray-400">不出: <span className="text-white">{stats.totalPasses}</span></span>
          {stats.bombCount > 0 && <span className="text-orange-400">炸弹: {stats.bombCount}</span>}
          {stats.rocketCount > 0 && <span className="text-red-400">王炸: {stats.rocketCount}</span>}
        </div>

        {/* 历史列表 */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
          {groupedHistory.length === 0 ? (
            <div className="text-gray-500 text-center py-8">暂无出牌记录</div>
          ) : (
            <div className="space-y-6">
              {groupedHistory.map(group => (
                <div key={`round-${group.round}`}>
                  {/* 回合分隔线 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-gray-500 text-xs">第 {group.round} 轮</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>

                  {/* 该回合的记录 */}
                  <div className="space-y-2">
                    {group.items.map(item => (
                      <HistoryItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="text-gray-400 text-sm">共 {historyItems.length} 次操作</div>
        </div>
      </div>
    </>
  )
}

/**
 * 历史记录项组件
 */
const HistoryItemCard = memo(function HistoryItemCard({ item }: { item: HistoryItem }) {
  // 格式化时间
  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // 翻译牌型名称
  const translateCombinationType = (type: string): string => {
    const translations: Record<string, string> = {
      'Single': '单张', 'Pair': '对子', 'Triple': '三张',
      'TripleWithSingle': '三带一', 'TripleWithPair': '三带二',
      'Straight': '顺子', 'DoubleStraight': '连对',
      'TripleStraight': '飞机', 'Airplane': '飞机',
      'AirplaneWithSingle': '飞机带单', 'AirplaneWithPair': '飞机带对',
      'Bomb': '炸弹', 'Rocket': '王炸', 'FourWithTwo': '四带二'
    }
    return translations[type] || type
  }

  // 判断是否是特殊牌型
  const isSpecialType = item.combinationType === 'Bomb' || item.combinationType === 'Rocket'

  // 不出记录
  if (item.type === 'pass') {
    return (
      <div className="bg-gray-800/50 rounded-lg p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{item.playerName}</span>
          {item.isLandlord && <span className="text-yellow-400 text-xs">👑</span>}
          {!item.isLandlord && <span className="text-green-400 text-xs">🌾</span>}
        </div>
        <span className="text-gray-500 text-sm">不出</span>
      </div>
    )
  }

  // 出牌记录
  return (
    <div className={`rounded-lg p-2 ${isSpecialType ? 'bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/30' : 'bg-gray-800'}`}>
      {/* 玩家信息和时间 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-sm font-medium">{item.playerName}</span>
          {item.isLandlord && <span className="text-yellow-400 text-xs">👑</span>}
          {!item.isLandlord && <span className="text-green-400 text-xs">🌾</span>}
        </div>
        <span className="text-gray-500 text-xs">{formatTime(item.timestamp)}</span>
      </div>

      {/* 牌型 */}
      <div className={`text-xs mb-1.5 ${item.combinationType === 'Rocket' ? 'text-red-400 font-bold' : item.combinationType === 'Bomb' ? 'text-orange-400 font-bold' : 'text-blue-400'}`}>
        {item.combinationType && translateCombinationType(item.combinationType)}
      </div>

      {/* 卡牌显示 - 使用迷你卡牌，按牌值排序，超过3张时叠加显示 */}
      {item.cards && item.cards.length > 0 && (
        <div className="relative mt-1" style={{ height: '40px', width: item.cards.length > 3 ? `${(item.cards.length - 1) * 20 + 32}px` : 'auto' }}>
          {Array.from(item.cards).sort((a, b) => cardValue(a) - cardValue(b)).map((card, cardIndex) => (
            <div
              key={cardIndex}
              className="absolute"
              style={{
                left: item.cards && item.cards.length > 3 ? `${cardIndex * 20}px` : `${cardIndex * 28}px`,
                zIndex: cardIndex
              }}
            >
              <MiniCard card={card} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
