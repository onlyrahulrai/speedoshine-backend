export interface SubmitAnswersRequest {
  answers: {
    questionId: string;
    selectedOptions: string[]; // IDs or text of selected options
    timeTaken?: number; // optional time spent on question in seconds
  }[];
  isComplete?: boolean; // Optional flag indicating quiz completion
}

export interface QuizAttemptResponse {
  id: string;
  quizId: string;
  userId: string;
  answers: {
    questionId: string;
    selectedOptions: string[];
    isCorrect: boolean;
    timeTaken?: number;
  }[];
  score: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  startedAt: string; // ISO date string
  completedAt?: string; // ISO date string or undefined if incomplete
  status: "in_progress" | "completed";
}

export interface QuizAttemptListResponse {
  results: QuizAttemptResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface QuizAttemptStart {
  code?: string;
  accessMethod: "LICENSE" | "PAYMENT";
  assessmentFor?: string; // e.g., "self", "employee", "team"
  subjectProfile?: {
    name?: string;
    age?: string;
    gender?: string;
    parentType?: string; // e.g., "Mother", "Father", "Guardian"
  } | null;
}