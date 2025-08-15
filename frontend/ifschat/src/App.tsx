import { Routes, Route, Navigate } from 'react-router'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import MainPage from './pages/MainPage'
import { getToken } from './services/auth'

function App() {
  const token = getToken()

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        }
      />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App