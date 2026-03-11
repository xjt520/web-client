import { useMemo } from 'react'
import { CombinationType, COMBINATION_NAMES, validateCombination, canBeat } from '../../lib/combination'
import { useScreenOrientation } from '../../hooks/useScreenOrientation'

interface CombinationPreviewProps {
  selectedCards: Set<number>
  currentPlay: number[] | null
  isMyTurn: boolean
}

export function CombinationPreview({ selectedCards, currentPlay, isMyTurn }: CombinationPreviewProps) {
  const { isMobileLandscape, isCompactScreen } = useScreenOrientation()
  const isCompact = isMobileLandscape || isCompactScreen

  const preview = useMemo(() => {
    if (selectedCards.size === 0 || !isMyTurn) {
      return null
    }

    const cards = Array.from(selectedCards)
    const type = validateCombination(cards)
    const typeName = COMBINATION_NAMES[type] || '未知牌型'
    const isValid = type !== CombinationType.Invalid
    
    // 检查是否能打过当前出牌
    let canPlay = false
    let reason = ''
    
    if (!isValid) {
      reason = '无效牌型'
    } else if (currentPlay && currentPlay.length > 0) {
      canPlay = canBeat(cards, currentPlay)
      if (!canPlay) {
        reason = '打不过上家'
      }
    } else {
      // 自由出牌
      canPlay = true
    }

    return {
      typeName,
      isValid,
      canPlay,
      reason,
      cardCount: cards.length,
    }
  }, [selectedCards, currentPlay, isMyTurn])

  if (!preview) {
    return null
  }

  // 根据状态决定样式
  const getStatusStyle = () => {
    if (!preview.isValid) {
      return 'bg-red-900/80 border-red-500 text-red-300'
    }
    if (!preview.canPlay) {
      return 'bg-orange-900/80 border-orange-500 text-orange-300'
    }
    // 根据牌型决定颜色
    if (preview.typeName === '火箭') {
      return 'bg-gradient-to-r from-red-600 to-orange-500 border-yellow-400 text-white'
    }
    if (preview.typeName === '炸弹') {
      return 'bg-gradient-to-r from-purple-600 to-pink-500 border-purple-400 text-white'
    }
    return 'bg-green-900/80 border-green-500 text-green-300'
  }

  const getIcon = () => {
    if (!preview.isValid) return '❌'
    if (!preview.canPlay) return '⚠️'
    if (preview.typeName === '火箭') return '🚀'
    if (preview.typeName === '炸弹') return '💣'
    return '✓'
  }

  return (
    <div 
      className={`
        fixed left-1/2 -translate-x-1/2 z-40
        ${isCompact ? 'bottom-32' : 'bottom-36'}
        px-4 py-2 rounded-full border-2 shadow-lg
        flex items-center gap-2
        transition-all duration-200 animate-in fade-in slide-in-from-bottom-2
        ${getStatusStyle()}
      `}
    >
      <span className={`${isCompact ? 'text-base' : 'text-lg'}`}>
        {getIcon()}
      </span>
      <span className={`font-bold ${isCompact ? 'text-sm' : 'text-base'}`}>
        {preview.typeName}
      </span>
      <span className={`opacity-70 ${isCompact ? 'text-xs' : 'text-sm'}`}>
        ({preview.cardCount}张)
      </span>
      {preview.reason && (
        <span className={`ml-1 ${isCompact ? 'text-xs' : 'text-sm'} opacity-80`}>
          - {preview.reason}
        </span>
      )}
    </div>
  )
}
