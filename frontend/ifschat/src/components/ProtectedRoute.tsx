import { Navigate, useLocation } from 'react-router'
import { getToken } from '../services/auth'
import type { ReactNode } from 'react'

type Props = { children: ReactNode }

export default function ProtectedRoute({ children }: Props) {
  const token = getToken()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}