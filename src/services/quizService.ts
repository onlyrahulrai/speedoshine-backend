import QuizModel from "../models/Quiz"; // your mongoose Quiz model
import QuizAttemptModel from "../models/QuizAttempt"; // mongoose QuizAttempt model
import QuestionModel from "../models/Question"; // mongoose Question model

interface PaginationParams {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: string;
  tags?: string[];
  search?: string;
}

export async function getAllQuizzes({
  page = 1,
  limit = 10,
  category,
  difficulty,
  tags,
  search
}: PaginationParams) {
  const skip = (page - 1) * limit;

  // Build query object
  const query: any = {};

  if (category && category !== "all") {
    query.category = category;
  }

  if (difficulty && difficulty !== "all") {
    query.difficulty = difficulty;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  const [results, total] = await Promise.all([
    QuizModel.find(query)
      .populate([
        {
          path: "questions",
        },
      ])
      .skip(skip)
      .limit(limit)
      .lean(),
    QuizModel.countDocuments(query),
  ]);

  return {
    results,
    total,
    page,
    limit,
  };
}

export async function getQuizById(id: string) {
  return await QuizModel.findById(id).populate("questions").lean();
}

export async function createQuiz(data: any) {
  try {
    // Only pick allowed fields from the payload
    const {
      title,
      subtitle,
      tagline,
      description,
      features,
      category,
      difficulty,
      tags,
      questions,
      totalMarks,
      timeLimit,
      shuffleQuestions,
      shuffleOptions,
      allowBackNavigation,
      nextQuiz,
      visibility,
      scheduledAt,
      isActive,
      createdBy,
    } = data;

    const quizData: {
      title: any;
      subtitle: any;
      tagline: any;
      description: any;
      features: any;
      category: any;
      difficulty: any;
      tags: any;
      totalMarks: any;
      timeLimit: any;
      shuffleQuestions: any;
      shuffleOptions: any;
      allowBackNavigation: any;
      visibility: any;
      scheduledAt: any;
      isActive: any;
      createdBy: any;
    } = {
      title,
      subtitle,
      tagline,
      description,
      features,
      category,
      difficulty,
      tags,
      totalMarks,
      timeLimit,
      shuffleQuestions,
      shuffleOptions,
      allowBackNavigation,
      visibility,
      scheduledAt,
      isActive,
      createdBy,
      // Do NOT allow client to set _id, createdAt, updatedAt, attemptsCount, averageScore
    };

    // Only add nextQuiz if it is valid (not null/undefined/empty)
    if (nextQuiz !== undefined && nextQuiz !== null && nextQuiz !== "") {
      (quizData as any).nextQuiz = nextQuiz;
    }

    const createdQuestions = await QuestionModel.insertMany(questions);

    // Optionally, validate required fields here
    const quiz = new QuizModel({
      ...quizData,
      questions: createdQuestions.map((q) => q._id),
    });

    await quiz.save();
    return quiz.toObject();
  } catch (error: any) {
    throw new Error(
      error.message ||
        "Oops! Assessment creation failed. Please check the details and try again."
    );
  }
}

export async function updateQuiz(id: string, data: any) {
  const { questions, ...body } = data;

  // Find existing quiz to compare
  const existingQuiz = await QuizModel.findById(id).lean();
  if (!existingQuiz) {
    throw new Error("Quiz not found");
  }

  // Extract IDs of questions currently in quiz
  const existingQuestionIds = existingQuiz.questions.map((q: any) =>
    q.toString()
  );

  // Extract IDs coming from update request
  const updatedQuestionIds = questions
    .filter((q: any) => q._id) // keep only existing ones
    .map((q: any) => q._id.toString());

  // Questions removed in update
  const deletedQuestionIds = existingQuestionIds.filter(
    (id: string) => !updatedQuestionIds.includes(id)
  );

  // Delete removed questions from DB
  if (deletedQuestionIds.length > 0) {
    await QuestionModel.deleteMany({ _id: { $in: deletedQuestionIds } });
  }

  // Update existing questions OR create new ones
  const updatedQuestions = await Promise.all(
    questions.map(async (q: any) => {
      if (q._id) {
        // update existing
        return QuestionModel.findByIdAndUpdate(q._id, q, { new: true });
      } else {
        // create new
        const newQ = await QuestionModel.create(q);
        return newQ;
      }
    })
  );

  // Update quiz with new body + updated question ids
  body.questions = updatedQuestions.map((q) => q._id);

  const quiz = await QuizModel.findByIdAndUpdate(id, body, { new: true });

  return quiz ? quiz.toObject() : null;
}

export async function deleteQuiz(id: string) {
  await QuizModel.findByIdAndDelete(id);
}

// Get quiz attempts for a quiz, optionally filtered by userId
export async function getQuizAttempts(quizId: string, userId?: string) {
  const filter: any = { quiz: quizId };
  if (userId) filter.user = userId;

  const results = await QuizAttemptModel.find(filter).lean();
  const total = await QuizAttemptModel.countDocuments(filter);

  return {
    results,
    total,
    page: 1,
    limit: results.length,
  };
}
