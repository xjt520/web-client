import { useState, useEffect, useRef } from 'react'
import type { DbConnection } from '../lib/spacetime'
import type { UserProfile, User, UserSettings } from '../module_bindings/types'
import type { EventContext } from '../module_bindings'

interface UserProfileState {
  profile: UserProfile | null
  user: User | null
  settings: UserSettings | null
  isLoading: boolean
}

export function useUserProfile(getConnection: () => DbConnection | null): UserProfileState {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const processedProfileIds = useRef<Set<string>>(new Set())
  const processedUserIds = useRef<Set<string>>(new Set())
  const processedSettingsIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

  useEffect(() => {
    if (!conn) {
      setIsLoading(false)
      return
    }

    const db = conn.db

    // 监听 UserProfile 表
    db.user_profile.onInsert((_ctx: EventContext, p: UserProfile) => {
      const id = p.identity.toHexString()
      if (processedProfileIds.current.has(id)) return
      processedProfileIds.current.add(id)

      if (conn.identity && id === conn.identity.toHexString()) {
        setProfile(p)
      }
    })

    db.user_profile.onUpdate((_ctx: EventContext, _old: UserProfile, newProfile: UserProfile) => {
      if (conn.identity && newProfile.identity.toHexString() === conn.identity.toHexString()) {
        setProfile(newProfile)
      }
    })

    // 监听 User 表
    db.user.onInsert((_ctx: EventContext, u: User) => {
      const id = u.identity.toHexString()
      if (processedUserIds.current.has(id)) return
      processedUserIds.current.add(id)

      if (conn.identity && id === conn.identity.toHexString()) {
        setUser(u)
      }
    })

    db.user.onUpdate((_ctx: EventContext, _old: User, newUser: User) => {
      if (conn.identity && newUser.identity.toHexString() === conn.identity.toHexString()) {
        setUser(newUser)
      }
    })

    // 监听 UserSettings 表
    db.user_settings.onInsert((_ctx: EventContext, s: UserSettings) => {
      const id = s.identity.toHexString()
      if (processedSettingsIds.current.has(id)) return
      processedSettingsIds.current.add(id)

      if (conn.identity && id === conn.identity.toHexString()) {
        setSettings(s)
      }
    })

    db.user_settings.onUpdate((_ctx: EventContext, _old: UserSettings, newSettings: UserSettings) => {
      if (conn.identity && newSettings.identity.toHexString() === conn.identity.toHexString()) {
        setSettings(newSettings)
      }
    })

    // 订阅数据
    conn.subscriptionBuilder()
      .onApplied(() => {
        if (!conn.identity) {
          setIsLoading(false)
          return
        }

        const identityHex = conn.identity.toHexString()

        // 初始化 UserProfile
        const initialProfiles = Array.from(db.user_profile.iter()) as unknown as UserProfile[]
        const myProfile = initialProfiles.find(p => p.identity.toHexString() === identityHex)
        if (myProfile) {
          processedProfileIds.current.add(identityHex)
          setProfile(myProfile)
        }

        // 初始化 User
        const initialUsers = Array.from(db.user.iter()) as unknown as User[]
        const myUser = initialUsers.find(u => u.identity.toHexString() === identityHex)
        if (myUser) {
          processedUserIds.current.add(identityHex)
          setUser(myUser)
        }

        // 初始化 UserSettings
        const initialSettings = Array.from(db.user_settings.iter()) as unknown as UserSettings[]
        const mySettings = initialSettings.find(s => s.identity.toHexString() === identityHex)
        if (mySettings) {
          processedSettingsIds.current.add(identityHex)
          setSettings(mySettings)
        }

        setIsLoading(false)
      })
      .subscribe([
        'SELECT * FROM user_profile',
        'SELECT * FROM user',
        'SELECT * FROM user_settings',
      ])
  }, [conn])

  return {
    profile,
    user,
    settings,
    isLoading,
  }
}
