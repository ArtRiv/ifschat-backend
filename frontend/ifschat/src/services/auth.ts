const ACCESS_TOKEN_KEY = 'access_token'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type AuthResponse = {
  access_token: string
}

export async function signIn(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const msg = await safeErrorMessage(res)
    throw new Error(msg || 'Failed to sign in')
  }
  const data = (await res.json()) as AuthResponse
  setToken(data.access_token)
  return data.access_token
}

export async function signUp(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const msg = await safeErrorMessage(res)
    throw new Error(msg || 'Failed to sign up')
  }
  const data = (await res.json()) as AuthResponse
  setToken(data.access_token)
  return data.access_token
}

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

async function safeErrorMessage(res: Response) {
  try {
    const body = await res.json()
    return body?.message || body?.error || res.statusText
  } catch {
    return res.statusText
  }
}