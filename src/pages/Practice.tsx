import React, { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { ArrowLeft, Volume2, Target, BookOpen, Star, Trophy, Coins, Book } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { StoryMode } from '../components/StoryMode'

interface Word {
  id: string
  word: string
  definition: string
  context?: string
  cefrLevel: string
  masteryStatus: string
  isFavorite: boolean
  timesReviewed: number
}

interface UserProgress {
  totalXp: number
  currentLevel: number
  coins: number
  flashcardPracticesToday: number
  fillblankPracticesToday: number
}

export const Practice: React.FC = () => {
  const [user, setUser] = useState<any>(null)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [practiceMode, setPracticeMode] = useState<'menu' | 'flashcards' | 'fillblank'>('menu')
  const [words, setWords] = useState<Word[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, xpEarned: 0 })
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalXp: 0,
    currentLevel: 1,
    coins: 0,
    flashcardPracticesToday: 0,
    fillblankPracticesToday: 0
  })

  // Fill-in-the-blank specific state
  const [fillBlankData, setFillBlankData] = useState<{
    sentence: string
    targetWord: string
    context: string
    hints: string[]
    currentHintIndex: number
    userAnswer: string
    isCorrect: boolean | null
    xpReward: number
  } | null>(null)

  const loadUserSettings = async (userId: string) => {
    try {
      const settings = await blink.db.user_settings.list({
        where: { user_id: userId }
      })
      if (settings.length > 0) {
        setUserSettings(settings[0])
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }
  }

  const loadUserProgress = async (userId: string) => {
    try {
      let progress = await blink.db.user_progress.list({
        where: { user_id: userId },
        limit: 1
      })

      if (progress.length === 0) {
        const newProgress = await blink.db.user_progress.create({
          id: `progress_${userId}`,
          user_id: userId,
          total_xp: 0,
          current_level: 1,
          coins: 0,
          flashcard_practices_today: 0,
          fillblank_practices_today: 0,
          practice_streak: 0,
          last_practice_date: new Date().toISOString().split('T')[0]
        })
        progress = [newProgress]
      }

      setUserProgress({
        totalXp: progress[0].total_xp || 0,
        currentLevel: progress[0].current_level || 1,
        coins: progress[0].coins || 0,
        flashcardPracticesToday: progress[0].flashcard_practices_today || 0,
        fillblankPracticesToday: progress[0].fillblank_practices_today || 0
      })
    } catch (error) {
      console.error('Error loading user progress:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      if (state.user) {
        loadUserProgress(state.user.id)
        loadUserSettings(state.user.id)
      }
    })
    return unsubscribe
  }, [])

  const calculateNextReview = (difficulty: 'Hard' | 'Ok' | 'Easy') => {
    const now = new Date()
    let daysToAdd = 1

    switch (difficulty) {
      case 'Easy':
        daysToAdd = 7
        break
      case 'Ok':
        daysToAdd = 3
        break
      case 'Hard':
        daysToAdd = 1
        break
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()
  }

  const updateUserProgress = async (xpGained: number) => {
    if (!user) return

    const newTotalXp = userProgress.totalXp + xpGained
    const newLevel = Math.floor(newTotalXp / 500) + 1
    const leveledUp = newLevel > userProgress.currentLevel

    // Update database
    await blink.db.user_progress.update(`progress_${user.id}`, {
      total_xp: newTotalXp,
      current_level: newLevel,
      coins: userProgress.coins + (leveledUp ? 20 : 0)
    })

    // Update local state
    setUserProgress(prev => ({
      ...prev,
      totalXp: newTotalXp,
      currentLevel: newLevel,
      coins: prev.coins + (leveledUp ? 20 : 0)
    }))

    if (leveledUp) {
      alert(`🎉 Level Up! You reached Level ${newLevel} and earned 20 coins!`)
    }
  }

  const finishSession = async (sessionType: string, totalXp: number) => {
    if (!user) return

    // Update practice counts
    const updateField = sessionType === 'flashcards' ? 'flashcard_practices_today' : 'fillblank_practices_today'
    await blink.db.user_progress.update(`progress_${user.id}`, {
      [updateField]: userProgress[updateField === 'flashcard_practices_today' ? 'flashcardPracticesToday' : 'fillblankPracticesToday'] + 1
    })

    // Record practice session
    await blink.db.practice_sessions.create({
      id: `session_${Date.now()}`,
      user_id: user.id,
      session_type: sessionType,
      words_practiced: words.length,
      xp_earned: totalXp,
      created_at: new Date().toISOString()
    })

    alert(`Session complete! You earned ${totalXp} XP and practiced ${words.length} words.`)
    setPracticeMode('menu')
  }

  const generateFillBlankExercise = async () => {
    if (words.length === 0) return

    const randomWord = words[Math.floor(Math.random() * words.length)]
    
    try {
      const targetLanguage = userSettings?.target_language || 'Spanish'
      
      // Generate a contextual sentence with the word in the middle
      const { text: sentence } = await blink.ai.generateText({
        prompt: `Create a sentence in ${targetLanguage} where the word "${randomWord.word}" appears naturally in the middle (not at the beginning or end). The sentence should provide clear context for understanding the word's meaning. Make it appropriate for ${randomWord.cefrLevel} level learners.`,
        maxTokens: 100
      })

      // Generate context explanation
      const { text: context } = await blink.ai.generateText({
        prompt: `Provide a brief context explanation for this sentence: "${sentence}". Explain the situation or scenario in 1-2 sentences to help learners understand the setting.`,
        maxTokens: 80
      })

      // Create blanks with correct number of underscores
      const wordLength = randomWord.word.length
      const blanks = '_'.repeat(wordLength)
      const sentenceWithBlanks = sentence.replace(new RegExp(`\\b${randomWord.word}\\b`, 'gi'), blanks)

      // Generate progressive hints
      const hints = [
        `First letter: "${randomWord.word[0].toUpperCase()}" (${wordLength} letters)`,
        randomWord.definition,
        `Pattern: ${randomWord.word[0].toUpperCase()}${'_'.repeat(Math.max(0, wordLength - 2))}${wordLength > 1 ? randomWord.word[wordLength - 1].toUpperCase() : ''}`,
        `Context clue: This word relates to the main action or concept in the sentence.`
      ]

      setFillBlankData({
        sentence: sentenceWithBlanks,
        targetWord: randomWord.word,
        context: context.trim(),
        hints,
        currentHintIndex: -1,
        userAnswer: '',
        isCorrect: null,
        xpReward: 100
      })
    } catch (error) {
      console.error('Error generating fill-blank exercise:', error)
      alert('Error generating exercise. Please try again.')
    }
  }

  const loadPracticeWords = async () => {
    if (!user) return

    try {
      const allWords = await blink.db.vocabulary_words.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' }
      })

      // Implement spaced repetition logic
      const now = new Date()
      const practiceWords = allWords
        .filter(word => {
          // Include words that are due for review or favorites
          if (Number(word.is_favorite) > 0) return true
          if (!word.next_review_at) return true
          return new Date(word.next_review_at) <= now
        })
        .sort((a, b) => {
          // Prioritize favorites and words due for review
          if (Number(a.is_favorite) > 0 && Number(b.is_favorite) === 0) return -1
          if (Number(a.is_favorite) === 0 && Number(b.is_favorite) > 0) return 1
          return Math.random() - 0.5 // Shuffle
        })
        .slice(0, 10) // Take top 10 words

      setWords(practiceWords.map(word => ({
        id: word.id,
        word: word.word,
        definition: word.definition,
        context: word.context,
        cefrLevel: word.cefr_level || 'A1',
        masteryStatus: word.mastery_status || 'new',
        isFavorite: Number(word.is_favorite) > 0,
        timesReviewed: word.practice_count || 0
      })))
    } catch (error) {
      console.error('Error loading practice words:', error)
    }
  }

  const startFlashcards = async () => {
    // Check daily limit for free users
    if (userProgress.flashcardPracticesToday >= 10) {
      alert('Daily limit reached! Upgrade to Premium for unlimited practice.')
      return
    }

    await loadPracticeWords()
    setPracticeMode('flashcards')
    setCurrentWordIndex(0)
    setShowAnswer(false)
    setSessionStats({ correct: 0, total: 0, xpEarned: 0 })
  }

  const startFillBlank = async () => {
    // Check daily limit for free users
    if (userProgress.fillblankPracticesToday >= 10) {
      alert('Daily limit reached! Upgrade to Premium for unlimited practice.')
      return
    }

    await loadPracticeWords()
    if (words.length === 0) {
      alert('No words available for practice. Add some words first!')
      return
    }

    setPracticeMode('fillblank')
    await generateFillBlankExercise()
  }

  const handleFlashcardResponse = async (difficulty: 'Hard' | 'Ok' | 'Easy') => {
    const currentWord = words[currentWordIndex]
    let xpGained = 0
    let newMasteryStatus = currentWord.masteryStatus

    // Calculate XP and update mastery status
    switch (difficulty) {
      case 'Easy':
        xpGained = 20
        newMasteryStatus = 'mastered'
        break
      case 'Ok':
        xpGained = 15
        newMasteryStatus = 'learning'
        break
      case 'Hard':
        xpGained = 10
        newMasteryStatus = 'new'
        break
    }

    // Update word in database
    await blink.db.vocabulary_words.update(currentWord.id, {
      mastery_status: newMasteryStatus,
      practice_count: currentWord.timesReviewed + 1,
      last_practiced_at: new Date().toISOString(),
      next_review_at: calculateNextReview(difficulty)
    })

    // Update session stats
    setSessionStats(prev => ({
      correct: prev.correct + (difficulty !== 'Hard' ? 1 : 0),
      total: prev.total + 1,
      xpEarned: prev.xpEarned + xpGained
    }))

    // Move to next word or finish session
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setShowAnswer(false)
    } else {
      await finishSession('flashcards', sessionStats.xpEarned + xpGained)
    }
  }

  const handleFillBlankSubmit = async () => {
    if (!fillBlankData || !fillBlankData.userAnswer.trim()) return

    const isCorrect = fillBlankData.userAnswer.toLowerCase().trim() === fillBlankData.targetWord.toLowerCase()
    
    // Calculate XP based on hints used
    const hintsUsed = fillBlankData.currentHintIndex + 1
    const xpReward = Math.max(20, 100 - (hintsUsed * 20))

    setFillBlankData(prev => prev ? {
      ...prev,
      isCorrect,
      xpReward
    } : null)

    if (isCorrect) {
      // Update session stats and user progress
      await updateUserProgress(xpReward)
      setSessionStats(prev => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
        xpEarned: prev.xpEarned + xpReward
      }))
    } else {
      setSessionStats(prev => ({
        correct: prev.correct,
        total: prev.total + 1,
        xpEarned: prev.xpEarned
      }))
    }
  }

  const playPronunciation = async (word: string) => {
    try {
      const { url } = await blink.ai.generateSpeech({
        text: word,
        voice: 'nova'
      })
      const audio = new Audio(url)
      audio.play()
    } catch (error) {
      console.error('Error playing pronunciation:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading practice session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Target className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Hub</h2>
          <p className="text-gray-600 mb-6">Sign in to start practicing</p>
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

  // Practice Menu with Tabs
  if (practiceMode === 'menu') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Practice Hub</h1>
                <p className="text-gray-600">Practice now to level up!</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-amber-50 px-3 py-2 rounded-lg">
                  <Coins className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">{userProgress.coins}</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-indigo-600" />
                    <span className="font-bold text-lg text-indigo-600">Level {userProgress.currentLevel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <Tabs defaultValue="practice" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="practice">Practice Activities</TabsTrigger>
              <TabsTrigger value="story">📖 Story Mode (Beta)</TabsTrigger>
            </TabsList>

            <TabsContent value="practice" className="space-y-6">
              {/* Practice Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Flashcards */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-100 p-3 rounded-lg">
                        <BookOpen className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Flashcards</h3>
                        <p className="text-sm text-gray-600">Review vocabulary with spaced repetition</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Daily Progress</span>
                      <span>{userProgress.flashcardPracticesToday}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(userProgress.flashcardPracticesToday / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={startFlashcards}
                    disabled={userProgress.flashcardPracticesToday >= 10}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {userProgress.flashcardPracticesToday >= 10 ? 'Daily Limit Reached' : 'Start Flashcards'}
                  </button>
                </div>

                {/* Fill-in-the-Blank */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-100 p-3 rounded-lg">
                        <Target className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Smart Fill-in-the-Blank</h3>
                        <p className="text-sm text-gray-600">Context-based word practice with hints</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Daily Progress</span>
                      <span>{userProgress.fillblankPracticesToday}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(userProgress.fillblankPracticesToday / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={startFillBlank}
                    disabled={userProgress.fillblankPracticesToday >= 10}
                    className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {userProgress.fillblankPracticesToday >= 10 ? 'Daily Limit Reached' : 'Start Fill-in-the-Blank'}
                  </button>
                </div>
              </div>

              {/* Upgrade Notice */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900">Unlock Unlimited Practice</h3>
                    <p className="text-purple-700">Upgrade to Premium for unlimited daily practice sessions</p>
                  </div>
                  <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Upgrade Now
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="story">
              <StoryMode user={user} userSettings={userSettings} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Flashcard Practice (same as before)
  if (practiceMode === 'flashcards' && words.length > 0) {
    const currentWord = words[currentWordIndex]
    
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPracticeMode('menu')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-600">Card {currentWordIndex + 1} of {words.length}</p>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentWordIndex + 1) / words.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">XP: {sessionStats.xpEarned}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 min-h-[400px] flex flex-col justify-center">
            <div className="text-center">
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentWord.cefrLevel === 'A1' ? 'bg-green-100 text-green-700' :
                    currentWord.cefrLevel === 'A2' ? 'bg-blue-100 text-blue-700' :
                    currentWord.cefrLevel === 'B1' ? 'bg-yellow-100 text-yellow-700' :
                    currentWord.cefrLevel === 'B2' ? 'bg-orange-100 text-orange-700' :
                    currentWord.cefrLevel === 'C1' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {currentWord.cefrLevel}
                  </span>
                  {currentWord.isFavorite && (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  )}
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">{currentWord.word}</h2>
                <button
                  onClick={() => playPronunciation(currentWord.word)}
                  className="flex items-center space-x-2 mx-auto text-indigo-600 hover:text-indigo-700"
                >
                  <Volume2 className="h-5 w-5" />
                  <span>Play pronunciation</span>
                </button>
              </div>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Show Definition
                </button>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-lg text-gray-900">{currentWord.definition}</p>
                    {currentWord.context && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{currentWord.context}"</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-4">How well did you know this word?</p>
                    <div className="flex space-x-3 justify-center">
                      <button
                        onClick={() => handleFlashcardResponse('Hard')}
                        className="bg-red-100 text-red-700 px-6 py-3 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Hard
                      </button>
                      <button
                        onClick={() => handleFlashcardResponse('Ok')}
                        className="bg-yellow-100 text-yellow-700 px-6 py-3 rounded-lg hover:bg-yellow-200 transition-colors"
                      >
                        Ok
                      </button>
                      <button
                        onClick={() => handleFlashcardResponse('Easy')}
                        className="bg-green-100 text-green-700 px-6 py-3 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Easy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fill-in-the-Blank Practice (same as before but with updated field names)
  if (practiceMode === 'fillblank' && fillBlankData) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPracticeMode('menu')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-600">Fill-in-the-Blank</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">XP: {sessionStats.xpEarned}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Context */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Context:</h3>
              <p className="text-blue-800">{fillBlankData.context}</p>
            </div>

            {/* Sentence with blank */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Complete the sentence:</h3>
              <p className="text-lg text-gray-900 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {fillBlankData.sentence}
              </p>
            </div>

            {/* Answer input */}
            {fillBlankData.isCorrect === null && (
              <div className="mb-6">
                <input
                  type="text"
                  value={fillBlankData.userAnswer}
                  onChange={(e) => setFillBlankData(prev => prev ? { ...prev, userAnswer: e.target.value } : null)}
                  placeholder="Type your answer..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleFillBlankSubmit()}
                />
                <button
                  onClick={handleFillBlankSubmit}
                  disabled={!fillBlankData.userAnswer.trim()}
                  className="w-full mt-3 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Submit Answer
                </button>
              </div>
            )}

            {/* Result */}
            {fillBlankData.isCorrect !== null && (
              <div className={`mb-6 p-4 rounded-lg ${fillBlankData.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${fillBlankData.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {fillBlankData.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  </span>
                  <span className="text-sm text-gray-600">+{fillBlankData.xpReward} XP</span>
                </div>
                <p className={fillBlankData.isCorrect ? 'text-green-700' : 'text-red-700'}>
                  The correct answer is: <strong>{fillBlankData.targetWord}</strong>
                </p>
                <button
                  onClick={() => playPronunciation(fillBlankData.targetWord)}
                  className="flex items-center space-x-2 mt-2 text-indigo-600 hover:text-indigo-700"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>Play pronunciation</span>
                </button>
                
                <div className="mt-4 space-x-3">
                  <button
                    onClick={generateFillBlankExercise}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Next Exercise
                  </button>
                  <button
                    onClick={() => setPracticeMode('menu')}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Finish Session
                  </button>
                </div>
              </div>
            )}

            {/* Hints */}
            {fillBlankData.isCorrect === null && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Need a hint?</h4>
                  <span className="text-sm text-gray-500">
                    Potential XP: {Math.max(20, 100 - ((fillBlankData.currentHintIndex + 2) * 20))}
                  </span>
                </div>
                
                {fillBlankData.hints.slice(0, fillBlankData.currentHintIndex + 1).map((hint, index) => (
                  <div key={index} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800">
                      <strong>Hint {index + 1}:</strong> {hint}
                    </p>
                  </div>
                ))}
                
                {fillBlankData.currentHintIndex < fillBlankData.hints.length - 1 && (
                  <button
                    onClick={() => setFillBlankData(prev => prev ? { 
                      ...prev, 
                      currentHintIndex: prev.currentHintIndex + 1 
                    } : null)}
                    className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Get Hint ({fillBlankData.currentHintIndex + 2}/{fillBlankData.hints.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Target className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No words to practice</h2>
        <p className="text-gray-600 mb-6">Add some words to your library first</p>
        <button
          onClick={() => setPracticeMode('menu')}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Menu
        </button>
      </div>
    </div>
  )
}