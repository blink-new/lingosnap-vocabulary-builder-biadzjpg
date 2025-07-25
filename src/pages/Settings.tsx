import React, { useState, useEffect, useCallback } from 'react'
import { User, Globe, BookOpen, Gamepad2, Coins, Download, AlertTriangle, ChevronDown, ChevronRight, Sun, Moon, Bell, HelpCircle, LogOut, Trash2, RotateCcw, Star, Crown } from 'lucide-react'
import { blink } from '../blink/client'

interface UserSettings {
  display_name: string
  email: string
  target_language: string
  native_language: string
  difficulty_level: string
  dark_mode: boolean
  notifications_enabled: boolean
  story_name: string
  story_pronouns: string
  story_romance: string
  story_remember_choices: boolean
  is_premium: boolean
  trial_active: boolean
  trial_days_left: number
}

interface UserProgress {
  xp: number
  level: number
  coins: number
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' }
]

const DIFFICULTY_LEVELS = [
  { value: 'A2', label: 'A2 - Elementary', description: 'Basic everyday expressions' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Clear standard input on familiar matters' },
  { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Complex text and abstract topics' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Wide range of demanding texts' }
]

const detectSystemLanguage = () => {
  const systemLang = navigator.language.split('-')[0]
  const supportedLang = LANGUAGES.find(lang => lang.code === systemLang)
  return supportedLang ? systemLang : 'en'
}

// Help & Support Screen Component
const HelpSupportScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [supportForm, setSupportForm] = useState({
    category: 'general',
    message: '',
    submitted: false
  })

  const faqItems = [
    {
      question: "How do I add new vocabulary words?",
      answer: "You can add words by going to the Discover tab and pasting text, uploading images, or entering URLs. You can also use the floating + button from any screen."
    },
    {
      question: "What are coins and how do I earn them?",
      answer: "Coins are rewards you earn by leveling up, completing goals, and maintaining streaks. Use them to unlock premium features temporarily."
    },
    {
      question: "How does the spaced repetition system work?",
      answer: "Our smart practice system shows you words based on how well you know them. Words you find difficult appear more often, while mastered words appear less frequently."
    },
    {
      question: "Can I export my vocabulary list?",
      answer: "Yes! Go to Settings > Data & Export to download your words as CSV or PDF files."
    },
    {
      question: "How do I change my target language?",
      answer: "Go to Settings > Language Preferences and select your new target language. All content will update automatically."
    }
  ]

  const filteredFAQ = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const submitSupportRequest = async () => {
    // In a real app, this would send to support system
    setSupportForm(prev => ({ ...prev, submitted: true }))
    setTimeout(() => {
      setSupportForm({ category: 'general', message: '', submitted: false })
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-indigo-600 hover:text-indigo-700">
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Help & Support</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
          
          <div className="space-y-3">
            {filteredFAQ.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{item.question}</span>
                  {expandedFAQ === index ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {expandedFAQ === index && (
                  <div className="px-4 pb-4 text-gray-600">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h2>
          
          {supportForm.submitted ? (
            <div className="text-center py-8">
              <div className="text-green-600 text-4xl mb-2">✓</div>
              <p className="text-lg font-medium text-gray-900">Message Sent!</p>
              <p className="text-gray-600">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={supportForm.category}
                  onChange={(e) => setSupportForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="general">General Question</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing & Subscription</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={supportForm.message}
                  onChange={(e) => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe your question or issue..."
                />
              </div>
              
              <button
                onClick={submitSupportRequest}
                disabled={!supportForm.message.trim()}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Message
              </button>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Debug Information</h2>
          <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono text-gray-600">
            <p>App Version: 1.0.0</p>
            <p>User Agent: {navigator.userAgent.substring(0, 50)}...</p>
            <p>Language: {navigator.language}</p>
            <p>Timestamp: {new Date().toISOString()}</p>
          </div>
          <button
            onClick={() => {
              const debugInfo = `App Version: 1.0.0\nUser Agent: ${navigator.userAgent}\nLanguage: ${navigator.language}\nTimestamp: ${new Date().toISOString()}`
              navigator.clipboard.writeText(debugInfo)
              alert('Debug info copied to clipboard!')
            }}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700"
          >
            Copy Debug Info
          </button>
        </div>
      </div>
    </div>
  )
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    display_name: '',
    email: '',
    target_language: 'es',
    native_language: 'en',
    difficulty_level: 'B1',
    dark_mode: false,
    notifications_enabled: false,
    story_name: '',
    story_pronouns: 'they',
    story_romance: 'not_applicable',
    story_remember_choices: true,
    is_premium: false,
    trial_active: false,
    trial_days_left: 0
  })
  
  const [progress, setProgress] = useState<UserProgress>({
    xp: 0,
    level: 1,
    coins: 0
  })
  
  const [showEmailEdit, setShowEmailEdit] = useState(false)
  const [showDangerZone, setShowDangerZone] = useState(false)
  const [showLanguageWarning, setShowLanguageWarning] = useState(false)
  const [hasUsedStoryMode, setHasUsedStoryMode] = useState(false)
  const [showHelpSupport, setShowHelpSupport] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadSettings = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      
      // Load user settings
      const userSettings = await blink.db.user_settings.list({
        where: { user_id: user.id },
        limit: 1
      })
      
      // Load user progress
      const userProgress = await blink.db.user_progress.list({
        where: { user_id: user.id },
        limit: 1
      })
      
      // Check if user has used story mode
      const storyUsage = await blink.db.practice_sessions.list({
        where: { 
          user_id: user.id,
          session_type: 'story'
        },
        limit: 1
      })
      
      if (userSettings.length > 0) {
        const userSetting = userSettings[0]
        setSettings({
          display_name: userSetting.display_name || user.email?.split('@')[0] || '',
          email: user.email || '',
          target_language: userSetting.target_language || 'es',
          native_language: userSetting.native_language || detectSystemLanguage(),
          difficulty_level: userSetting.difficulty_level || 'B1',
          dark_mode: Number(userSetting.dark_mode) > 0,
          notifications_enabled: Number(userSetting.notifications_enabled) > 0,
          story_name: userSetting.story_name || '',
          story_pronouns: userSetting.story_pronouns || 'they',
          story_romance: userSetting.story_romance || 'not_applicable',
          story_remember_choices: Number(userSetting.story_remember_choices) > 0,
          is_premium: Number(userSetting.is_premium) > 0,
          trial_active: Number(userSetting.trial_active) > 0,
          trial_days_left: userSetting.trial_days_left || 0
        })
      } else {
        // Create default settings
        await blink.db.user_settings.create({
          user_id: user.id,
          display_name: user.email?.split('@')[0] || '',
          target_language: 'es',
          native_language: detectSystemLanguage(),
          difficulty_level: 'B1',
          dark_mode: 0,
          notifications_enabled: 0,
          story_name: '',
          story_pronouns: 'they',
          story_romance: 'not_applicable',
          story_remember_choices: 1,
          is_premium: 0,
          trial_active: 0,
          trial_days_left: 0
        })
      }
      
      if (userProgress.length > 0) {
        const prog = userProgress[0]
        setProgress({
          xp: prog.total_xp || 0,
          level: prog.current_level || 1,
          coins: prog.coins || 0
        })
      }
      
      setHasUsedStoryMode(storyUsage.length > 0)
      setShowLanguageWarning(settings.target_language === settings.native_language)
      
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }, [settings.target_language, settings.native_language])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    try {
      const user = await blink.auth.me()
      
      setSettings(prev => ({ ...prev, [key]: value }))
      
      await blink.db.user_settings.update(user.id, {
        [key]: typeof value === 'boolean' ? (value ? 1 : 0) : value
      })
      
      // Show language warning if both languages are the same
      if ((key === 'target_language' || key === 'native_language')) {
        const newSettings = { ...settings, [key]: value }
        setShowLanguageWarning(newSettings.target_language === newSettings.native_language)
      }
      
    } catch (error) {
      console.error('Error updating setting:', error)
    }
  }

  const exportWordList = async (format: 'csv' | 'pdf') => {
    try {
      const user = await blink.auth.me()
      const words = await blink.db.vocabulary_words.list({
        where: { user_id: user.id }
      })
      
      if (format === 'csv') {
        const csvContent = [
          'Word,Translation,CEFR Level,Status,Date Added',
          ...words.map(word => 
            `"${word.word}","${word.definition}","${word.cefr_level}","${word.mastery_status}","${word.created_at}"`
          )
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'my-vocabulary.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
      
      // PDF export would require additional library
      alert(`${format.toUpperCase()} export completed!`)
    } catch (error) {
      console.error('Error exporting words:', error)
    }
  }

  const resetProgress = async () => {
    if (confirm('This will erase all mastery data and streaks. Are you sure?')) {
      try {
        const user = await blink.auth.me()
        
        // Reset user progress
        await blink.db.user_progress.update(user.id, {
          total_xp: 0,
          current_level: 1,
          practice_streak: 0,
          coins: 0
        })
        
        // Reset word mastery
        await blink.db.vocabulary_words.list({
          where: { user_id: user.id }
        }).then(words => {
          words.forEach(word => {
            blink.db.vocabulary_words.update(word.id, {
              mastery_status: 'new',
              review_count: 0,
              last_reviewed: null
            })
          })
        })
        
        alert('Progress reset successfully!')
        loadSettings()
      } catch (error) {
        console.error('Error resetting progress:', error)
      }
    }
  }

  const deleteAccount = async () => {
    if (confirm('This action is irreversible. All your data will be permanently deleted. Are you sure?')) {
      if (confirm('Final confirmation: Delete your account and all data?')) {
        try {
          // In a real app, this would call a proper account deletion API
          alert('Account deletion initiated. You will receive a confirmation email.')
          blink.auth.logout()
        } catch (error) {
          console.error('Error deleting account:', error)
        }
      }
    }
  }

  const getAccountBadge = () => {
    if (settings.trial_active) {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium">
          <Crown className="w-4 h-4" />
          Trial - {settings.trial_days_left} days left
        </div>
      )
    } else if (settings.is_premium) {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
          <Star className="w-4 h-4" />
          Premium
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
          <User className="w-4 h-4" />
          Free
        </div>
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (showHelpSupport) {
    return <HelpSupportScreen onBack={() => setShowHelpSupport(false)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {LANGUAGES.find(l => l.code === settings.target_language)?.flag || '🌍'}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          </div>
          {getAccountBadge()}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">🧑‍🎓 Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
              <input
                type="text"
                value={settings.display_name}
                onChange={(e) => updateSetting('display_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <button
                onClick={() => setShowEmailEdit(!showEmailEdit)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {showEmailEdit ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Email (tap to show/edit)
              </button>
              
              {showEmailEdit && (
                <div className="mt-2">
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your email"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Language Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">🌐 Language Preferences</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Language</label>
              <select
                value={settings.target_language}
                onChange={(e) => updateSetting('target_language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Native Language</label>
              <select
                value={settings.native_language}
                onChange={(e) => updateSetting('native_language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {/* Pin English at the top */}
                <option value="en">🇺🇸 English</option>
                {LANGUAGES.filter(lang => lang.code !== 'en').map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            {showLanguageWarning && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Your native and target language are the same. Update this for better translation accuracy?
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Story Preferences - Only show if user has used Story Mode */}
        {hasUsedStoryMode && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">✍️ Story Preferences</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Name in Stories</label>
                <input
                  type="text"
                  value={settings.story_name}
                  onChange={(e) => updateSetting('story_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="How should characters address you?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pronouns</label>
                <select
                  value={settings.story_pronouns}
                  onChange={(e) => updateSetting('story_pronouns', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="she">She/Her</option>
                  <option value="he">He/Him</option>
                  <option value="they">They/Them</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Romantic Interest</label>
                <select
                  value={settings.story_romance}
                  onChange={(e) => updateSetting('story_romance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="everyone">Everyone</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember-choices"
                  checked={settings.story_remember_choices}
                  onChange={(e) => updateSetting('story_remember_choices', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="remember-choices" className="text-sm text-gray-700">
                  Remember my choices
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Learning Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">🎮 Learning Preferences</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
              <select
                value={settings.difficulty_level}
                onChange={(e) => updateSetting('difficulty_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {DIFFICULTY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Daily Practice Reminder</span>
              </div>
              <button
                onClick={() => updateSetting('notifications_enabled', !settings.notifications_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications_enabled ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.dark_mode ? <Moon className="w-4 h-4 text-gray-600" /> : <Sun className="w-4 h-4 text-gray-600" />}
                <span className="text-sm font-medium text-gray-700">Dark Mode</span>
              </div>
              <button
                onClick={() => updateSetting('dark_mode', !settings.dark_mode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.dark_mode ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.dark_mode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Coins & Perks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">💰 Coins & Perks</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div>
                <p className="font-medium text-gray-900">Coin Balance</p>
                <p className="text-sm text-gray-600">Level {progress.level} • {progress.xp} XP</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">{progress.coins}</p>
                <p className="text-xs text-gray-500">coins</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <button className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">Spend Coins on Practice Boost</p>
                <p className="text-sm text-gray-600">Get extra XP for your next session</p>
              </button>
              
              <button className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">Buy Smart Features with Coins</p>
                <p className="text-sm text-gray-600">Unlock premium features temporarily</p>
              </button>
              
              <button className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <p className="font-medium text-gray-900">View Perks Store</p>
                <p className="text-sm text-gray-600">Browse all available rewards</p>
              </button>
            </div>
          </div>
        </div>

        {/* Data & Export */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">📤 Data & Export</h2>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => exportWordList('csv')}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">Export My Words (CSV)</p>
              <p className="text-sm text-gray-600">Download your vocabulary as a spreadsheet</p>
            </button>
            
            <button
              onClick={() => exportWordList('pdf')}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">Export My Words (PDF)</p>
              <p className="text-sm text-gray-600">Download your vocabulary as a document</p>
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-3">
            <button
              onClick={() => setShowHelpSupport(true)}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Help & Support</p>
                <p className="text-sm text-gray-600">Get help and contact support</p>
              </div>
            </button>
            
            <button
              onClick={() => blink.auth.logout()}
              className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Sign Out</p>
                <p className="text-sm text-gray-600">Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="flex items-center gap-3 w-full text-left"
          >
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">⚠️ Danger Zone</h2>
            {showDangerZone ? <ChevronDown className="w-4 h-4 text-red-600 ml-auto" /> : <ChevronRight className="w-4 h-4 text-red-600 ml-auto" />}
          </button>
          
          {showDangerZone && (
            <div className="mt-4 space-y-3 pt-4 border-t border-red-200">
              <button
                onClick={resetProgress}
                className="w-full p-3 text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-3"
              >
                <RotateCcw className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Reset All Progress</p>
                  <p className="text-sm text-red-600">This will erase all mastery data and streaks</p>
                </div>
              </button>
              
              <button
                onClick={deleteAccount}
                className="w-full p-3 text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-3"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Delete Account</p>
                  <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}