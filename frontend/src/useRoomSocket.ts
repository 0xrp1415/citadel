import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type {
  ConfirmationUpdatePayload,
  MessageUpdatePayload,
  RoomData,
  RoomMessage,
} from './rooms'

export interface RoomSocketState {
  room: RoomData | null
  connected: boolean
  error: string | null
  confirmation: ConfirmationUpdatePayload | null
}

export const EXPEL_MESSAGE = 'You have been expelled from this expedition.'

const FATAL_ERRORS = new Set([
  'Unauthorized',
  'Invalid token.',
  'Game room not found.',
  'Player not found in the game room.',
  'Player id mismatch.',
  'Server configuration error: ROOM_SECRET_KEY is not set.',
  EXPEL_MESSAGE,
])

export function isFatalRoomSocketError(message: string): boolean {
  return FATAL_ERRORS.has(message)
}

export function useRoomSocket(roomToken: string | null): RoomSocketState {
  const [state, setState] = useState<RoomSocketState>({
    room: null,
    connected: false,
    error: null,
    confirmation: null,
  })
  const socketRef = useRef<Socket | null>(null)
  const kickedRef = useRef(false)
  const confirmationRef = useRef<ConfirmationUpdatePayload | null>(null)
  const transcriptRef = useRef<{ messages: RoomMessage[]; resolverBusy: boolean }>({
    messages: [],
    resolverBusy: false,
  })

  useEffect(() => {
    if (!roomToken) return

    kickedRef.current = false
    confirmationRef.current = null
    transcriptRef.current = { messages: [], resolverBusy: false }
    const socket = io({ auth: { token: `Bearer ${roomToken}` } })
    socketRef.current = socket

    socket.on('connect', () => {
      setState((s) => ({ ...s, connected: true, error: null }))
    })

    socket.on('disconnect', (reason) => {
      setState((s) => {
        if (kickedRef.current) return { ...s, connected: false }
        return {
          ...s,
          connected: false,
          error: reason === 'io server disconnect' ? 'The record has been closed.' : s.error,
        }
      })
    })

    socket.on('game-room-update', (room: RoomData) => {
      setState((s) => ({
        ...s,
        room: {
          ...room,
          message: transcriptRef.current.messages,
          dungeonMasterState: transcriptRef.current.resolverBusy ? 'active' : 'idle',
        },
        confirmation: confirmationRef.current,
      }))
    })

    socket.on('message-update', (payload: MessageUpdatePayload) => {
      transcriptRef.current = {
        messages: payload.messages,
        resolverBusy: payload.resolverBusy,
      }
      setState((s) =>
        s.room
          ? {
              ...s,
              room: {
                ...s.room,
                message: payload.messages,
                dungeonMasterState: payload.resolverBusy ? 'active' : 'idle',
              },
            }
          : s,
      )
    })

    socket.on('confirmation-update', (payload: ConfirmationUpdatePayload | null) => {
      confirmationRef.current = payload
      setState((s) => ({ ...s, confirmation: payload }))
    })

    socket.on('connect_error', (err) => {
      setState((s) => ({ ...s, connected: false, error: err.message }))
    })

    socket.on('game-room-kicked', () => {
      kickedRef.current = true
      setState((s) => ({ ...s, connected: false, error: EXPEL_MESSAGE }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomToken])

  return state
}
