export interface User {
  name: string
  createdAt: string
}

export interface AuthResult {
  user: User
  token: string
}

export async function registerUser(name: string): Promise<AuthResult> {
  const res = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    throw new Error(`Register failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as AuthResult
}

export async function getMe(token: string): Promise<User | null> {
  const res = await fetch('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 || res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  const body = (await res.json()) as { user: User }
  return body.user
}
