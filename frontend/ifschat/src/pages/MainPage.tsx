import { useEffect, useMemo, useState } from 'react'
import { redirect } from "react-router";
import { clearToken, getToken } from '../services/auth'
import ActiveUsersList, { type UserData } from '../components/ActiveUsersList';

export default function MainPage() {
  const token = useMemo(() => getToken(), [])
  const [me, setMe] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
    fetch(`${API_URL}/user/get_data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json())?.message || res.statusText)
        return res.json()
      })
      .then(setMe)
      .catch(() => {
        setError(null)
      })
  }, [token])

  const handleLogout = () => {
    clearToken()
    redirect('/login')
  }

  const handleSelectUser = (user: UserData) => {
    console.log('Selected user:', user)
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Welcome to the App</h1>
      <p>You are authenticated. Your token is stored in localStorage.</p>
      {me ? (
        <div style={{ marginTop: 8 }}>
          <strong>User:</strong> {me.username ?? me.id}
        </div>
      ) : error ? (
        <div style={{ color: 'crimson' }}>{error}</div>
      ) : null}
      <div style={{ marginTop: 24 }}>
        <button onClick={handleLogout}>Log out</button>
      </div>
      {/* Place your chat UI here; pass the token to your WS client */}
      <ActiveUsersList onSelectUser={handleSelectUser}/>
    </div>
  )
}