import { useMemo } from 'react'
import { CardDisplay } from './CardDisplay'
import { sortCards } from '../../lib/gameUtils'
import type { RoomPlayer } from '../../module_bindings/types'
import type { PlayerHand as PlayerHandType } from '../../module_bindings/types'
import type { Bid } from '../../module_bindings/types'
import type { Doubling } from '../../module_bindings/types'
import type { Game } from '../../module_bindings/types'

interface PlayerData {
  playerName: string
  cards: Uint8Array
  isLandlord: boolean
  cardsCount: number
  isTrusted: boolean
  hasBid: boolean
  hasDoubled: boolean
  bidValue: number
}

interface SpectatorHandsProps {
  players: RoomPlayer[]
  allHands: PlayerHandType[]
  game: Game | null
  bids: Bid[]
  doublings: Doubling[]
}

export function SpectatorHands({
  players,
  allHands,
  game,
  bids,
  doublings,
}: SpectatorHandsProps) {
  // 按座位排序的正常玩家（非观战者）
  const normalPlayers = useMemo(() => {
    return players
      .filter((p) => !p.isSpectating && p.seatIndex < 100)
      .sort((a, b) => a.seatIndex - b.seatIndex)
  }, [players])

  // 按身份获取手牌数据
  const handsByPlayer = useMemo(() => {
    const map = new Map<string, PlayerData>()

    normalPlayers.forEach((player) => {
      const hand = allHands.find(
        (h) => h.playerIdentity.toHexString() === player.playerIdentity.toHexString()
      )
      const hasBid = bids.some(
        (b) => b.playerIdentity.toHexString() === player.playerIdentity.toHexString()
      )
      const bidValue = bids.find(
        (b) => b.playerIdentity.toHexString() === player.playerIdentity.toHexString()
      )?.bidValue ?? 0

      const hasDoubled = doublings.some(
        (d) => d.playerIdentity.toHexString() === player.playerIdentity.toHexString()
      )

      map.set(player.playerIdentity.toHexString(), {
        playerName: player.playerName,
        cards: hand?.cards || new Uint8Array(),
        isLandlord: hand?.isLandlord ?? false,
        cardsCount: hand?.cards.length ?? 0,
        isTrusted: player.isTrusted ?? false,
        hasBid,
        hasDoubled,
        bidValue,
      })
    })
    return map
  }, [players, allHands, normalPlayers, bids, doublings])

  // 获取当前回合的玩家
  const currentPlayer = useMemo(() => {
    if (!game) return null
    return normalPlayers.find((p) => p.seatIndex === game.currentTurn)
  }, [game, normalPlayers])

  // 获取当前加倍回合的玩家
  const currentDoublingPlayer = useMemo(() => {
    if (!game || game.currentDoublingTurn === null) return null
    return normalPlayers.find((p) => p.seatIndex === game.currentDoublingTurn)
  }, [game, normalPlayers])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {normalPlayers.map((player) => {
        const playerData = handsByPlayer.get(player.playerIdentity.toHexString())
        if (!playerData) return null

        const sortedCards = sortCards(Array.from(playerData.cards))
        const isCurrentPlayerTurn =
          currentPlayer?.playerIdentity.toHexString() === player.playerIdentity.toHexString()
        const isCurrentDoublingTurn =
          currentDoublingPlayer?.playerIdentity.toHexString() === player.playerIdentity.toHexString()

        return (
          <div
            key={player.playerIdentity.toHexString()}
            className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 rounded-lg"
          >
            {/* 玩家信息 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium">{player.playerName}</span>
              {playerData.isLandlord && (
                <span className="text-yellow-400">👑</span>
              )}
              {playerData.isTrusted && (
                <span className="text-orange-400 text-xs bg-orange-900/50 px-1.5 py-0.5 rounded">
                  托管
                </span>
              )}
            </div>

            {/* 角色标签 */}
            <div className="mb-1">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  playerData.isLandlord
                    ? 'bg-red-600/50 text-red-200'
                    : 'bg-green-600/50 text-green-200'
                }`}
              >
                {playerData.isLandlord ? '地主' : '农民'}
              </span>
            </div>

            {/* 手牌显示 */}
            <div className="flex flex-wrap justify-center gap-1">
              {sortedCards.map((card, i) => (
                <CardDisplay key={`${player.seatIndex}-${i}`} card={card} />
              ))}
            </div>

            {/* 当前回合指示 */}
            {isCurrentPlayerTurn && (
              <div className="mt-2 px-3 py-1 bg-yellow-500/30 text-yellow-300 rounded-lg text-sm text-center animate-pulse">
                当前回合
              </div>
            )}

            {/* 当前加倍指示 */}
            {isCurrentDoublingTurn && (
              <div className="mt-2 px-3 py-1 bg-orange-500/30 text-orange-300 rounded-lg text-sm text-center animate-pulse">
                等待加倍
              </div>
            )}

            {/* 叫地主状态 */}
            {playerData.hasBid && (
              <div className="mt-2 px-3 py-1 bg-blue-500/30 text-blue-300 rounded-lg text-sm text-center">
                {playerData.bidValue > 0 ? `${playerData.bidValue}分` : '不叫'}
              </div>
            )}

            {/* 加倍状态 */}
            {playerData.hasDoubled && (
              <div className="mt-2 px-3 py-1 bg-green-500/30 text-green-300 rounded-lg text-sm text-center">
                已加倍
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}