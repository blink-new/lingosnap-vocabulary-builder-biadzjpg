export interface VocabularyWord {
  id: string;
  userId: string;
  word: string;
  definition: string;
  pronunciation?: string;
  context?: string;
  sourceType: 'screenshot' | 'text' | 'url';
  sourceContent?: string;
  language: string;
  difficultyLevel: number;
  timesPracticed: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  masteryLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  sessionType: 'flashcard' | 'fill_blank';
  wordsPracticed: number;
  correctAnswers: number;
  durationSeconds: number;
  createdAt: string;
}

export interface WordPracticeResult {
  id: string;
  userId: string;
  wordId: string;
  sessionId: string;
  practiceType: string;
  isCorrect: boolean;
  responseTimeMs?: number;
  createdAt: string;
}

export interface WordDefinition {
  word: string;
  definition: string;
  pronunciation?: string;
  partOfSpeech?: string;
  examples?: string[];
}

export interface ContentSource {
  type: 'screenshot' | 'text' | 'url';
  content: string;
  extractedText?: string;
}