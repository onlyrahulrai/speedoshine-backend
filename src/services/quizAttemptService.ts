import QuizAttemptModel from "../models/QuizAttempt";
import QuizModel from "../models/Quiz";
import mongoose from "mongoose";
import { SubmitAnswersRequest, QuizAttemptResponse } from "../types/schema/QuizAttempt";
import { QuestionResponse } from "../types/schema/Question";
import shuffleArray from "../helper/utils/shuffleArray";
import { QuizAttemptListResponse } from "../types/schema/QuizAttempt";

export async function startAttempt(
  quizId: string,
  userId: string
): Promise<QuizAttemptResponse> {
  const quiz = await QuizModel.findById(quizId).populate("questions");

  if (!quiz || !quiz.isActive) {
    throw new Error("Quiz not found or inactive");
  }

  // check if an in-progress attempt already exists
  let attempt = await QuizAttemptModel.findOne({
    quiz: quizId,
    user: userId,
    status: "in_progress",
  });

  if (attempt) {
    return mapAttemptToResponse(attempt);
  }

  // shuffle questions
  const shuffledQuestions = shuffleArray(quiz.questions);

  // for each question, shuffle its answers and store in attempt
  const questionsWithShuffledAnswers = shuffledQuestions.map((q) => ({
    questionId: q._id,
    text: q.text,
    options: shuffleArray(q.options), // assuming `options` holds answers
    correctAnswer: q.correctAnswer,   // ⚠️ store it for validation
  }));

  attempt = new QuizAttemptModel({
    quiz: quizId,
    user: userId,
    questions: questionsWithShuffledAnswers, // now storing whole set
    answers: [],
    currentQuestionIndex: 0,
    score: 0,
    percentage: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    startedAt: new Date(),
    status: "in_progress",
  });

  await attempt.save();

  return mapAttemptToResponse(attempt);
}

export async function getNextQuestion(
  attemptId: string,
  userId: string
): Promise<QuestionResponse> {
  const attempt = await QuizAttemptModel.findById(attemptId).populate({
    path: "questionsOrder",
    model: "Question",
  });

  if (!attempt) throw new Error("Attempt not found");
  if (attempt.user.toString() !== userId) throw new Error("Unauthorized");
  if (attempt.status === "completed") throw new Error("Quiz already completed");

  const currentIndex = attempt.currentQuestionIndex;
  if (currentIndex >= attempt.questionsOrder.length) {
    throw new Error("No more questions in this quiz");
  }

  const question = attempt.questionsOrder[currentIndex];

  const quiz = await QuizModel.findById(attempt.quiz);
  let options = question.options;
  if (quiz?.shuffleOptions) {
    options = shuffleArray([...question.options]);
  }

  return {
    id: question._id.toString(),
    questionText: question.questionText,
    questionType: question.questionType,
    options,
    media: question.media,
    points: question.points,
    timeLimit: question.timeLimit,
  };
}

export async function submitAnswers(
  attemptId: string,
  data: SubmitAnswersRequest
): Promise<QuizAttemptResponse> {
  const attempt = await QuizAttemptModel.findById(attemptId).populate("quiz");
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status === "completed") throw new Error("Attempt already completed");

  data.answers.forEach((answer) => {
    const existingIndex = attempt.answers.findIndex(
      (a) => a.questionId.toString() === answer.questionId
    );
    if (existingIndex >= 0) {
      attempt.answers[existingIndex].selectedOptions = answer.selectedOptions;
      attempt.answers[existingIndex].timeTaken = answer.timeTaken;
    } else {
      attempt.answers.push({
        questionId: new mongoose.Types.ObjectId(answer.questionId),
        selectedOptions: answer.selectedOptions,
        timeTaken: answer.timeTaken,
        isCorrect: false,
      });
    }
  });

  // Calculate score and correctness
  const quizQuestions = await QuizModel.findById(attempt.quiz._id)
    .select("questions")
    .populate("questions");
  let correctCount = 0;
  let incorrectCount = 0;
  let score = 0;

  for (const ans of attempt.answers) {
    const question = quizQuestions.questions.find(
      (q) => q._id.toString() === ans.questionId.toString()
    );
    if (!question) continue;

    const correctOptions = question.options
      .filter((o) => o.isCorrect)
      .map((o) => o.text);
    const isCorrect = arraysEqual(ans.selectedOptions, correctOptions);

    ans.isCorrect = isCorrect;

    if (isCorrect) {
      correctCount++;
      score += question.points || 1;
    } else {
      incorrectCount++;
    }
  }

  attempt.correctAnswers = correctCount;
  attempt.incorrectAnswers = incorrectCount;
  attempt.score = score;
  attempt.percentage =
    quizQuestions.questions.length > 0
      ? (score / quizQuestions.questions.length) * 100
      : 0;

  // Increment currentQuestionIndex
  attempt.currentQuestionIndex += 1;

  // Mark completed if last question answered or isComplete flag sent
  if (
    data.isComplete ||
    attempt.currentQuestionIndex >= attempt.questionsOrder.length
  ) {
    attempt.status = "completed";
    attempt.completedAt = new Date();
    attempt.timeTaken =
      (attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000;
  }

  await attempt.save();

  return mapAttemptToResponse(attempt);
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
