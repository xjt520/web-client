import { useState, useEffect, useCallback } from 'react'
import type { DbConnection } from '../lib/spacetime'
import type { UserSettings } from '../module_bindings/types'
import type { EventContext } from '../module_bindings'

interface SettingsState {
  soundEnabled: boolean
  musicEnabled: boolean
  animationEnabled: boolean
  cardSortOrder: 'asc' | 'desc'
  isLoading: boolean
  updateSettings: (settings: Partial<{
    soundEnabled: boolean
    musicEnabled: boolean
    animationEnabled: boolean
    cardSortOrder: 'asc' | 'desc'
  }>) => Promise<void>
}

const DEFAULT_SETTINGS: UserSettings = {
  identity: null as any,
  soundEnabled: true,
  musicEnabled: true,
  animationEnabled: true,
  cardSortOrder: 'asc',
}

// 本地存储 key
const LOCAL_SETTINGS_KEY = 'doudizhu_settings'

export function useSettings(getConnection: () => DbConnection | null): SettingsState {
  // 优先从本地存储读取，确保即时响应
  const getLocalSettings = (): Partial<UserSettings> => {
    try {
      const stored = localStorage.getItem(LOCAL_SETTINGS_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      // 忽略
    }
    return {}
  }

  const localSettings = getLocalSettings()

  const [soundEnabled, setSoundEnabled] = useState(
    localSettings.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled
  )
  const [musicEnabled, setMusicEnabled] = useState(
    localSettings.musicEnabled ?? DEFAULT_SETTINGS.musicEnabled
  )
  const [animationEnabled, setAnimationEnabled] = useState(
    localSettings.animationEnabled ?? DEFAULT_SETTINGS.animationEnabled
  )
  const [cardSortOrder, setCardSortOrder] = useState<'asc' | 'desc'>(
    (localSettings.cardSortOrder as 'asc' | 'desc') ?? DEFAULT_SETTINGS.cardSortOrder as 'asc' | 'desc'
  )
  const [isLoading, setIsLoading] = useState(true)

  const conn = getConnection()

  // 保存到本地存储
  const saveToLocal = useCallback((settings: Partial<UserSettings>) => {
    try {
      const current = getLocalSettings()
      const merged = { ...current, ...settings }
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged))
    } catch (e) {
      // 忽略
    }
  }, [])

  // 监听服务器设置
  useEffect(() => {
    if (!conn) {
      setIsLoading(false)
      return
    }

    const db = conn.db

    db.user_settings.onInsert((_ctx: EventContext, s: UserSettings) => {
      if (!conn.identity) return
      if (s.identity.toHexString() === conn.identity.toHexString()) {
        setSoundEnabled(s.soundEnabled)
        setMusicEnabled(s.musicEnabled)
        setAnimationEnabled(s.animationEnabled)
        setCardSortOrder(s.cardSortOrder as 'asc' | 'desc')
        saveToLocal({
          soundEnabled: s.soundEnabled,
          musicEnabled: s.musicEnabled,
          animationEnabled: s.animationEnabled,
          cardSortOrder: s.cardSortOrder,
        })
      }
    })

    db.user_settings.onUpdate((_ctx: EventContext, _old: UserSettings, s: UserSettings) => {
      if (!conn.identity) return
      if (s.identity.toHexString() === conn.identity.toHexString()) {
        setSoundEnabled(s.soundEnabled)
        setMusicEnabled(s.musicEnabled)
        setAnimationEnabled(s.animationEnabled)
        setCardSortOrder(s.cardSortOrder as 'asc' | 'desc')
        saveToLocal({
          soundEnabled: s.soundEnabled,
          musicEnabled: s.musicEnabled,
          animationEnabled: s.animationEnabled,
          cardSortOrder: s.cardSortOrder,
        })
      }
    })

    conn.subscriptionBuilder()
      .onApplied(() => {
        if (!conn.identity) {
          setIsLoading(false)
          return
        }

        const identityHex = conn.identity.toHexString()
        const settings = Array.from(db.user_settings.iter()) as unknown as UserSettings[]
        const mySettings = settings.find(s => s.identity.toHexString() === identityHex)

        if (mySettings) {
          setSoundEnabled(mySettings.soundEnabled)
          setMusicEnabled(mySettings.musicEnabled)
          setAnimationEnabled(mySettings.animationEnabled)
          setCardSortOrder(mySettings.cardSortOrder as 'asc' | 'desc')
          saveToLocal({
            soundEnabled: mySettings.soundEnabled,
            musicEnabled: mySettings.musicEnabled,
            animationEnabled: mySettings.animationEnabled,
            cardSortOrder: mySettings.cardSortOrder,
          })
        }

        setIsLoading(false)
      })
      .subscribe([
        'SELECT * FROM user_settings',
      ])
  }, [conn, saveToLocal])

  const updateSettings = useCallback(async (settings: Partial<{
    soundEnabled: boolean
    musicEnabled: boolean
    animationEnabled: boolean
    cardSortOrder: 'asc' | 'desc'
  }>) => {
    // 立即更新本地状态
    if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled)
    if (settings.musicEnabled !== undefined) setMusicEnabled(settings.musicEnabled)
    if (settings.animationEnabled !== undefined) setAnimationEnabled(settings.animationEnabled)
    if (settings.cardSortOrder !== undefined) setCardSortOrder(settings.cardSortOrder)

    // 保存到本地存储
    saveToLocal(settings)

    // 同步到服务器
    if (conn) {
      try {
        conn.reducers.updateSettings({
          soundEnabled: settings.soundEnabled,
          musicEnabled: settings.musicEnabled,
          animationEnabled: settings.animationEnabled,
          cardSortOrder: settings.cardSortOrder,
        })
      } catch (e) {
        // 忽略错误，本地状态已更新
      }
    }
  }, [conn, saveToLocal])

  return {
    soundEnabled,
    musicEnabled,
    animationEnabled,
    cardSortOrder,
    isLoading,
    updateSettings,
  }
}
