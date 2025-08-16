import React, { useEffect, useMemo, useState } from 'react'

export type UserData = {
  id: string
  username: string
  avatarUrl?: string | null
  chatMemberships: string[]
}

type Props = {
  title?: string
  autoRefreshMs?: number // e.g., 10000 to refresh every 10s
  onSelectUser?: (user: UserData) => void
}

export default function ActiveUsersList({ title = 'Active users', autoRefreshMs, onSelectUser }: Props) {
  const API_URL = useMemo(() => import.meta.env.VITE_API_URL ?? 'http://localhost:3000', [])
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null), [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/user/get_users_list`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
      if (!res.ok) {
        let msg = res.statusText
        try {
          const data = await res.json()
          msg = data?.message || msg
        } catch {}
        throw new Error(msg)
      }
      const data = (await res.json()) as UserData[]
      setUsers(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (!autoRefreshMs) return
    const id = setInterval(load, autoRefreshMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, autoRefreshMs])

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button onClick={load} style={styles.refreshBtn} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <ul style={styles.list}>
        {users.length === 0 && !loading ? <li style={styles.empty}>No active users</li> : null}
        {users.map((u) => (
          <li key={u.id} style={styles.item}>
            <button onClick={() => onSelectUser?.(u)} style={styles.itemBtn} title={`Chat with ${u.username}`}>
              <img
                alt={u.username}
                src={u.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u.username)}`}
                style={styles.avatar}
                onError={(e) => {
                  const el = e.target as HTMLImageElement
                  el.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u.username)}`
                }}
              />
              <span style={styles.name}>{u.username}</span>
              <span style={styles.badge}>online</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  refreshBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 8,
  },
  item: {
    margin: 0,
  },
  itemBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 6,
    border: '1px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
  },
  avatar: { width: 28, height: 28, borderRadius: '50%', border: '1px solid #e5e7eb' },
  name: { flex: 1, textAlign: 'left' },
  badge: {
    fontSize: 12,
    color: '#0a7b34',
    background: '#d1fae5',
    border: '1px solid #a7f3d0',
    padding: '2px 6px',
    borderRadius: 999,
  },
  empty: { padding: 8, color: '#6b7280' },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    padding: '8px 10px',
    margin: 8,
  },
}