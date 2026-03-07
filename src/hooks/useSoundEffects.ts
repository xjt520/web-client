import { useEffect, useCallback } from 'react'
import { soundManager } from '../lib/SoundManager'

interface UseSoundEffectsReturn {
  playCard: () => void
  playBomb: () => void
  playRocket: () => void
  playWin: () => void
  playLose: () => void
  playTick: () => void
  playBid: () => void
  playPass: () => void
  setEnabled: (enabled: boolean) => void
  initialize: () => void
}

/**
 * 音效 Hook
 * 提供游戏音效控制
 */
export function useSoundEffects(soundEnabled: boolean = true): UseSoundEffectsReturn {
  // 同步音效开关
  useEffect(() => {
    soundManager.setSoundEnabled(soundEnabled)
  }, [soundEnabled])

  const playCard = useCallback((cardValue?: number) => {
    if (cardValue !== undefined) {
      soundManager.playCardSound(cardValue)
    }
  }, [])

  const playBomb = useCallback(() => {
    soundManager.playBombSound()
  }, [])

  const playRocket = useCallback(() => {
    soundManager.playRocketSound()
  }, [])

  const playWin = useCallback(() => {
    soundManager.playWinSound()
  }, [])

  const playLose = useCallback(() => {
    soundManager.playLoseSound()
  }, [])

  const playTick = useCallback(() => {
    soundManager.playTickSound()
  }, [])

  const playBid = useCallback(() => {
    soundManager.playBidSound()
  }, [])

  const playPass = useCallback(() => {
    soundManager.playPassSound()
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    soundManager.setSoundEnabled(enabled)
  }, [])

  const initialize = useCallback(() => {
    soundManager.initialize()
  }, [])

  return {
    playCard,
    playBomb,
    playRocket,
    playWin,
    playLose,
    playTick,
    playBid,
    playPass,
    setEnabled,
    initialize,
  }
}
