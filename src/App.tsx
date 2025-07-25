import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Navigation } from './components/layout/Navigation'
import BottomNavigation from './components/layout/BottomNavigation'
import FloatingAddButton from './components/FloatingAddButton'
import Dashboard from './pages/Dashboard'
import { WordDiscovery } from './pages/WordDiscovery'
import { WordLibrary } from './pages/WordLibrary'
import { Practice } from './pages/Practice'
import { Settings } from './pages/Settings'
import { blink } from './blink/client'

function AppContent() {
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const showFloatingButton = location.pathname !== '/discover'

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">LS</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">LingoSnap</h1>
            <p className="text-gray-600">Loading your vocabulary journey...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xl">LS</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome to LingoSnap</h1>
            <p className="text-gray-600">
              Your interactive vocabulary builder. Discover words from screenshots, text, and links, 
              then master them with personalized practice.
            </p>
          </div>
          <button
            onClick={() => blink.auth.login()}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Sign In to Start Learning
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pb-16">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discover" element={<WordDiscovery />} />
          <Route path="/library" element={<WordLibrary />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <BottomNavigation />
      {showFloatingButton && <FloatingAddButton />}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App