import QuizAttemptModel from "../models/QuizAttempt";
import QuizModel from "../models/Quiz";
import UserQuestionModel from "../models/UserQuestion";
import mongoose from "mongoose";
import {
  SubmitAnswersRequest,
  QuizAttemptResponse,
} from "../types/schema/QuizAttempt";
import { QuestionResponse } from "../types/schema/Question";
import { QuizAttemptListResponse } from "../types/schema/QuizAttempt";
import { shuffle } from "../helper/utils/common";

export async function startAttempt(quizId: string, userId: string) {
  const quiz = await QuizModel.findById(quizId).populate("questions");

  if (!quiz || !quiz.isActive) {
    throw new Error("Quiz not found or inactive");
  }

  // check if an in-progress attempt already exists
  let attempt = await QuizAttemptModel.findOne({
    quiz: quizId,
    user: userId,
    status: "in_progress",
  }).populate([
    {
      path: "questions",
      populate: {
        path: "question",
        select: "_id questionText questionType media points timeLimit",
      },
    },
  ]);

  if (!attempt) {
    // create new attempt
    attempt = await new QuizAttemptModel({
      quiz: quizId,
      user: userId,
      currentQuestionIndex: 0,
      score: 0,
      percentage: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      startedAt: new Date(),
      status: "in_progress",
    }).save();

    let questions = [...quiz.questions];

    // Shuffle questions if enabled
    if (quiz.shuffleQuestions) questions = shuffle(questions);

    // Prepare userQuestions
    const userQuestions = await Promise.all(
      questions.map(async (question: any) => {
        let options = [...question.options];

        if (quiz.shuffleOptions) {
          options = shuffle(options, "options");
        }

        const userQuestion = new UserQuestionModel({
          attempt: attempt._id,
          question: question._id,
          options,
        });

        return userQuestion.save();
      })
    );

    attempt.questions = userQuestions.map((uq) => uq._id);

    attempt = await attempt.save();

    attempt = await attempt.populate([
      {
        path: "questions",
        populate: {
          path: "question",
          select: "_id questionText questionType media points timeLimit",
        },
      },
    ]);
  }

  return attempt;
}

export async function getAttemptById(
  attemptId: string,
  userId: string,
  page?: number
) {
  const attempt = await QuizAttemptModel.findById(attemptId)
    .populate([
      {
        path: "quiz",
        select: "_id title description timeLimit",
      },
      {
        path: "questions",
        populate: {
          path: "question",
          select: "_id questionText questionType media points timeLimit",
        },
      },
    ])
    .lean();

  if (!attempt) throw new Error("Attempt not found");

  if (attempt.user.toString() !== userId) throw new Error("Unauthorized");

  if (attempt.status === "completed") throw new Error("Quiz already completed");

  const total = attempt.questions.length;

  // === Pagination response shape ===
  let currentQuestionIndex = page
    ? page - 1
    : attempt.currentQuestionIndex || 0;
  currentQuestionIndex = Math.max(0, Math.min(currentQuestionIndex, total - 1));

  const currentPage = currentQuestionIndex + 1;

  // Update progress in DB
  await QuizAttemptModel.updateOne(
    { _id: attemptId },
    { $set: { currentQuestionIndex: currentQuestionIndex } }
  );

  const result = attempt.questions[currentQuestionIndex];

  return {
    meta: {
      total,
      page: currentPage,
      has_next: currentPage < total,
      has_prev: currentPage > 1,
    },
    quiz: attempt.quiz,
    result,
  };
}

export async function getNextQuestion(
  attemptId: string,
  userId: string,
  body: any
): Promise<QuestionResponse> {
  // Fetch quiz attempt with populated questions
  const attempt = await QuizAttemptModel.findById(attemptId).populate([
    {
      path: "questions",
      populate: {
        path: "question",
        select: "_id questionText questionType media points timeLimit options",
      },
    },
  ]);

  if (!attempt) throw new Error("Attempt not found");
  if (attempt.user.toString() !== userId) throw new Error("Unauthorized");
  if (attempt.status === "completed") throw new Error("Quiz already completed");

  const total = attempt.questions.length;
  let currentIndex = attempt.currentQuestionIndex;

  if (currentIndex >= total) {
    currentIndex = total - 1;
  }

  const { questionId, selectedOptions, textAnswer } = body;

  // Save or update user answer
  if (questionId) {
    const userQuestion = await UserQuestionModel.findOne({
      attempt: attemptId,
      _id: questionId,
    }).populate([
      {
        path: "question",
        select: "_id questionText questionType options",
      },
    ]);

    if (!userQuestion) throw new Error("UserQuestion not found");

    // Handle choice-based questions
    if (
      ["multiple_choice", "radio_choice", "true_false"].includes(
        userQuestion.question.questionType
      ) &&
      userQuestion.question.options
    ) {
      userQuestion.selectedOptions = selectedOptions;
    }

    // Handle text-based questions
    if (
      ["fill_blank", "essay", "short_answer"].includes(
        userQuestion.question.questionType
      )
    ) {
      userQuestion.textAnswer = textAnswer || "";
    }

    userQuestion.answeredAt = new Date();

    await userQuestion.save();
  }

  // ✅ Only increment if not at the last question
  if (currentIndex < total - 1) {
    attempt.currentQuestionIndex = currentIndex + 1;
    await attempt.save();
    currentIndex = attempt.currentQuestionIndex;
  }

  const currentQuestion = attempt.questions[currentIndex];

  return {
    meta: {
      total,
      page: currentIndex + 1,
      has_next: currentIndex + 1 < total,
      has_prev: currentIndex > 0,
    },
    result: currentQuestion,
  };
}

export async function submitAnswers(
  attemptId: string,
  userId: string
): Promise<QuizAttemptResponse> {
  const attempt = await QuizAttemptModel.findOne({
    _id: attemptId,
    user: userId,
  });

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  const userQuestions = await UserQuestionModel.find({
    attempt: attempt._id,
  })
    .populate([
      {
        path: "question",
        select: "_id questionText questionType options points",
      },
    ])
    .lean();

  let correctCount = 0;
  let totalCount = userQuestions.length;
  let score = 0;

  for (const userQuestion of userQuestions) {
    let correct = false;

    if (
      ["true_false", "radio_choice", "multiple_choice", "fill_blank"].includes(
        userQuestion.question.questionType
      )
    ) {
      const correctAnswers = userQuestion.question.options
        .filter((option: any) => option.correct)
        .map((option: any) => option.text);

      const selectedAnswers = userQuestion.selectedOptions || [];

      // ✅ Exact match check (no missing or extra answers)
      correct =
        correctAnswers.length === selectedAnswers.length &&
        correctAnswers.every((ans) => selectedAnswers.includes(ans));
    }

    if (
      ["essay", "short_answer"].includes(userQuestion.question.questionType)
    ) {
      correct = true; // ✅ for now, always mark true
    }

    if (correct) {
      correctCount++;
      score += userQuestion.question.points || 1; // default 1 if no points field
    }

    // 🔄 Save correctness to DB
    await UserQuestionModel.updateOne(
      { _id: userQuestion._id },
      { $set: { correct: correct } }
    );
  }

  const incorrectCount = totalCount - correctCount;

  // 🔄 Update attempt summary
  attempt.score = score;
  attempt.correctAnswers = correctCount;
  attempt.incorrectAnswers = incorrectCount;
  attempt.percentage = totalCount > 0 ? (score / totalCount) * 100 : 0;
  attempt.completedAt = new Date();
  attempt.timeTaken =
    (attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000; // in seconds
  attempt.status = "completed";

  await attempt.save();

  return {
    message: "Success",
    attemptId: attempt._id
  };
}

// Fetch paginated quiz attempts for the authenticated user
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
      .exec(),
    QuizAttemptModel.countDocuments({ user: userId }),
  ]);

  return {
    results: results.map(mapAttemptToResponse),
    total,
    page,
    limit,
  };
}

// Helper functions
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

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}
