import QuizAttemptModel from "../models/QuizAttempt";
import QuizModel from "../models/Quiz";
import UserQuestionModel from "../models/UserQuestion";
import {
  QuizAttemptResponse,
} from "../types/schema/QuizAttempt";
import { QuestionResponse } from "../types/schema/Question";
import { QuizAttemptListResponse } from "../types/schema/QuizAttempt";
import { shuffle } from "../helper/utils/common";

interface SaveAnswerParams {
  attemptId: string;
  questionId: string;
  userId: string;
  selectedOptions?: string[];
  textAnswer?: string;
}

export async function startAttempt(quizId: string, userId: string) {
  const quiz = await QuizModel.findById(quizId)
    .populate([
      {
        path: "questions",
        select: "-__v +options.correct",
      },
      {
        path: "sections",
        select: "-__v",
        populate: {
          path: "questions",
          select: "-__v +options.correct",
        },
      },
    ]);

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
    {
      path: "sections",
      populate: {
        path: "questions",
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
      currentSectionIndex: 0,
      score: 0,
      percentage: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      startedAt: new Date(),
      status: "in_progress",
      sections: [],
      questions: []
    }).save();

    // ---------- Standard Quiz ----------
    if (quiz.type === "standard") {
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
            questionType: question.questionType,
            options,
          });

          return userQuestion.save();
        })
      );

      attempt.questions = userQuestions.map((uq) => uq._id);
      attempt.totalMarks = quiz.totalMarks || questions.reduce((acc, q) => acc + q.points, 0);
    } else {
      // ---------- MULTI-SECTION QUIZ ----------
      const sectionAttempts = [];

      for (const section of quiz.sections) {
        let secQuestions = [...section.questions];

        console.log("Section Questions:", JSON.stringify(secQuestions));

        if (quiz.shuffleQuestions) secQuestions = shuffle(secQuestions);

        const secUserQuestions = await Promise.all(
          secQuestions.map(async (question: any) => {
            let options = [...question.options];

            if (quiz.shuffleOptions) options = shuffle(options, "options");

            const userQuestion = new UserQuestionModel({
              attempt: attempt._id,
              section: section._id,
              question: question._id,
              questionType: question.questionType,
              options,
            });

            return userQuestion.save();
          })
        );

        // snapshot of section attempt
        sectionAttempts.push({
          section: section._id,
          questions: secUserQuestions.map((uq) => uq._id),
          score: 0,
          percentage: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          timeTaken: 0,
          startedAt: new Date(),
          status: "in_progress",
        });
      }

      attempt.questions = [];
      attempt.sections = sectionAttempts;
    }


    attempt = await attempt.save();

    attempt = await attempt.populate([
      {
        path: "questions",
        populate: {
          path: "question",
          select: "_id questionText questionType media points timeLimit",
        },
      },
      {
        path: "sections",
        populate: {
          path: "questions",
          select: "_id questionText questionType media points timeLimit",
        },
      },
    ]);
  }

  return attempt;
}

export async function getAttemptQuestions(
  attemptId: string,
  userId: string,
  page?: number,
  limit: number = 1
): Promise<QuestionResponse> {
  const attempt = await QuizAttemptModel.findById(attemptId)
    .populate([
      {
        path: "quiz",
        select: "_id title description type",
      },
      {
        path: "questions",
        select:
          "_id attempt question options.text options._id selectedOptions textAnswer answeredAt",
        populate: { path: "question", select: "_id questionText questionType media points timeLimit" },
      },
      {
        path: "sections",
        populate: {
          path: "questions",
          select:
            "_id attempt question options.text options._id selectedOptions textAnswer answeredAt",
          populate: { path: "question", select: "_id questionText questionType media points timeLimit" },
        },
      },
    ])
    .lean();

  if (!attempt) throw new Error("Attempt not found");

  const userIdStr =
    typeof attempt.user === "object" && "_id" in attempt.user
      ? attempt.user._id.toString()
      : attempt.user.toString();

  if (userIdStr !== userId) throw new Error("Unauthorized");

  if (attempt.status === "completed") throw new Error("Quiz already completed");

  let sectionIndex = attempt.currentSectionIndex ?? 0;
  let questionIndex = attempt.currentQuestionIndex ?? 0;

  let currentSection = attempt.quiz?.type === "multi-section" ? attempt.sections?.[sectionIndex] : null;

  let questionsList: any[] = currentSection ? currentSection.questions : attempt.questions;

  const totalQuestions = questionsList.length;

  let effectivePage =
    attempt.currentQuestionIndex > 0 && (!page || Number.isNaN(page))
      ? attempt.currentQuestionIndex + 1// resume from progress
      : Math.max(1, Math.floor(page || 1)); // otherwise use provided page (sanitized)

  // Pagination logic
  const start = (effectivePage - 1);
  const skip = start * limit;
  const end = skip + limit;

  let paginatedQuestions = questionsList.slice(skip, end);

  const requestedPageProvided = typeof page === "number" && !Number.isNaN(page);

  const isSectionCompleted = currentSection && skip >= totalQuestions && requestedPageProvided;

  // Section ended: move to next section
  if (currentSection && isSectionCompleted) {
    // Update current section as completed
    await QuizAttemptModel.updateOne(
      { _id: attemptId, "sections._id": currentSection._id },
      {
        $set: {
          "sections.$.status": "completed",
          "sections.$.completedAt": new Date(),
        },
      }
    );

    sectionIndex++;
    questionIndex = 0;

    if (sectionIndex < (attempt.sections?.length || 0)) {
      currentSection = attempt.sections[sectionIndex];
      questionsList = currentSection.questions;
      paginatedQuestions = questionsList.slice(0, limit);

      // Reset progress for new section
      await QuizAttemptModel.updateOne(
        { _id: attemptId },
        { currentSectionIndex: sectionIndex, currentQuestionIndex: 0 }
      );

      effectivePage = 1;
    }
  } else {
    // Update progress within current section
    await QuizAttemptModel.updateOne(
      { _id: attemptId },
      { currentSectionIndex: sectionIndex, currentQuestionIndex: start }
    );
  }

  return {
    meta: {
      total: questionsList.length,
      page: effectivePage,
      limit,
      has_next:
        end < questionsList.length ||
        (currentSection && sectionIndex + 1 < (attempt.sections?.length || 0)),
      has_prev: effectivePage > 1 || questionIndex > 0,
    },
    ...(currentSection ? { section: currentSection.section } : {}),
    questions: paginatedQuestions,
  };
}

export async function saveAnswer({
  attemptId,
  questionId,
  userId,
  selectedOptions,
  textAnswer,
}: SaveAnswerParams) {
  const attempt = await QuizAttemptModel.findById(attemptId);
  if (!attempt) throw new Error("Attempt not found");

  // ✅ Check user authorization
  const attemptUserId = attempt.user.toString();
  if (attemptUserId !== userId) throw new Error("Unauthorized");

  // ✅ Fetch user question
  const userQuestion = await UserQuestionModel.findOne({
    attempt: attemptId,
    _id: questionId,
  }).populate("question", "_id questionText questionType options");

  if (!userQuestion) throw new Error("UserQuestion not found");

  const { question } = userQuestion;

  // ✅ Handle answers
  if (["multiple_choice", "radio_choice", "true_false"].includes(question.questionType)) {
    if (selectedOptions || textAnswer) {
      const correctAnswers = question.options.filter(o => o.correct).map(o => o.text);

      userQuestion.selectedOptions = selectedOptions;

      userQuestion.correct =
        selectedOptions.length === correctAnswers.length &&
        correctAnswers.every(ans => selectedOptions.includes(ans));
    }
  } else if (["essay", "short_answer", "fill_blank"].includes(question.questionType)) {
    if (textAnswer !== undefined) {
      userQuestion.textAnswer = textAnswer;

      if (question.questionType === "fill_blank") {
        const correctAnswers = question.options.filter(o => o.correct).map(o => o.text);
        userQuestion.correct =
          correctAnswers.length === 1 &&
          correctAnswers[0].toLowerCase().trim() === textAnswer.toLowerCase().trim();
      } else {
        userQuestion.correct = true; // mark for later evaluation
      }
    }
  }

  userQuestion.answeredAt = new Date();
  await userQuestion.save();

  // ✅ Update section progress (if multi-section quiz)
  if (attempt.quiz?.type === "multi-section" && attempt.sections?.length) {
    const section = attempt.sections.find(sec => sec.questions.includes(userQuestion._id));
    if (section) {
      const answeredCount = await UserQuestionModel.countDocuments({
        _id: { $in: section.questions },
        $or: [{ textAnswer: { $ne: null } }, { selectedOptions: { $ne: [] } }],
      });

      if (answeredCount === section.questions.length) {
        section.status = "completed";
        section.completedAt = new Date();
        await attempt.save();
      }
    }
  }

  return { message: "Answer saved successfully", questionId: userQuestion._id };
}

export async function submitAnswers(
  attemptId: string,
  userId: string
): Promise<QuizAttemptResponse> {
  const attempt = await QuizAttemptModel.findOne({
    _id: attemptId,
    user: userId,
  }).populate([
    {
      path: "quiz",
      select: "_id title description type totalMarks",
    },
    {
      path: "sections",
      populate: {
        path: "questions",
        populate: {
          path: "question",
          select: "_id questionText questionType options points",
        },
      },
    },
    {
      path: "questions",
      populate: {
        path: "question",
        select: "_id questionText questionType options points",
      },
    },
  ]);

  if (!attempt) throw new Error("Attempt not found");

  // Normalize all questions
  const userQuestions: any[] = attempt.sections?.length
    ? attempt.sections.flatMap((sec: any) => sec.questions)
    : attempt.questions;

  const totalQuestions = userQuestions.length;

  // --- Overall Score ---
  let totalCorrect = 0;
  let totalScore = 0;

  for (const uq of userQuestions) {
    if (uq.correct) {
      totalCorrect++;
      totalScore += uq.question.points || 1;
    }
  }

  const incorrectCount = totalQuestions - totalCorrect;
  const totalQuizMarks = attempt?.quiz?.totalMarks ?? 0;

  // --- Section-wise Calculations ---
  if (attempt.sections?.length) {
    for (const section of attempt.sections) {
      const sectionTotal = section.questions.length;

      const sectionCorrect = section.questions.filter((q: any) => q.correct).length;

      const sectionScore = section.questions.reduce(
        (sum: number, q: any) => sum + (q.correct ? q.question?.points || 1 : 0),
        0
      );

      const sectionTotalMarks = section.questions.reduce(
        (sum: number, q: any) => sum + (q.question?.points || 1),
        0
      );

      const sectionAnswered = section.questions.filter(
        (q: any) =>
          (q.selectedOptions?.length ?? 0) > 0 ||
          Boolean(q.textAnswer?.trim())
      ).length;

      const sectionPercentage =
        sectionTotalMarks > 0 ? (sectionScore / sectionTotalMarks) * 100 : 0;

      const isCompleted = sectionAnswered >= sectionTotal;
      const completedAt = isCompleted ? new Date() : null;

      const startTime = section.startedAt ? new Date(section.startedAt) : null;
      const endTime = completedAt ? new Date(completedAt) : null;
      const timeTaken =
        startTime && endTime
          ? (endTime.getTime() - startTime.getTime()) / 1000
          : 0;

      section.score = sectionScore;
      section.correctAnswers = sectionCorrect;
      section.incorrectAnswers = sectionTotal - sectionCorrect;
      section.percentage = Number(sectionPercentage.toFixed(2));
      section.status = isCompleted ? "completed" : "in_progress";
      section.completedAt = completedAt;
      section.timeTaken = timeTaken;
    }
  }

  const overallPercentage =
    totalQuizMarks > 0 ? (totalScore / totalQuizMarks) * 100 : 0;

  const isAttemptCompleted =
    attempt.sections?.length > 0
      ? attempt.sections.every((s: any) => s.status === "completed")
      : true;

  const completedAt = isAttemptCompleted ? new Date() : null;
  const startedAt = attempt.startedAt ? new Date(attempt.startedAt) : null;
  const timeTaken =
    startedAt && completedAt
      ? (completedAt.getTime() - startedAt.getTime()) / 1000
      : 0;

  // Update attempt summary
  attempt.score = totalScore;
  attempt.correctAnswers = totalCorrect;
  attempt.incorrectAnswers = incorrectCount;
  attempt.percentage = Number(overallPercentage.toFixed(2));
  attempt.status = isAttemptCompleted ? "completed" : "in_progress";
  attempt.completedAt = completedAt;
  attempt.timeTaken = timeTaken;

  await attempt.save();

  return {
    message: "Success",
    attemptId: attempt._id.toString(),
    score: attempt.score,
    percentage: attempt.percentage,
    correctAnswers: attempt.correctAnswers,
    incorrectAnswers: attempt.incorrectAnswers,
    status: attempt.status,
    completedAt: attempt.completedAt,
    sections: attempt.sections, // include per-section stats if needed
  };
}

// Fetch paginated quiz attempts for the authenticated user
export async function getAttempts(
  userId: string,
  page = 1,
  limit = 10
): Promise<QuizAttemptListResponse> {
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    QuizAttemptModel.find({ user: userId }).select("quiz score percentage correctAnswers incorrectAnswers status completedAt timeTaken startedAt report").populate([{
      path: "quiz",
      select: "title subtitle tagline scoringEnabled"
    }])
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    QuizAttemptModel.countDocuments({ user: userId }),
  ]);

  return {
    results,
    total,
    page,
    limit,
  };
}

export async function editAttempt(attemptId?: string, body: any) {
  try {
    const updatedAttempt = await QuizAttemptModel.findByIdAndUpdate(
      attemptId,
      { $set: body },
      { new: true }
    );

    if (!updatedAttempt) {
      throw new Error("Quiz attempt not found");
    }

    return updatedAttempt;
  } catch (error: any) {
    throw new Error(error.message || "Internal Server Error");
  }
}
