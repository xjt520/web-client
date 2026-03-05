import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { DbConnection } from '../lib/spacetime'
import type { Room, Game, PlayerHand, RoomPlayer, CurrentPlay, LandlordCards, Bid } from '../module_bindings/types'
import type { EventContext } from '../module_bindings'

interface GameState {
  rooms: Room[]
  activeRooms: Room[]  // 有效房间列表（排除已结束的房间）
  currentRoom: Room | null
  game: Game | null
  playerHand: PlayerHand | null
  players: RoomPlayer[]
  currentPlay: CurrentPlay | null
  landlordCards: LandlordCards | null
  bids: Bid[]
  gameStatus: string
}

export function useGame(getConnection: () => DbConnection | null): GameState {
  const [rooms, setRooms] = useState<Room[]>([])
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [playerHand, setPlayerHand] = useState<PlayerHand | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [currentPlay, setCurrentPlay] = useState<CurrentPlay | null>(null)
  const [landlordCards, setLandlordCards] = useState<LandlordCards | null>(null)
  const [bids, setBids] = useState<Bid[]>([])

  const processedRoomIds = useRef<Set<string>>(new Set())
  const processedPlayerIds = useRef<Set<string>>(new Set())
  const processedBidIds = useRef<Set<string>>(new Set())

  const conn = getConnection()

  useEffect(() => {
    if (!conn) return

    const db = conn.db

    db.room.onInsert((_ctx: EventContext, room: Room) => {
      const roomId = room.id.toString()
      if (processedRoomIds.current.has(roomId)) return
      processedRoomIds.current.add(roomId)
      setRooms((prev) => [...prev, room])
    })

    db.room.onDelete((_ctx: EventContext, room: Room) => {
      const roomId = room.id.toString()
      processedRoomIds.current.delete(roomId)
      setRooms((prev) => prev.filter((r) => r.id.toString() !== roomId))
      setCurrentRoom((prev) => (prev?.id.toString() === roomId ? null : prev))
    })

    db.room.onUpdate((_ctx: EventContext, oldRoom: Room, newRoom: Room) => {
      setRooms((prev) =>
        prev.map((r) => (r.id.toString() === oldRoom.id.toString() ? newRoom : r))
      )
      setCurrentRoom((prev) =>
        prev?.id.toString() === newRoom.id.toString() ? newRoom : prev
      )
    })

    db.room_player.onInsert((_ctx: EventContext, player: RoomPlayer) => {
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      if (processedPlayerIds.current.has(playerId)) return
      processedPlayerIds.current.add(playerId)
      setPlayers((prev) => [...prev, player])
    })

    db.room_player.onDelete((_ctx: EventContext, player: RoomPlayer) => {
      const playerId = `${player.roomId}-${player.playerIdentity.toHexString()}`
      processedPlayerIds.current.delete(playerId)
      setPlayers((prev) =>
        prev.filter(
          (p) =>
            `${p.roomId}-${p.playerIdentity.toHexString()}` !== playerId
        )
      )
    })

    db.room_player.onUpdate((_ctx: EventContext, oldPlayer: RoomPlayer, newPlayer: RoomPlayer) => {
      setPlayers((prev) =>
        prev.map((p) =>
          `${p.roomId}-${p.playerIdentity.toHexString()}` ===
          `${oldPlayer.roomId}-${oldPlayer.playerIdentity.toHexString()}`
            ? newPlayer
            : p
        )
      )
    })

    db.game.onInsert((_ctx: EventContext, g: Game) => {
      setGame(g)
    })

    db.game.onDelete((_ctx: EventContext, _g: Game) => {
      setGame(null)
    })

    db.game.onUpdate((_ctx: EventContext, _oldGame: Game, newGame: Game) => {
      setGame(newGame)
    })

    db.player_hand.onInsert((_ctx: EventContext, hand: PlayerHand) => {
      if (conn.identity && hand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setPlayerHand(hand)
      }
    })

    db.player_hand.onDelete((_ctx: EventContext, hand: PlayerHand) => {
      if (conn.identity && hand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setPlayerHand(null)
      }
    })

    db.player_hand.onUpdate((_ctx: EventContext, _oldHand: PlayerHand, newHand: PlayerHand) => {
      if (conn.identity && newHand.playerIdentity.toHexString() === conn.identity.toHexString()) {
        setPlayerHand(newHand)
      }
    })

    db.current_play.onInsert((_ctx: EventContext, play: CurrentPlay) => {
      setCurrentPlay(play)
    })

    db.current_play.onDelete((_ctx: EventContext, _play: CurrentPlay) => {
      setCurrentPlay(null)
    })

    db.current_play.onUpdate((_ctx: EventContext, _oldPlay: CurrentPlay, newPlay: CurrentPlay) => {
      setCurrentPlay(newPlay)
    })

    db.landlord_cards.onInsert((_ctx: EventContext, cards: LandlordCards) => {
      setLandlordCards(cards)
    })

    db.landlord_cards.onDelete((_ctx: EventContext, _cards: LandlordCards) => {
      setLandlordCards(null)
    })

    db.landlord_cards.onUpdate((_ctx: EventContext, _oldCards: LandlordCards, newCards: LandlordCards) => {
      setLandlordCards(newCards)
    })

    db.bid.onInsert((_ctx: EventContext, bid: Bid) => {
      const bidId = bid.id.toString()
      if (processedBidIds.current.has(bidId)) return
      processedBidIds.current.add(bidId)
      setBids((prev) => [...prev, bid])
    })

    db.bid.onDelete((_ctx: EventContext, bid: Bid) => {
      const bidId = bid.id.toString()
      processedBidIds.current.delete(bidId)
      setBids((prev) => prev.filter((b) => b.id.toString() !== bidId))
    })

    conn.subscriptionBuilder()
      .onApplied(() => {
        const initialRooms = Array.from(db.room.iter()) as unknown as Room[]
        const initialPlayers = Array.from(db.room_player.iter()) as unknown as RoomPlayer[]
        const initialGame = Array.from(db.game.iter()) as unknown as Game[]
        const initialHands = Array.from(db.player_hand.iter()) as unknown as PlayerHand[]
        const initialCurrentPlay = Array.from(db.current_play.iter()) as unknown as CurrentPlay[]
        const initialLandlordCards = Array.from(db.landlord_cards.iter()) as unknown as LandlordCards[]
        const initialBids = Array.from(db.bid.iter()) as unknown as Bid[]

        initialRooms.forEach((r) => processedRoomIds.current.add(r.id.toString()))
        initialPlayers.forEach((p) =>
          processedPlayerIds.current.add(`${p.roomId}-${p.playerIdentity.toHexString()}`)
        )
        initialBids.forEach((b) => processedBidIds.current.add(b.id.toString()))

        setRooms(initialRooms)
        setPlayers(initialPlayers)
        setGame(initialGame[0] || null)
        setBids(initialBids)

        if (conn.identity) {
          const myHand = initialHands.find(
            (h) => h.playerIdentity.toHexString() === conn.identity!.toHexString()
          )
          setPlayerHand(myHand || null)
        }

        setCurrentPlay(initialCurrentPlay[0] || null)
        setLandlordCards(initialLandlordCards[0] || null)
      })
      .subscribe([
        'SELECT * FROM room',
        'SELECT * FROM room_player',
        'SELECT * FROM game',
        'SELECT * FROM player_hand',
        'SELECT * FROM current_play',
        'SELECT * FROM landlord_cards',
        'SELECT * FROM bid',
      ])
  }, [conn])

  const findCurrentRoom = useCallback(() => {
    if (!conn?.identity) return null

    const myPlayer = players.find(
      (p) => p.playerIdentity.toHexString() === conn.identity!.toHexString()
    )

    if (!myPlayer) return null

    return rooms.find((r) => r.id.toString() === myPlayer.roomId.toString()) || null
  }, [conn, players, rooms])

  useEffect(() => {
    const room = findCurrentRoom()
    setCurrentRoom(room)
  }, [findCurrentRoom])

  const gameStatus = currentRoom?.status || 'waiting'

  // 过滤有效的房间列表（排除已结束的房间）
  const activeRooms = useMemo(() => {
    return rooms.filter(room => room.status !== 'finished')
  }, [rooms])

  return {
    rooms,
    activeRooms,
    currentRoom,
    game,
    playerHand,
    players,
    currentPlay,
    landlordCards,
    bids,
    gameStatus,
  }
}
