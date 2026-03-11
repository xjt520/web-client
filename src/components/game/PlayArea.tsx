import { useMemo } from 'react'
import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'
import type { CurrentPlay, RoomPlayer } from '../../module_bindings/types'

interface PlayAreaProps {
  currentPlay: CurrentPlay | null
  players: RoomPlayer[]
}

/**
 * 翻译牌型名称为中文
 */
function translateCombinationType(type: string): string {
  const translations: Record<string, string> = {
    'Single': '单张',
    'Pair': '对子',
    'Triple': '三张',
    'TripleWithSingle': '三带一',
    'TripleWithPair': '三带二',
    'Straight': '顺子',
    'DoubleStraight': '连对',
    'TripleStraight': '飞机',
    'Airplane': '飞机',
    'AirplaneWithSingle': '飞机带单',
    'AirplaneWithPair': '飞机带对',
    'Bomb': '炸弹',
    'Rocket': '王炸',
    'FourWithTwo': '四带二',
  }
  return translations[type] || type
}

/**
 * 获取牌型的样式类名
 */
function getCombinationStyle(type: string): string {
  const styles: Record<string, string> = {
    'Bomb': 'text-orange-400 font-bold animate-pulse bomb-label',
    'Rocket': 'text-yellow-400 font-bold animate-pulse rocket-label',
    'Straight': 'text-blue-400 font-medium',
    'DoubleStraight': 'text-purple-400 font-medium',
    'TripleStraight': 'text-green-400 font-medium',
    'Airplane': 'text-green-400 font-medium',
    'AirplaneWithSingle': 'text-green-400 font-medium',
    'AirplaneWithPair': 'text-green-400 font-medium',
    'TripleWithSingle': 'text-orange-300',
    'TripleWithPair': 'text-orange-300',
    'FourWithTwo': 'text-pink-400',
  }
  return styles[type] || 'text-gray-400'
}

/**
 * 获取牌型的动画类名
 */
function getCombinationAnimation(type: string): string {
  const animations: Record<string, string> = {
    'Bomb': 'card-fly-explosive',
    'Rocket': 'card-fly-explosive',
    'Straight': 'card-fly-flow',
    'DoubleStraight': 'card-fly-flow',
    'TripleStraight': 'card-fly-arc',
    'Airplane': 'card-fly-arc',
    'AirplaneWithSingle': 'card-fly-arc',
    'AirplaneWithPair': 'card-fly-arc',
    'TripleWithSingle': 'card-fly-arc',
    'TripleWithPair': 'card-fly-arc',
  }
  return animations[type] || 'card-fly-simple'
}

export function PlayArea({ currentPlay, players }: PlayAreaProps) {
  const { isMobileLandscape, isMobileLandscapeSm } = useScreenOrientation()
  const isCompact = isMobileLandscape || isMobileLandscapeSm

  // 获取牌型样式和动画
  const combinationStyle = useMemo(() => {
    if (!currentPlay) return ''
    return getCombinationStyle(currentPlay.combinationType)
  }, [currentPlay])

  const animationClass = useMemo(() => {
    if (!currentPlay) return ''
    return getCombinationAnimation(currentPlay.combinationType)
  }, [currentPlay])

  if (!currentPlay) {
    return (
      <div className={`${isCompact ? 'w-32 h-16' : 'w-48 h-24'} bg-gray-800/50 rounded-lg flex items-center justify-center`}>
        <span className="text-gray-500 text-sm">等待出牌...</span>
      </div>
    )
  }

  const player = players.find(
    (p) => p.playerIdentity.toHexString() === currentPlay.playerIdentity.toHexString()
  )

  const cardsArray = Array.from(currentPlay.cards)
  const sortedCards = sortCards(cardsArray)
  const cardCount = sortedCards.length

  // 超过3张牌时使用重叠布局
  const useStackedLayout = cardCount > 3

  // 计算重叠时的偏移量
  // 桌面端：每张卡偏移约 24px，移动端横屏：约 18px
  const stackOffset = isCompact ? 18 : 24

  // 计算重叠布局的总宽度
  const stackedWidth = useStackedLayout
    ? `calc(var(--card-width) + ${(cardCount - 1) * stackOffset}px)`
    : undefined

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      {player && (
        <span className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-300`}>
          {player.playerName}
        </span>
      )}

      <div
        className={`relative ${animationClass} ${useStackedLayout ? '' : 'flex gap-1 flex-wrap justify-center max-w-xs'}`}
        style={useStackedLayout ? { width: stackedWidth, height: 'var(--card-height)' } : undefined}
      >
        {sortedCards.map((card, index) => (
          <div
            key={`${card}-${index}`}
            className="card-play-item"
            style={{
              animationDelay: `${index * 0.05}s`,
              ...(useStackedLayout ? {
                position: 'absolute',
                left: `${index * stackOffset}px`,
                top: 0,
                zIndex: index,
              } : {})
            }}
          >
            <CardDisplay card={card} />
          </div>
        ))}
      </div>

      <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} ${combinationStyle} combination-label`}>
        {translateCombinationType(currentPlay.combinationType)}
      </span>
    </div>
  )
}
