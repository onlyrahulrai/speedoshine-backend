import QuizAttemptModel from "../models/QuizAttempt";
import mongoose from "mongoose";
import { LeaderboardResponse, QuizStatsResponse } from "../types/schema/Analytics";
import { QuizAttemptListResponse, QuizAttemptResponse } from "../types/schema/QuizAttempt";

export async function getAttemptById(
  attemptId: string,
  userId: string
): Promise<QuizAttemptResponse> {
  const attempt = await QuizAttemptModel.findById(attemptId).select("-questions -__v").populate([
    {
      path:"quiz",
      select:"title subtitle tagline description timeLimit"
    }
  ]);

  if (!attempt) throw new Error("Attempt not found");
  if (attempt.user.toString() !== userId) throw new Error("Unauthorized access");

  return attempt;
}

export async function getUserAttempts(
  userId: string,
  page = 1,
  limit = 10
): Promise<QuizAttemptListResponse> {
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    QuizAttemptModel.find({ user: userId })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    QuizAttemptModel.countDocuments({ user: userId }),
  ]);

  return {
    results: results.map(mapAttemptToResponse),
    total,
    page,
    limit,
  };
}

export async function getLeaderboard(
  quizId: string,
  limit = 10
): Promise<LeaderboardResponse> {
  // Fetch top attempts sorted by score desc, then completion time asc
  const results = await QuizAttemptModel.find({ quiz: quizId, status: "completed" })
    .sort({ score: -1, timeTaken: 1 })
    .limit(limit)
    .populate("user", "name avatar") // Adjust user fields as needed
    .lean();

  // Map to leaderboard response format
  const leaderboard = results.map((attempt) => ({
    userId: attempt.user._id.toString(),
    userName: attempt.user.name,
    avatar: attempt.user.avatar,
    score: attempt.score,
    percentage: attempt.percentage,
    timeTaken: attempt.timeTaken,
  }));

  return { leaderboard };
}

export async function getQuizStatistics(
  quizId: string
): Promise<QuizStatsResponse> {
  const attempts = await QuizAttemptModel.find({ quiz: quizId, status: "completed" }).lean();

  const totalAttempts = attempts.length;
  const averageScore = totalAttempts
    ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
    : 0;

  // Success rate = % of attempts with >= 50% score (adjust threshold as needed)
  const passingAttempts = attempts.filter(a => a.percentage >= 50).length;
  const successRate = totalAttempts ? (passingAttempts / totalAttempts) * 100 : 0;

  return {
    totalAttempts,
    averageScore,
    successRate,
  };
}

// Utility function to map attempt document to response DTO
function mapAttemptToResponse(doc: any): QuizAttemptResponse {
  return {
    id: doc._id.toString(),
    quizId: doc.quiz.toString(),
    userId: doc.user.toString(),
    answers: doc.answers.map((a: any) => ({
      questionId: a.questionId.toString(),
      selectedOptions: a.selectedOptions,
      isCorrect: a.isCorrect,
      timeTaken: a.timeTaken,
    })),
    score: doc.score,
    percentage: doc.percentage,
    correctAnswers: doc.correctAnswers,
    incorrectAnswers: doc.incorrectAnswers,
    startedAt: doc.startedAt.toISOString(),
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : undefined,
    status: doc.status,
  };
}
