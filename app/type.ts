export type Screen =
  | 'dashboard'
  | 'study-assistant'
  | 'viva-simulator'
  | 'quiz-generator'
  | 'deadline-tracker'
  | 'study-rooms'
  | 'discussion-summarizer';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface VivaSession {
  id: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'idle' | 'intro' | 'questioning' | 'completed';
  currentQuestionIndex: number;
  maxQuestions: number;
  questions: Array<{
    question: string;
    expectedConcepts: string[];
    userAnswer?: string;
    score?: number;
    feedback?: string;
  }>;
  overallFeedback?: string;
  overallScore?: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index in options (0-3)
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  topic: string;
}

export interface Deadline {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  notes?: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  musicType: 'lofi' | 'ambient' | 'nature' | 'none';
  customPrompt?: string;
}

export interface DiscussionSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  criticalQuestions: string[];
}
