export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  score: number;
  percentage: number;
  timeTaken?: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export interface QuizStatsResponse {
  totalAttempts: number;
  averageScore: number;
  successRate?: number; // percentage
}
