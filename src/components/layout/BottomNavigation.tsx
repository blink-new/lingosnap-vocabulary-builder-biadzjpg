import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, BookOpen, Dumbbell, Settings } from 'lucide-react'

export default function BottomNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'discover', label: 'Discover', icon: Search, path: '/discover' },
    { id: 'library', label: 'Library', icon: BookOpen, path: '/library' },
    { id: 'practice', label: 'Practice', icon: Dumbbell, path: '/practice' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.path)
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                active 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-500'}`} />
              <span className={`text-xs mt-1 font-medium ${
                active ? 'text-indigo-600' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}