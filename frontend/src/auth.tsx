import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getMe, registerUser } from './api'
import type { User } from './api'

const TOKEN_KEY = 'citadel.token'
const USER_ID_KEY = 'citadel.userId'

function decodeIdFromToken(token: string): string | null {
  const payload = token.split('.')[0]
  if (!payload) return null
  try {
    return atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  } catch {
    return null
  }
}

type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setStatus('anonymous')
      return
    }

    getMe(token)
      .then((found) => {
        if (found) {
          setUser(found)
          setStatus('authenticated')
        } else {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_ID_KEY)
          setStatus('anonymous')
        }
      })
      .catch(() => setStatus('anonymous'))
  }, [])

  async function login(name: string) {
    const { user, token } = await registerUser(name)
    localStorage.setItem(TOKEN_KEY, token)
    const id = decodeIdFromToken(token)
    if (id) localStorage.setItem(USER_ID_KEY, id)
    setUser(user)
    setStatus('authenticated')
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_ID_KEY)
    setUser(null)
    setStatus('anonymous')
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
