import React, { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Star, StarOff, Trash2, Eye, BookOpen, Plus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { WordInsights } from '../components/WordInsights'
import { blink } from '../blink/client'
import { VocabularyWord, UserNote } from '../types/vocabulary'

export const WordLibrary: React.FC = () => {
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [notes, setNotes] = useState<UserNote[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null)
  const [showInsights, setShowInsights] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<UserNote | null>(null)
  const [user, setUser] = useState<any>(null)

  const loadWords = useCallback(async () => {
    try {
      const wordsData = await blink.db.vocabulary_words.list({
        where: { user_id: user?.id },
        orderBy: { created_at: 'desc' }
      })
      setWords(wordsData)
    } catch (error) {
      console.error('Error loading words:', error)
    }
  }, [user?.id])

  const loadNotes = useCallback(async () => {
    try {
      const notesData = await blink.db.user_notes.list({
        where: { user_id: user?.id },
        orderBy: { created_at: 'desc' }
      })
      setNotes(notesData)
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }, [user?.id])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadWords()
        loadNotes()
      }
    })
    return unsubscribe
  }, [loadWords, loadNotes])

  const toggleFavorite = async (wordId: string, currentFavorite: boolean) => {
    try {
      await blink.db.vocabulary_words.update(wordId, {
        is_favorite: !currentFavorite
      })
      loadWords()
    } catch (error) {
      console.error('Error updating favorite:', error)
    }
  }

  const deleteWord = async (wordId: string) => {
    try {
      await blink.db.vocabulary_words.delete(wordId)
      loadWords()
    } catch (error) {
      console.error('Error deleting word:', error)
    }
  }

  const saveNote = async () => {
    if (!newNote.trim()) return
    
    try {
      if (editingNote) {
        await blink.db.user_notes.update(editingNote.id, {
          content: newNote.trim()
        })
      } else {
        await blink.db.user_notes.create({
          id: `note_${Date.now()}`,
          user_id: user.id,
          content: newNote.trim(),
          created_at: new Date().toISOString()
        })
      }
      setNewNote('')
      setEditingNote(null)
      setShowAddNote(false)
      loadNotes()
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      await blink.db.user_notes.delete(noteId)
      loadNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const filteredWords = words.filter(word => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.definition.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = filterLevel === 'all' || word.cefr_level === filterLevel
    const matchesStatus = filterStatus === 'all' || word.mastery_status === filterStatus
    return matchesSearch && matchesLevel && matchesStatus
  })

  const sortedWords = [...filteredWords].sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.word.localeCompare(b.word)
      case 'priority':
        return (Number(b.is_favorite) - Number(a.is_favorite)) || 
               (b.practice_count - a.practice_count)
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default: // newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'learning': return 'bg-yellow-100 text-yellow-800'
      case 'mastered': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCefrColor = (level: string) => {
    const colors = {
      'A1': 'bg-emerald-100 text-emerald-800',
      'A2': 'bg-green-100 text-green-800',
      'B1': 'bg-yellow-100 text-yellow-800',
      'B2': 'bg-orange-100 text-orange-800',
      'C1': 'bg-red-100 text-red-800',
      'C2': 'bg-purple-100 text-purple-800'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-gray-600">Sign in to access your vocabulary library</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Library</h1>
        <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingNote(null)
              setNewNote('')
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Write your note, phrase, or reflection..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={saveNote} disabled={!newNote.trim()}>
                  {editingNote ? 'Update' : 'Save'} Note
                </Button>
                <Button variant="outline" onClick={() => setShowAddNote(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="words" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="words">Saved Words ({words.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="words" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search words or definitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="A1">A1</SelectItem>
                <SelectItem value="A2">A2</SelectItem>
                <SelectItem value="B1">B1</SelectItem>
                <SelectItem value="B2">B2</SelectItem>
                <SelectItem value="C1">C1</SelectItem>
                <SelectItem value="C2">C2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="mastered">Mastered</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Words Grid */}
          <div className="grid gap-3">
            {sortedWords.map((word) => (
              <Card key={word.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">{word.word}</h3>
                        <Badge className={getCefrColor(word.cefr_level)} variant="secondary">
                          {word.cefr_level}
                        </Badge>
                        <Badge className={getStatusColor(word.mastery_status)} variant="secondary">
                          {word.mastery_status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {word.definition.split(',').slice(0, 3).join(', ')}
                      </p>
                      {word.example_sentence && (
                        <p className="text-xs text-gray-500 italic line-clamp-1">
                          "{word.example_sentence}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(word.id, Number(word.is_favorite) > 0)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        {Number(word.is_favorite) > 0 ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedWord(word)
                          setShowInsights(true)
                        }}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWord(word.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sortedWords.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No words found</h3>
              <p className="text-gray-600">
                {searchTerm || filterLevel !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start adding words to build your vocabulary library'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="grid gap-3">
            {notes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingNote(note)
                          setNewNote(note.content)
                          setShowAddNote(true)
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {notes.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-600">
                Save phrases, reflections, or important sentences here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Word Insights Modal */}
      {selectedWord && (
        <WordInsights
          word={selectedWord}
          isOpen={showInsights}
          onClose={() => {
            setShowInsights(false)
            setSelectedWord(null)
          }}
        />
      )}
    </div>
  )
}