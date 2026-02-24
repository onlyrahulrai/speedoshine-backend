import QuizAttemptModel from "../models/QuizAttempt";
import { Types } from "mongoose";
import { LeaderboardResponse, QuizStatsResponse } from "../types/schema/Analytics";
import { QuizAttemptListResponse, QuizAttemptResponse } from "../types/schema/QuizAttempt";
import QuizAttempt from "../models/QuizAttempt";

export async function getAttemptById(
  attemptId: string,
  userId: string
): Promise<QuizAttemptResponse> {
  const attempt = await QuizAttemptModel.findById(attemptId).select("-questions -__v").populate([
    {
      path: "quiz",
      select: "title subtitle tagline description timeLimit"
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
  ref?: string,
  source?: string
): Promise<QuizStatsResponse[] | QuizStatsResponse> {
  try {
    const match: Record<string, any> = {};
    const pipeline: any[] = [];

    const project: Record<string, any> = {
      totalParticipants: { $size: "$statusBreakdown" },
      inProgress: {
        $size: {
          $filter: {
            input: "$statusBreakdown",
            as: "s",
            cond: { $eq: ["$$s", "in_progress"] }
          }
        }
      },
      completed: {
        $size: {
          $filter: {
            input: "$statusBreakdown",
            as: "s",
            cond: { $eq: ["$$s", "completed"] }
          }
        }
      },
      avgScore: { $avg: "$score" },
      avgPercentage: { $avg: "$percentage" },
    };

    const group: Record<string, any> = {
      statusBreakdown: { $push: "$status" },
      avgScore: { $avg: "$score" },
      avgPercentage: { $avg: "$percentage" },
    };

    /* ------------------------------------
       SINGLE SWITCH FOR ALL SOURCE LOGIC
    ------------------------------------ */

    switch (source) {
      case "license-key":
        if (ref) {
          match.licenseKey = new Types.ObjectId(ref);
        }

        group._id = "$licenseKey";
        project.licenseKey = "$_id";

        pipeline.push(
          { $match: match },
          { $group: group },
          { $project: project },
          {
            $lookup: {
              from: "licensekeys",
              localField: "licenseKey",
              foreignField: "_id",
              as: "licenseKey"
            }
          },
          { $unwind: "$licenseKey" }
        );
        break;

      case "quiz":
      default:
        if (ref) {
          match.quiz = new Types.ObjectId(ref);
        }

        group._id = "$quiz";
        project.quiz = "$_id";

        pipeline.push(
          { $match: match },
          { $group: group },
          { $project: project },
          {
            $lookup: {
              from: "quizzes",
              let: { quizId: "$quiz" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$quizId"] }
                  }
                },
                {
                  $project: {
                    title: 1,
                    description: 1,
                    totalMarks: 1,
                    scoringEnabled: 1
                  }
                }
              ],
              as: "quiz"
            }
          },
          { $unwind: "$quiz" }
        );
        break;
    }

    const stats = await QuizAttempt.aggregate(pipeline).exec();

    if (ref) {
      return (
        stats[0] || {
          _id: ref,
          avgScore: 0,
          avgPercentage: 0,
          totalParticipants: 0,
          inProgress: 0,
          completed: 0
        }
      );
    }

    return stats;

  } catch (error: any) {
    throw new Error(error.message || "Internal Server Error");
  }
}

