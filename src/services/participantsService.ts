import QuizAttempt from "../models/QuizAttempt";

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function getAllParticipants({
  page = 1,
  limit = 10,
  search
}: PaginationParams) {
  const skip = (page - 1) * limit;

  // Build query object
  const query: any = {};

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  const [results, total] = await Promise.all([
    QuizAttempt.find(query).select("-questions").populate([
        {
            path:"quiz",
            select: "title description tagline subtitle category difficulty"
        },
    ])
      .skip(skip)
      .limit(limit)
      .lean(),
    QuizAttempt.countDocuments(query),
  ]);

  return {
    results,
    total,
    page,
    limit,
  };
}