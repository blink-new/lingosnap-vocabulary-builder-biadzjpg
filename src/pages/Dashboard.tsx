import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { blink } from '../blink/client'
import { BookOpen, Target, Flame, TrendingUp, Plus, Star, Trophy, Coins } from 'lucide-react'

interface UserProgress {
  total_xp: number
  current_level: number
  coins: number
  practice_streak: number
  words_added_today: number
  daily_practice_count: number
}

interface DashboardStats {
  totalWords: number
  dueForReview: number
  masteryPercentage: number
  recentWords: Array<{
    id: string
    word: string
    definition: string
    cefr_level: string
    mastery_status: string
  }>
  weeklyProgress: number
  dailyGoal: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalWords: 0,
    dueForReview: 0,
    masteryPercentage: 0,
    recentWords: [],
    weeklyProgress: 0,
    dailyGoal: 10
  })
  const [userProgress, setUserProgress] = useState<UserProgress>({
    total_xp: 0,
    current_level: 1,
    coins: 0,
    practice_streak: 0,
    words_added_today: 0,
    daily_practice_count: 0
  })
  const [showFloatingButton, setShowFloatingButton] = useState(true)

  const loadDashboardData = async (userId: string) => {
    try {
      // Load vocabulary stats
      const words = await blink.db.vocabularyWords.list({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })

      // Calculate mastery percentage (words marked as 'Easy' in flashcards)
      const masteredWords = words.filter(word => word.masteryStatus === 'Mastered')
      const masteryPercentage = words.length > 0 ? Math.round((masteredWords.length / words.length) * 100) : 0

      // Get due for review (words that need practice based on spaced repetition)
      const now = new Date()
      const dueWords = words.filter(word => {
        if (!word.nextReviewAt) return true
        return new Date(word.nextReviewAt) <= now
      })

      // Get recent words (last 3)
      const recentWords = words.slice(0, 3).map(word => ({
        id: word.id,
        word: word.word,
        definition: word.definition.split(',')[0], // First definition only
        cefr_level: word.cefrLevel || 'A1',
        mastery_status: word.masteryStatus || 'New'
      }))

      // Load user progress
      let progress = await blink.db.userProgress.list({
        where: { userId },
        limit: 1
      })

      if (progress.length === 0) {
        // Create initial progress record
        const newProgress = await blink.db.userProgress.create({
          id: `progress_${userId}`,
          userId,
          totalXp: 0,
          currentLevel: 1,
          coins: 0,
          practiceStreak: 0,
          wordsAddedToday: 0,
          dailyPracticeCount: 0
        })
        progress = [newProgress]
      }

      // Load user settings for daily goal
      const settings = await blink.db.userSettings.list({
        where: { userId },
        limit: 1
      })

      const dailyGoal = settings.length > 0 ? settings[0].dailyGoal : 10

      // Calculate weekly progress (mock for now)
      const weeklyProgress = Math.min((words.length / 7) * 100, 100)

      setStats({
        totalWords: words.length,
        dueForReview: dueWords.length,
        masteryPercentage,
        recentWords,
        weeklyProgress,
        dailyGoal
      })

      setUserProgress({
        total_xp: progress[0].totalXp || 0,
        current_level: progress[0].currentLevel || 1,
        coins: progress[0].coins || 0,
        practice_streak: progress[0].practiceStreak || 0,
        words_added_today: progress[0].wordsAddedToday || 0,
        daily_practice_count: progress[0].dailyPracticeCount || 0
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      if (state.user) {
        loadDashboardData(state.user.id)
      }
    })
    return unsubscribe
  }, [])

  const getXpForNextLevel = (level: number) => level * 500
  const getXpProgress = () => {
    const currentLevelXp = (userProgress.current_level - 1) * 500
    const nextLevelXp = getXpForNextLevel(userProgress.current_level)
    const progressXp = userProgress.total_xp - currentLevelXp
    const neededXp = nextLevelXp - currentLevelXp
    return { progressXp, neededXp, percentage: (progressXp / neededXp) * 100 }
  }

  const getMotivationalMessage = () => {
    const { neededXp } = getXpProgress()
    const wordsNeeded = Math.max(0, 10 - userProgress.words_added_today)
    
    if (wordsNeeded > 0) {
      return `Add ${wordsNeeded} more words to earn bonus XP!`
    }
    return `Practice to get ${neededXp} more XP to level up!`
  }

  const getMasteryColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800'
      case 'Learning': return 'bg-yellow-100 text-yellow-800'
      case 'Mastered': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCefrColor = (level: string) => {
    const colors = {
      'A1': 'bg-green-100 text-green-700',
      'A2': 'bg-blue-100 text-blue-700',
      'B1': 'bg-yellow-100 text-yellow-700',
      'B2': 'bg-orange-100 text-orange-700',
      'C1': 'bg-red-100 text-red-700',
      'C2': 'bg-purple-100 text-purple-700'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your progress...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to LingoSnap</h2>
          <p className="text-gray-600 mb-6">Sign in to start building your vocabulary</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const xpProgress = getXpProgress()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with XP and Level */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
              <p className="text-gray-600">{getMotivationalMessage()}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-amber-50 px-3 py-2 rounded-lg">
                <Coins className="h-5 w-5 text-amber-600" />
                <span className="font-semibold text-amber-800">{userProgress.coins}</span>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-indigo-600" />
                  <span className="font-bold text-lg text-indigo-600">Level {userProgress.current_level}</span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(xpProgress.percentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {xpProgress.progressXp}/{xpProgress.neededXp} XP
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div 
            onClick={() => navigate('/library')}
            className="bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Words</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWords}</p>
              </div>
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </div>
          </div>

          <div 
            onClick={() => navigate('/practice')}
            className="bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due for Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.dueForReview}</p>
              </div>
              <Target className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          <div 
            onClick={() => navigate('/practice')}
            className="bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Practice Streak</p>
                <p className="text-2xl font-bold text-gray-900">{userProgress.practice_streak}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mastery Level</p>
                <p className="text-2xl font-bold text-gray-900">{stats.masteryPercentage}%</p>
              </div>
              <Star className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Weekly Goal Progress */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              🎯 Weekly Goal
            </h3>
            <span className="text-sm text-gray-500">{stats.totalWords}/{stats.dailyGoal * 7} words</span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${Math.min(stats.weeklyProgress, 100)}%` }}
              >
                <span className="text-xs text-white font-medium">
                  {Math.round(stats.weeklyProgress)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recently Added Words */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 
              onClick={() => navigate('/library')}
              className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
            >
              Recently Added Words
            </h3>
            <button 
              onClick={() => navigate('/library')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              See all
            </button>
          </div>
          
          {stats.recentWords.length > 0 ? (
            <div className="space-y-3">
              {stats.recentWords.map((word) => (
                <div key={word.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{word.word}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCefrColor(word.cefr_level)}`}>
                        {word.cefr_level}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMasteryColor(word.mastery_status)}`}>
                        {word.mastery_status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{word.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No words added yet</p>
              <button 
                onClick={() => navigate('/discover')}
                className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Add your first word
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/discover')}
            className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-6 w-6 mx-auto mb-2" />
            <span className="font-medium">Add Words</span>
          </button>
          
          <button 
            onClick={() => navigate('/practice')}
            className="bg-amber-600 text-white p-4 rounded-xl hover:bg-amber-700 transition-colors"
          >
            <TrendingUp className="h-6 w-6 mx-auto mb-2" />
            <span className="font-medium">Practice Now</span>
          </button>
        </div>
      </div>

      {/* Floating Add Button */}
      {showFloatingButton && (
        <button
          onClick={() => navigate('/discover')}
          className="fixed bottom-24 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-110 z-50"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}