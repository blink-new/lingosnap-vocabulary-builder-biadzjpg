import React, { useState, useEffect, useCallback } from 'react'
import { Upload, Link, Type, Wand2, Sparkles, Gift } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { blink } from '../blink/client'
import { VocabularyWord } from '../types/vocabulary'

const SECRET_CODES = {
  "#hackme": { xp: 100, coins: 50 },
  "!dragon": { xp: 500, coins: 0 },
  "//bonus100": { xp: 100, coins: 100 },
  "glitch.now": { xp: 200, coins: 200 },
  "LEVEL.UP": { xp: 300, coins: 150 }
}

const WORD_THEMES = [
  { id: 'travel', name: 'Travel & Tourism', icon: '✈️' },
  { id: 'food', name: 'Food & Cooking', icon: '🍳' },
  { id: 'business', name: 'Business & Work', icon: '💼' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'health', name: 'Health & Fitness', icon: '🏥' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'family', name: 'Family & Relationships', icon: '👨‍👩‍👧‍👦' },
  { id: 'hobbies', name: 'Hobbies & Interests', icon: '🎨' }
]

export const WordDiscovery: React.FC = () => {
  const [inputMethod, setInputMethod] = useState<'text' | 'url' | 'file'>('text')
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [processedText, setProcessedText] = useState('')
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSecretModal, setShowSecretModal] = useState(false)
  const [secretReward, setSecretReward] = useState<{xp: number, coins: number} | null>(null)
  const [showThemeGenerator, setShowThemeGenerator] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [user, setUser] = useState<any>(null)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [isPremium, setIsPremium] = useState(false)

  const loadUserSettings = useCallback(async () => {
    try {
      const settings = await blink.db.user_settings.list({
        where: { user_id: user?.id }
      })
      if (settings.length > 0) {
        setUserSettings(settings[0])
        setSelectedLevel(settings[0].difficulty_level || 'B1')
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }
  }, [user?.id])

  const updateUserProgress = async (xp: number, coins: number) => {
    try {
      const progress = await blink.db.user_progress.list({
        where: { user_id: user.id }
      })
      
      if (progress.length > 0) {
        const current = progress[0]
        await blink.db.user_progress.update(current.id, {
          total_xp: current.total_xp + xp,
          coins: current.coins + coins
        })
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadUserSettings()
      }
    })
    return unsubscribe
  }, [loadUserSettings])

  const checkSecretCode = (input: string) => {
    const cleanInput = input.trim().toLowerCase()
    const usedCodes = JSON.parse(localStorage.getItem('usedSecretCodes') || '[]')
    
    if (SECRET_CODES[cleanInput as keyof typeof SECRET_CODES]) {
      if (usedCodes.includes(cleanInput)) {
        // Show toast for already used code
        return false
      }
      
      const reward = SECRET_CODES[cleanInput as keyof typeof SECRET_CODES]
      setSecretReward(reward)
      setShowSecretModal(true)
      
      // Mark code as used
      usedCodes.push(cleanInput)
      localStorage.setItem('usedSecretCodes', JSON.stringify(usedCodes))
      
      // Award XP and coins
      updateUserProgress(reward.xp, reward.coins)
      
      return true
    }
    return false
  }

  const generateThemeWords = async () => {
    if (!selectedTheme || !selectedLevel) return
    
    setIsProcessing(true)
    try {
      const theme = WORD_THEMES.find(t => t.id === selectedTheme)
      const targetLanguage = userSettings?.target_language || 'Spanish'
      
      const { text } = await blink.ai.generateText({
        prompt: `Generate a list of 15-20 essential ${theme?.name} vocabulary words in ${targetLanguage} for ${selectedLevel} level learners. Format as a simple paragraph with words separated by spaces, like a natural text passage about ${theme?.name.toLowerCase()}.`,
        maxTokens: 300
      })
      
      setProcessedText(text)
      setShowThemeGenerator(false)
    } catch (error) {
      console.error('Error generating theme words:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const processText = async () => {
    if (checkSecretCode(textInput)) {
      setTextInput('')
      return
    }
    
    setIsProcessing(true)
    try {
      // Clean up the text by removing extra spaces and normalizing
      const cleanedText = textInput
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n\n') // Preserve paragraph breaks
        .trim()
      
      setProcessedText(cleanedText)
      setSelectedWords(new Set())
    } catch (error) {
      console.error('Error processing text:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const processUrl = async () => {
    if (!isPremium) {
      // Show premium upgrade modal
      return
    }
    
    setIsProcessing(true)
    try {
      const { markdown } = await blink.data.scrape(urlInput)
      
      // Extract main content and clean it
      const lines = markdown.split('\n')
      const contentLines = lines.filter(line => {
        const lower = line.toLowerCase()
        return !lower.includes('subscribe') &&
               !lower.includes('learn more') &&
               !lower.includes('click here') &&
               !lower.includes('utm_') &&
               !lower.startsWith('![') && // Remove image alt text
               line.trim().length > 10 // Remove short UI elements
      })
      
      const cleanedText = contentLines
        .join('\n')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
      
      setProcessedText(cleanedText)
      setSelectedWords(new Set())
    } catch (error) {
      console.error('Error processing URL:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const processFiles = async () => {
    if (!isPremium) {
      // Show premium upgrade modal
      return
    }
    
    if (files.length === 0) return
    
    setIsProcessing(true)
    try {
      let allText = ''
      
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          // Upload to storage first
          const { publicUrl } = await blink.storage.upload(file, `temp/${file.name}`)
          
          // Extract text from image
          const extractedText = await blink.data.extractFromUrl(publicUrl)
          allText += extractedText + '\n\n'
        } else {
          // Extract text from document
          const extractedText = await blink.data.extractFromBlob(file)
          allText += extractedText + '\n\n'
        }
      }
      
      // Clean up extracted text
      const cleanedText = allText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
      
      setProcessedText(cleanedText)
      setSelectedWords(new Set())
    } catch (error) {
      console.error('Error processing files:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleWordSelection = (word: string) => {
    const cleanWord = word.trim().replace(/[.,!?;:"()]/g, '')
    if (!cleanWord) return
    
    const newSelected = new Set(selectedWords)
    if (newSelected.has(cleanWord)) {
      newSelected.delete(cleanWord)
    } else {
      newSelected.add(cleanWord)
    }
    setSelectedWords(newSelected)
  }

  const saveSelectedWords = async () => {
    if (selectedWords.size === 0) return
    
    setIsProcessing(true)
    try {
      const wordsArray = Array.from(selectedWords)
      const targetLanguage = userSettings?.target_language || 'Spanish'
      
      for (const word of wordsArray) {
        // Generate definition and CEFR level
        const { text: definition } = await blink.ai.generateText({
          prompt: `Provide a concise definition for the ${targetLanguage} word "${word}" in English. Include 1-2 direct translations separated by commas.`,
          maxTokens: 50
        })
        
        const { text: cefrLevel } = await blink.ai.generateText({
          prompt: `What CEFR level (A1, A2, B1, B2, C1, C2) is the ${targetLanguage} word "${word}"? Respond with just the level.`,
          maxTokens: 10
        })
        
        await blink.db.vocabulary_words.create({
          id: `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user.id,
          word: word,
          definition: definition.trim(),
          language: targetLanguage.toLowerCase(),
          cefr_level: cefrLevel.trim().toUpperCase() || 'B1',
          mastery_status: 'new',
          is_favorite: false,
          practice_count: 0,
          created_at: new Date().toISOString()
        })
      }
      
      // Award XP for adding words
      if (wordsArray.length >= 10) {
        await updateUserProgress(100, 20) // Bonus for adding 10+ words
      }
      
      setSelectedWords(new Set())
      setProcessedText('')
      setTextInput('')
      setUrlInput('')
      setFiles([])
      
    } catch (error) {
      console.error('Error saving words:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const renderProcessedText = () => {
    if (!processedText) return null
    
    const words = processedText.split(/(\s+)/)
    
    return (
      <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
        <div className="whitespace-pre-wrap break-words leading-relaxed">
          {words.map((segment, index) => {
            if (/^\s+$/.test(segment)) {
              return <span key={index}>{segment}</span>
            }
            
            const cleanWord = segment.trim().replace(/[.,!?;:"()]/g, '')
            if (!cleanWord) {
              return <span key={index}>{segment}</span>
            }
            
            const isSelected = selectedWords.has(cleanWord)
            
            return (
              <span
                key={index}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-200 text-indigo-900 font-medium'
                    : 'hover:bg-indigo-100'
                }`}
                onClick={() => toggleWordSelection(cleanWord)}
              >
                {segment}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-gray-600">Sign in to start discovering vocabulary</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Discover Words</h1>
        <p className="text-gray-600">Add vocabulary from text, URLs, or images</p>
      </div>

      {/* Input Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all ${inputMethod === 'text' ? 'ring-2 ring-indigo-500' : ''}`}
          onClick={() => setInputMethod('text')}
        >
          <CardHeader className="text-center pb-2">
            <Type className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
            <CardTitle className="text-sm">Text Input</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-xs text-gray-600">Paste or type text</p>
            <Badge variant="secondary" className="mt-2">Free</Badge>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${inputMethod === 'url' ? 'ring-2 ring-indigo-500' : ''} ${!isPremium ? 'opacity-60' : ''}`}
          onClick={() => isPremium && setInputMethod('url')}
        >
          <CardHeader className="text-center pb-2">
            <Link className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
            <CardTitle className="text-sm">URL Extract</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-xs text-gray-600">Extract from websites</p>
            <Badge variant="outline" className="mt-2">Premium</Badge>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${inputMethod === 'file' ? 'ring-2 ring-indigo-500' : ''} ${!isPremium ? 'opacity-60' : ''}`}
          onClick={() => isPremium && setInputMethod('file')}
        >
          <CardHeader className="text-center pb-2">
            <Upload className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
            <CardTitle className="text-sm">File Upload</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-xs text-gray-600">Images & documents</p>
            <Badge variant="outline" className="mt-2">Premium</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Input Interface */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {inputMethod === 'text' && (
            <div className="space-y-4">
              <Textarea
                placeholder="Paste your text here or try a secret code..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={processText}
                  disabled={!textInput.trim() || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Processing...' : 'Process Text'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowThemeGenerator(true)}
                  className="flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate Words
                </Button>
              </div>
            </div>
          )}

          {inputMethod === 'url' && (
            <div className="space-y-4">
              <Input
                placeholder="Enter website URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button 
                onClick={processUrl}
                disabled={!urlInput.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Extracting...' : 'Extract Content'}
              </Button>
            </div>
          )}

          {inputMethod === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drop up to 10 images or documents here
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Choose Files
                  </Button>
                </label>
              </div>
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected files:</p>
                  {files.map((file, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
              <Button 
                onClick={processFiles}
                disabled={files.length === 0 || isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Process Files'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Text */}
      {processedText && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Words to Save</span>
              <Badge variant="secondary">{selectedWords.size} selected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderProcessedText()}
            <div className="mt-4 flex gap-2">
              <Button 
                onClick={saveSelectedWords}
                disabled={selectedWords.size === 0 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Saving...' : `Save ${selectedWords.size} Words`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedWords(new Set())
                  setProcessedText('')
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secret Code Modal */}
      <Dialog open={showSecretModal} onOpenChange={setShowSecretModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🕵️ Secret Access Granted
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <Sparkles className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <p className="text-lg font-semibold mb-2">
              You unlocked: +{secretReward?.xp} XP and +{secretReward?.coins} coins!
            </p>
            <Button onClick={() => setShowSecretModal(false)}>
              Collect Reward
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Theme Generator Modal */}
      <Dialog open={showThemeGenerator} onOpenChange={setShowThemeGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Theme-Based Words</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Choose Theme</label>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {WORD_THEMES.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.icon} {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Language Level</label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A1">A1 - Beginner</SelectItem>
                  <SelectItem value="A2">A2 - Elementary</SelectItem>
                  <SelectItem value="B1">B1 - Intermediate</SelectItem>
                  <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                  <SelectItem value="C1">C1 - Advanced</SelectItem>
                  <SelectItem value="C2">C2 - Proficient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={generateThemeWords}
                disabled={!selectedTheme || !selectedLevel || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Generating...' : 'Generate Words'}
              </Button>
              <Button variant="outline" onClick={() => setShowThemeGenerator(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}