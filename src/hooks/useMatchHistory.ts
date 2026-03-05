import { useState, useEffect, useRef } from 'react'
import type { DbConnection } from '../lib/spacetime'
import type { MatchRecord, ScoreHistory } from '../module_bindings/types'
import type { EventContext } from '../module_bindings'

interface MatchHistoryState {
  matchRecords: MatchRecord[]
  scoreHistory: ScoreHistory[]
  isLoading: boolean
}

const MAX_RECORDS = 30

export function useMatchHistory(getConnection: () => DbConnection | null): MatchHistoryState {
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([])
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const processedRecordIds = useRef<Set<string>>(new Set())
  const processedScoreIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

  useEffect(() => {
    if (!conn) {
      setIsLoading(false)
      return
    }

    const db = conn.db

    // 监听对局记录
    db.match_record.onInsert((_ctx: EventContext, record: MatchRecord) => {
      if (!conn.identity) return
      if (record.playerIdentity.toHexString() !== conn.identity.toHexString()) return

      const id = record.id.toString()
      if (processedRecordIds.current.has(id)) return
      processedRecordIds.current.add(id)

      setMatchRecords(prev => {
        const newRecords = [record, ...prev]
        return newRecords.slice(0, MAX_RECORDS)
      })
    })

    // 监听积分历史
    db.score_history.onInsert((_ctx: EventContext, history: ScoreHistory) => {
      if (!conn.identity) return
      if (history.playerIdentity.toHexString() !== conn.identity.toHexString()) return

      const id = history.id.toString()
      if (processedScoreIds.current.has(id)) return
      processedScoreIds.current.add(id)

      setScoreHistory(prev => {
        const newHistory = [history, ...prev]
        return newHistory.slice(0, MAX_RECORDS)
      })
    })

    conn.subscriptionBuilder()
      .onApplied(() => {
        if (!conn.identity) {
          setIsLoading(false)
          return
        }

        const identityHex = conn.identity.toHexString()

        // 初始化对局记录
        const initialRecords = Array.from(db.match_record.iter()) as unknown as MatchRecord[]
        const myRecords = initialRecords
          .filter(r => r.playerIdentity.toHexString() === identityHex)
          .sort((a, b) => Number(b.createdAt.microsSinceUnixEpoch) - Number(a.createdAt.microsSinceUnixEpoch))
          .slice(0, MAX_RECORDS)

        myRecords.forEach(r => processedRecordIds.current.add(r.id.toString()))
        setMatchRecords(myRecords)

        // 初始化积分历史
        const initialScores = Array.from(db.score_history.iter()) as unknown as ScoreHistory[]
        const myScores = initialScores
          .filter(s => s.playerIdentity.toHexString() === identityHex)
          .sort((a, b) => Number(b.createdAt.microsSinceUnixEpoch) - Number(a.createdAt.microsSinceUnixEpoch))
          .slice(0, MAX_RECORDS)

        myScores.forEach(s => processedScoreIds.current.add(s.id.toString()))
        setScoreHistory(myScores)

        setIsLoading(false)
      })
      .subscribe([
        'SELECT * FROM match_record',
        'SELECT * FROM score_history',
      ])
  }, [conn])

  return {
    matchRecords,
    scoreHistory,
    isLoading,
  }
}
