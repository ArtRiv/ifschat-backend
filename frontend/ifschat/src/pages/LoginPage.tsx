import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { signIn, signUp } from '../services/auth'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation() as any
  const redirectTo = location.state?.from?.pathname || '/app'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(username.trim(), password)
      } else {
        await signUp(username.trim(), password)
      }
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ marginBottom: 8 }}>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
        <p style={{ marginTop: 0, color: '#666' }}>
          {mode === 'signin' ? 'Welcome back! Enter your credentials.' : 'Create your account to get started.'}
        </p>
        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          {mode === 'signin' ? (
            <span>
              Don&apos;t have an account?{' '}
              <button style={styles.link} onClick={() => setMode('signup')} type="button">
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button style={styles.link} onClick={() => setMode('signin')} type="button">
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'linear-gradient(180deg, #f7f9fc, #eef2f7)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
  },
  form: {
    display: 'grid',
    gap: 12,
    marginTop: 12,
  },
  label: {
    display: 'grid',
    gap: 6,
    fontSize: 14,
  },
  input: {
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    outline: 'none',
  },
  button: {
    marginTop: 4,
    background: '#2563eb',
    color: '#fff',
    border: 0,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    cursor: 'pointer',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    fontSize: 14,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    padding: '8px 10px',
  },
}