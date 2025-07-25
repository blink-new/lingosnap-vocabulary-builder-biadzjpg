import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { blink } from '../blink/client'

interface FloatingAddButtonProps {
  onWordAdded?: () => void
}

export default function FloatingAddButton({ onWordAdded }: FloatingAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  React.useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const detectLanguage = async (text: string) => {
    // Simple language detection - in a real app, you'd use a proper language detection service
    const commonSpanishWords = ['el', 'la', 'de', 'que', 'y', 'es', 'en', 'un', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al']
    const commonFrenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se']
    const commonGermanWords = ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als']
    
    const words = text.toLowerCase().split(/\s+/)
    
    let spanishCount = 0
    let frenchCount = 0
    let germanCount = 0
    
    words.forEach(word => {
      if (commonSpanishWords.includes(word)) spanishCount++
      if (commonFrenchWords.includes(word)) frenchCount++
      if (commonGermanWords.includes(word)) germanCount++
    })
    
    if (spanishCount > frenchCount && spanishCount > germanCount) return 'Spanish'
    if (frenchCount > spanishCount && frenchCount > germanCount) return 'French'
    if (germanCount > spanishCount && germanCount > frenchCount) return 'German'
    
    return 'English' // Default
  }

  const handleSave = async (saveType: 'words' | 'note') => {
    if (!inputText.trim() || !user) return

    setLoading(true)
    try {
      const detectedLanguage = await detectLanguage(inputText)
      
      if (saveType === 'words') {
        // Split into words and save each
        const words = inputText.trim().split(/\s+/).filter(word => word.length > 0)
        
        for (const word of words.slice(0, 3)) { // Max 3 words
          const cleanWord = word.replace(/[^\w\s]/g, '').trim()
          if (cleanWord) {
            // Generate definition using AI
            const { text: definition } = await blink.ai.generateText({
              prompt: `Provide a brief, clear definition for the word "${cleanWord}" in ${detectedLanguage}. Give 1-3 short translations or meanings, separated by commas.`,
              maxTokens: 50
            })

            await blink.db.vocabularyWords.create({
              id: `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: user.id,
              word: cleanWord,
              definition: definition.trim(),
              language: detectedLanguage.toLowerCase(),
              sourceType: 'manual',
              cefrLevel: 'A1', // Default level
              masteryStatus: 'New',
              isFavorite: false,
              saveCount: 1,
              boostScore: 0,
              lastSaved: new Date().toISOString()
            })
          }
        }
        
        // Show success message
        alert(`✓ ${Math.min(words.length, 3)} word(s) saved`)
      } else {
        // Save as note
        await blink.db.userNotes.create({
          id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          content: inputText.trim(),
          language: detectedLanguage
        })
        
        alert('✓ Note saved')
      }

      setInputText('')
      setIsOpen(false)
      onWordAdded?.()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isWord = inputText.trim().split(/\s+/).length <= 3
  const isNote = inputText.trim().length > 20 || inputText.trim().split(/\s+/).length > 3

  if (!user) return null

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-110 z-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-md mx-4 mb-0 animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick Add</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a word, phrase, or note..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                autoFocus
              />

              {inputText.trim() && (
                <div className="mt-4 space-y-2">
                  {isWord && (
                    <button
                      onClick={() => handleSave('words')}
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : `Save Word${inputText.trim().split(/\s+/).length > 1 ? 's' : ''}`}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleSave('note')}
                    disabled={loading}
                    className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save as Note'}
                  </button>
                </div>
              )}

              {inputText.trim() && (
                <p className="mt-2 text-xs text-gray-500">
                  {isWord 
                    ? `Will save ${Math.min(inputText.trim().split(/\s+/).length, 3)} word(s) with AI definitions`
                    : 'Will save as a personal note'
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}