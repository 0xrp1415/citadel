import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createUser, getUserById } from './api'
import type { User } from './api'

const STORAGE_KEY = 'citadel.userId'

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
    const userId = localStorage.getItem(STORAGE_KEY)
    if (!userId) {
      setStatus('anonymous')
      return
    }

    getUserById(userId)
      .then((found) => {
        if (found) {
          setUser(found)
          setStatus('authenticated')
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setStatus('anonymous')
        }
      })
      .catch(() => setStatus('anonymous'))
  }, [])

  async function login(name: string) {
    const created = await createUser(name)
    localStorage.setItem(STORAGE_KEY, created._id)
    setUser(created)
    setStatus('authenticated')
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
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
