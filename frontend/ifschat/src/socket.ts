import { io, Socket } from 'socket.io-client'

export interface ServerToClientEvents {
  foo: (value: string) => void
  // add more events your server emits here, e.g.:
  // chat: (data: { chatId: string }) => void
  // message: (m: { chatId: string; from: string; content: string }) => void
}

/**
 * Client -> Server events
 */
export interface ClientToServerEvents {
  'create-something': (value: string, ack: () => void) => void
  // add more emits here, e.g.:
  // joinChat: (payload: { chatId: string }) => void
  // startChat: (payload: { with: string }) => void
  // sendMessage: (payload: { chatId: string; content: string }) => void
}

const fallbackUrl = 'http://localhost:3000'
const fromEnv = (import.meta as any)?.env?.VITE_SOCKET_URL as string | undefined
const URL = import.meta.env.PROD ? fromEnv : fromEnv ?? fallbackUrl

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL, {
  autoConnect: false,
  transports: ['websocket'],
})

/** Optional: attach a JWT (or any auth payload) before connecting */
export function setAuthToken(token: string | null | undefined) {
  socket.auth = token ? { token } : {}
}

/** Convenience: set token and connect in one call */
export function connectWithToken(token?: string | null) {
  setAuthToken(token ?? null)
  socket.connect()
}