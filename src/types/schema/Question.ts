export interface QuestionOption {
  text: string;
  // Optionally, you can hide `isCorrect` on response if you don't want to reveal answers
  // isCorrect?: boolean;
}

export interface QuestionMedia {
  image?: string;
  video?: string;
  audio?: string;
}

export interface QuestionResponse {
  id: string; // Question ID
  questionText: string;
  questionType: "radio_choice" | "multiple_choice" | "true_false" | "fill_blank" | "essay" | "short_answer";
  options: QuestionOption[];
  media?: QuestionMedia;
  points: number;
  timeLimit: number; // seconds
}
