export interface User {
  _id: string
  name: string
  createdAt: string
}

interface ApiResponse<T> {
  data: T
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  const body = (await res.json()) as ApiResponse<T>
  return body.data
}

export function createUser(name: string): Promise<User> {
  return request<User>('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await request<User | null>(`/api/users/${id}`)
  return user ?? null
}
