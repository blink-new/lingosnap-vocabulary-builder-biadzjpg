import React, { useState, useEffect, useCallback } from 'react'
import { Book, Play, RotateCcw, ArrowRight, Volume2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { blink } from '../blink/client'

const STORY_GENRES = [
  { id: 'sci-fi', name: 'Sci-fi Mystery', description: 'Stranger Things, Black Mirror', icon: '🛸' },
  { id: 'drama', name: 'Chick-flick Drama', description: 'Emily in Paris, Desperate Housewives', icon: '💄' },
  { id: 'romance', name: 'Romantic Time Travel', description: 'Marry My Husband, Lovely Runner', icon: '💕' },
  { id: 'mystery', name: 'Murder Mystery', description: 'Sherlock Holmes, Agatha Christie', icon: '🔍' },
  { id: 'survival', name: 'Survival / Horror', description: 'The Walking Dead, Dead City', icon: '🧟' }
]

interface StoryScene {
  id: string
  content: string
  choices: { id: string; text: string; nextScene?: string }[]
  vocabularyWords: string[]
}

interface StoryModeProps {
  user: any
  userSettings: any
}

export const StoryMode: React.FC<StoryModeProps> = ({ user, userSettings }) => {
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(userSettings?.difficulty_level || 'B1')
  const [showLevelConfirm, setShowLevelConfirm] = useState(false)
  const [tempLevel, setTempLevel] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStory, setCurrentStory] = useState<StoryScene[]>([])
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [storyComplete, setStoryComplete] = useState(false)
  const [usedVocabulary, setUsedVocabulary] = useState<string[]>([])
  const [userWords, setUserWords] = useState<any[]>([])

  const loadUserWords = useCallback(async () => {
    try {
      const words = await blink.db.vocabulary_words.list({
        where: { user_id: user.id },
        limit: 10,
        orderBy: { created_at: 'desc' }
      })
      setUserWords(words)
    } catch (error) {
      console.error('Error loading user words:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadUserWords()
    }
  }, [user, loadUserWords])

  const handleLevelChange = (newLevel: string) => {
    if (newLevel !== selectedLevel) {
      setTempLevel(newLevel)
      setShowLevelConfirm(true)
    }
  }

  const confirmLevelChange = () => {
    setSelectedLevel(tempLevel)
    setShowLevelConfirm(false)
  }

  const generateStory = async () => {
    if (!selectedGenre || !selectedLevel) return
    
    setIsGenerating(true)
    try {
      const genre = STORY_GENRES.find(g => g.id === selectedGenre)
      const targetLanguage = userSettings?.target_language || 'Spanish'
      const vocabularyList = userWords.slice(0, 5).map(w => w.word).join(', ')
      
      const { text } = await blink.ai.generateText({
        prompt: `Create an interactive ${genre?.name} story in ${targetLanguage} for ${selectedLevel} level learners. 

Requirements:
- Write exactly 3 scenes with 2 choices each
- Use these vocabulary words naturally: ${vocabularyList}
- Match ${selectedLevel} grammar complexity
- Follow ${genre?.description} style and tone
- Each scene should be 2-3 sentences
- Format as JSON with this structure:
{
  "scenes": [
    {
      "id": "scene1",
      "content": "Story text here...",
      "choices": [
        {"id": "choice1", "text": "Choice 1", "nextScene": "scene2a"},
        {"id": "choice2", "text": "Choice 2", "nextScene": "scene2b"}
      ],
      "vocabularyWords": ["word1", "word2"]
    }
  ]
}`,
        maxTokens: 800
      })
      
      // Parse the generated story
      try {
        const storyData = JSON.parse(text)
        setCurrentStory(storyData.scenes || [])
        setCurrentSceneIndex(0)
        setStoryComplete(false)
        
        // Collect all vocabulary words used
        const allVocab = storyData.scenes?.flatMap((scene: any) => scene.vocabularyWords || []) || []
        setUsedVocabulary(allVocab)
      } catch (parseError) {
        console.error('Error parsing story:', parseError)
        // Fallback: create a simple story structure
        setCurrentStory([
          {
            id: 'scene1',
            content: text.substring(0, 200) + '...',
            choices: [
              { id: 'choice1', text: 'Continue exploring', nextScene: 'scene2' },
              { id: 'choice2', text: 'Turn back', nextScene: 'scene2' }
            ],
            vocabularyWords: vocabularyList.split(', ').slice(0, 2)
          }
        ])
      }
    } catch (error) {
      console.error('Error generating story:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const makeChoice = (choiceId: string) => {
    const currentScene = currentStory[currentSceneIndex]
    const choice = currentScene.choices.find(c => c.id === choiceId)
    
    if (choice?.nextScene) {
      const nextSceneIndex = currentStory.findIndex(s => s.id === choice.nextScene)
      if (nextSceneIndex !== -1) {
        setCurrentSceneIndex(nextSceneIndex)
      } else {
        // Story complete
        setStoryComplete(true)
      }
    } else {
      // No next scene, story complete
      setStoryComplete(true)
    }
  }

  const resetStory = () => {
    setCurrentStory([])
    setCurrentSceneIndex(0)
    setStoryComplete(false)
    setUsedVocabulary([])
    setSelectedGenre('')
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

  const currentScene = currentStory[currentSceneIndex]

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Book className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">📖 Story Mode</h2>
          <Badge variant="outline" className="text-xs">Beta</Badge>
        </div>
        <p className="text-gray-600">Interactive stories with your vocabulary words</p>
      </div>

      {!currentStory.length && !isGenerating && (
        <div className="space-y-6">
          {/* Genre Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Story Genre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STORY_GENRES.map((genre) => (
                  <Card
                    key={genre.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedGenre === genre.id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    onClick={() => setSelectedGenre(genre.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{genre.icon}</span>
                        <div>
                          <h3 className="font-semibold text-sm">{genre.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{genre.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Language Level */}
          <Card>
            <CardHeader>
              <CardTitle>Language Level</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedLevel} onValueChange={handleLevelChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A2">A2 - Elementary</SelectItem>
                  <SelectItem value="B1">B1 - Intermediate</SelectItem>
                  <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={generateStory}
            disabled={!selectedGenre || !selectedLevel || userWords.length === 0}
            className="w-full h-12 text-lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Generate Interactive Story
          </Button>

          {userWords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                You need some vocabulary words to create a story!
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/discover'}>
                Add Words First
              </Button>
            </div>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium">Crafting your story...</p>
          <p className="text-gray-600">This may take a moment</p>
        </div>
      )}

      {currentStory.length > 0 && !storyComplete && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scene {currentSceneIndex + 1} of {currentStory.length}</CardTitle>
              <Badge variant="secondary">{selectedLevel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Story Content */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {currentScene?.content}
              </p>
            </div>

            {/* Vocabulary Words in Scene */}
            {currentScene?.vocabularyWords && currentScene.vocabularyWords.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Vocabulary in this scene:</h4>
                <div className="flex flex-wrap gap-2">
                  {currentScene.vocabularyWords.map((word, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => playPronunciation(word)}
                      className="text-xs"
                    >
                      <Volume2 className="w-3 h-3 mr-1" />
                      {word}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Choices */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">What do you do?</h4>
              {currentScene?.choices.map((choice) => (
                <Button
                  key={choice.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 text-left"
                  onClick={() => makeChoice(choice.id)}
                >
                  <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{choice.text}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {storyComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">🎉 Story Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              You've experienced an interactive story and practiced your vocabulary!
            </p>
            
            {usedVocabulary.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Vocabulary Practiced:</h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  {usedVocabulary.map((word, index) => (
                    <Badge key={index} variant="secondary">{word}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button onClick={resetStory} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Another Story
              </Button>
              <Button onClick={() => window.location.href = '/library'}>
                📚 Review Words
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Level Change Confirmation Modal */}
      <Dialog open={showLevelConfirm} onOpenChange={setShowLevelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Story Level?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              You're switching from {selectedLevel} to {tempLevel}. The story will adjust its grammar and vocabulary to match this new level.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Word Preview:</h4>
              <p className="text-sm text-gray-600">
                <strong>Example words at {tempLevel}:</strong> {
                  tempLevel === 'A2' ? 'casa, comer, trabajar' :
                  tempLevel === 'B1' ? 'experiencia, desarrollar, conseguir' :
                  'perspectiva, establecer, fundamental'
                }
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLevelConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={confirmLevelChange}>
                Confirm Change
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}