// Represents a single question option
export interface Option {
  _id?: string;
  text: string;
  correct?: boolean;
}

// Question structure in a quiz
export interface Question {
  _id?: string;
  questionText: string;
  questionType:
    | "multiple_choice"
    | "true_false"
    | "essay"
    | "short_answer"
    | "fill_blank"
    | "radio_choice";
  options?: Option[];
  media?: {
    image?: string;
    video?: string;
    audio?: string;
  };
  points?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Section {
  _id?: string;
  title: string;
  description?: string;
  totalMarks?: number;
  questions: Question[],
}

// Request body for creating/updating a quiz
export interface QuizRequest {
  title: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  features?: string[];
  focusAreas?: string[];
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  totalMarks?: number;
  fees?: number;
  timeLimit?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  allowBackNavigation?: boolean;
  scoringEnabled?: boolean;
  type?: "standard" | "multi-section"; // standard or multi-section
  visibility?: "public" | "private" | "unlisted";
  scheduledAt?: string; // ISO date string
  questions?: Question[];
  sections?: Section[];
  isActive?: boolean;
  isDeleted?: boolean;
  createdBy?: string; // user id
}

// Response after creating or fetching a quiz
export interface QuizResponse extends QuizRequest {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizUpdateRequest extends Partial<QuizResponse> {}

// List response for multiple quizzes
export interface QuizListResponse {
  results: QuizResponse[];
  total: number;
  page: number;
  limit: number;
}

// For quiz attempt answers
export interface QuizAttemptAnswer {
  questionId: string;
  selectedOptions: string[];
  isCorrect: boolean;
  timeTaken: number;
}

// Quiz attempt data
export interface QuizAttemptResponse {
  _id: string;
  user: string;
  quiz: string;
  answers: QuizAttemptAnswer[];
  score: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  startedAt: string;
  completedAt?: string;
  timeTaken?: number;
  status: "in_progress" | "completed";
  nextQuizUnlocked?: string;
  createdAt: string;
  updatedAt: string;
}

// List response for quiz attempts
export interface QuizAttemptListResponse {
  results: QuizAttemptResponse[];
  total: number;
  page: number;
  limit: number;
}
