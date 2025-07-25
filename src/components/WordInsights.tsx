import React, { useState, useCallback } from 'react';
import { X, Brain, Users, BookOpen, MessageSquare, Volume2, Lightbulb, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { blink } from '@/blink/client';
import type { VocabularyWord } from '@/types/vocabulary';

interface WordInsightsProps {
  word: VocabularyWord;
  isOpen: boolean;
  onClose: () => void;
}

interface WordInsightData {
  morphology: {
    prefix?: string;
    root: string;
    suffix?: string;
    breakdown: string;
  };
  relatedWords: string[];
  synonyms: string[];
  antonyms: string[];
  grammaticalForms: {
    [key: string]: string;
  };
  collocations: string[];
  memorySentence: string;
}

export function WordInsights({ word, isOpen, onClose }: WordInsightsProps) {
  const [insights, setInsights] = useState<WordInsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChatExplanation, setShowChatExplanation] = useState(false);
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const generateInsights = useCallback(async () => {
    setLoading(true);
    try {
      const { text } = await blink.ai.generateText({
        prompt: `Provide a comprehensive analysis of the word "${word.word}" (definition: ${word.definition}). Return a JSON object with the following structure:

{
  "morphology": {
    "prefix": "prefix if any",
    "root": "main root",
    "suffix": "suffix if any", 
    "breakdown": "explanation of each part"
  },
  "relatedWords": ["word1", "word2", "word3"],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"],
  "grammaticalForms": {
    "noun": "form",
    "verb": "form",
    "adjective": "form",
    "adverb": "form"
  },
  "collocations": ["common phrase 1", "common phrase 2", "common phrase 3"],
  "memorySentence": "An emotional, vivid sentence using the word that helps with memory"
}

Focus on accuracy and educational value. For the memory sentence, make it emotionally engaging and visually descriptive.`,
        maxTokens: 800
      });

      const parsedInsights = JSON.parse(text.trim());
      setInsights(parsedInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      // Fallback insights
      setInsights({
        morphology: {
          root: word.word,
          breakdown: `The word "${word.word}" is the main form.`
        },
        relatedWords: [],
        synonyms: [],
        antonyms: [],
        grammaticalForms: {},
        collocations: [],
        memorySentence: `The ${word.word} was memorable in this context.`
      });
    } finally {
      setLoading(false);
    }
  }, [word.word, word.definition]);

  const generateChatExplanation = async () => {
    setChatLoading(true);
    setShowChatExplanation(true);
    try {
      const { text } = await blink.ai.generateText({
        prompt: `As a friendly language tutor, provide a detailed, conversational explanation of the word "${word.word}" (definition: ${word.definition}). Include:

1. **Word Deconstruction (Morphology)**: Break down the word into its parts (prefix, root, suffix) and explain what each part means. Show how understanding these parts helps with other words.

2. **Related Words (Word Family)**: List other words that share the same root or prefix, and explain how they're connected in meaning.

3. **Synonyms and Antonyms**: Provide words with similar and opposite meanings, with examples showing the subtle differences.

4. **Grammatical Forms**: Show how the word changes in different contexts (verb forms, noun cases, adjective endings, etc.).

5. **Chunks and Collocations**: Present common phrases where this word appears naturally, emphasizing fixed expressions.

6. **Memory Helper**: Create a vivid, emotional sentence that helps remember the word through storytelling and visual imagery.

Write in a warm, encouraging tone as if you're having a conversation with a language learner. Use examples and make connections to help them truly understand and remember this word.`,
        maxTokens: 1000
      });

      setChatResponse(text);
    } catch (error) {
      console.error('Failed to generate chat explanation:', error);
      setChatResponse('Sorry, I couldn\'t generate a detailed explanation right now. Please try again later.');
    } finally {
      setChatLoading(false);
    }
  };

  const playPronunciation = async () => {
    try {
      const { url } = await blink.ai.generateSpeech({
        text: word.word,
        voice: 'nova'
      });
      const audio = new Audio(url);
      audio.play();
    } catch (error) {
      console.error('Failed to play pronunciation:', error);
    }
  };

  React.useEffect(() => {
    if (isOpen && !insights) {
      generateInsights();
    }
  }, [isOpen, insights, generateInsights]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{word.word}</h2>
              <p className="text-gray-600">{word.definition}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={playPronunciation}
              className="text-indigo-600"
            >
              <Volume2 className="w-4 h-4 mr-1" />
              Play
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Chat Explanation Button */}
              <div className="text-center">
                <Button
                  onClick={generateChatExplanation}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={chatLoading}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {chatLoading ? 'Generating...' : 'Get Detailed Chat Explanation'}
                </Button>
              </div>

              {/* Chat Explanation */}
              {showChatExplanation && (
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-800">
                      <MessageSquare className="w-5 h-5" />
                      Detailed Explanation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chatLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none text-indigo-900">
                        {chatResponse.split('\n').map((paragraph, index) => (
                          <p key={index} className="mb-3 leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Word Deconstruction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Word Deconstruction (Morphology)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-lg font-mono">
                      {insights.morphology.prefix && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          {insights.morphology.prefix}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-green-600 border-green-200 font-bold">
                        {insights.morphology.root}
                      </Badge>
                      {insights.morphology.suffix && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          {insights.morphology.suffix}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700">{insights.morphology.breakdown}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Related Words */}
              {insights.relatedWords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Related Words (Word Family)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.relatedWords.map((relatedWord, index) => (
                        <Badge key={index} variant="secondary" className="text-blue-700 bg-blue-100">
                          {relatedWord}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Synonyms and Antonyms */}
              <div className="grid md:grid-cols-2 gap-4">
                {insights.synonyms.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <BookOpen className="w-5 h-5" />
                        Synonyms
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {insights.synonyms.map((synonym, index) => (
                          <Badge key={index} variant="secondary" className="text-green-700 bg-green-100">
                            {synonym}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {insights.antonyms.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <X className="w-5 h-5" />
                        Antonyms
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {insights.antonyms.map((antonym, index) => (
                          <Badge key={index} variant="secondary" className="text-red-700 bg-red-100">
                            {antonym}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Grammatical Forms */}
              {Object.keys(insights.grammaticalForms).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      Grammatical Forms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(insights.grammaticalForms).map(([type, form]) => (
                        <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500 uppercase font-medium">{type}</div>
                          <div className="font-medium text-gray-900">{form}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Collocations */}
              {insights.collocations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-600" />
                      Common Phrases & Collocations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insights.collocations.map((phrase, index) => (
                        <div key={index} className="p-2 bg-amber-50 rounded border-l-4 border-amber-400">
                          <span className="font-medium text-amber-800">"{phrase}"</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Memory Helper */}
              <Card className="border-pink-200 bg-pink-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-pink-800">
                    <Heart className="w-5 h-5" />
                    Memory Helper Sentence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-pink-900 font-medium italic text-lg leading-relaxed">
                    "{insights.memorySentence}"
                  </p>
                  <p className="text-pink-700 text-sm mt-2">
                    💡 This emotional sentence helps create a vivid memory connection with the word.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}