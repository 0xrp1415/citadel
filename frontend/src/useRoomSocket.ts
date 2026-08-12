import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { RoomData } from './rooms'

export interface RoomSocketState {
  room: RoomData | null
  connected: boolean
  error: string | null
}

const FATAL_ERRORS = new Set([
  'Unauthorized',
  'Invalid token.',
  'Game room not found.',
  'Player not found in the game room.',
  'Player id mismatch.',
  'Server configuration error: ROOM_SECRET_KEY is not set.',
])

export function isFatalRoomSocketError(message: string): boolean {
  return FATAL_ERRORS.has(message)
}

export function useRoomSocket(roomToken: string | null): RoomSocketState {
  const [state, setState] = useState<RoomSocketState>({ room: null, connected: false, error: null })
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!roomToken) return

    const socket = io({ auth: { token: `Bearer ${roomToken}` } })
    socketRef.current = socket

    socket.on('connect', () => {
      setState((s) => ({ ...s, connected: true, error: null }))
    })

    socket.on('disconnect', (reason) => {
      setState((s) => ({
        ...s,
        connected: false,
        error: reason === 'io server disconnect' ? 'The record has been closed.' : s.error,
      }))
    })

    socket.on('game-room-update', (room: RoomData) => {
      setState((s) => ({ ...s, room }))
    })

    socket.on('connect_error', (err) => {
      setState((s) => ({ ...s, connected: false, error: err.message }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomToken])

  return state
}
