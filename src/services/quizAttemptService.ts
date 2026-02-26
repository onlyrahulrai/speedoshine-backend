import QuizAttemptModel from "../models/QuizAttempt";
import QuizModel from "../models/Quiz";
import LicenseKeyModel from "../models/LicenseKey";
import UserQuestionModel from "../models/UserQuestion";
import PromptModel from "../models/Prompt";
import {
  QuizAttemptResponse,
  QuizAttemptStart,
} from "../types/schema/QuizAttempt";
import { QuestionResponse } from "../types/schema/Question";
import { QuizAttemptListResponse } from "../types/schema/QuizAttempt";
import { shuffle } from "../helper/utils/common";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import AssessmentAccess, { AccessStage } from "../models/AssessmentAccess";

// FIX: Define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface SaveAnswerParams {
  attemptId: string;
  questionId: string;
  userId: string;
  selectedOptions?: string[];
  textAnswer?: string;
}

export async function startAttempt(quizId: string, userId: string, body: QuizAttemptStart): Promise<any> {
  const { code, accessMethod, assessmentFor, subjectProfile } = body;

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

  const access = await AssessmentAccess.findOne({
    user: userId,
    assessment: quizId,
    stage: {$ne: AccessStage.COMPLETED}
  });

  if (!access || access.stage !== AccessStage.ACCESS_GRANTED) {
    throw new Error("Access not granted for this assessment");
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

  if (attempt) {
    return attempt;
  }

  // create new attempt
  let licenseKey = null;

  if (code) {
    // validate license key 
    const licenseKeyInstance = await LicenseKeyModel.findOne({ code, isActive: true, isDeleted: false });

    if (!licenseKeyInstance) {
      throw new Error("Invalid license key");
    }

    licenseKey = licenseKeyInstance._id;
  }

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
    questions: [],
    licenseKey: licenseKey,
    assessmentFor,
    subjectProfile,
    accessMethod
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
    attempt.totalMarks = quiz.totalMarks || questions.reduce((acc: number, q: any) => acc + q.points, 0);
  } else {
    // ---------- MULTI-SECTION QUIZ ----------
    const sectionAttempts = [];

    for (const section of quiz.sections) {
      let secQuestions = [...section.questions];

      // console.log("Section Questions:", JSON.stringify(secQuestions));

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

  await AssessmentAccess.updateOne(
    { _id: access._id },
    {
      $set: {
        stage: AccessStage.ATTEMPT_CREATED,
        attempt: attempt._id,
      },
    }
  );

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


  return attempt;
}

export async function getAttemptQuestions(
  attemptId: string,
  userId: string,
  page?: number,
  limit: number = 1,
  currentSectionIndex?: number,
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

  let sectionIndex = currentSectionIndex !== undefined ? currentSectionIndex : (attempt.currentSectionIndex ?? 0);
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
      section: currentSection ? sectionIndex : null,
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

      let completedAt = section.completedAt;

      if (isCompleted && !section.completedAt) {
        completedAt = new Date();
      }

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

  if (isAttemptCompleted) {
    await AssessmentAccess.findOneAndUpdate(
      {
        user: userId,
        assessment: attempt.quiz._id,
        attempt: attempt?._id
      },
      {
        $set: {
          stage: AccessStage.COMPLETED,
        }
      }
    );
  }

  return {
    message: "Success",
    attemptId: attempt._id.toString(),
    score: attempt.score,
    percentage: attempt.percentage,
    correctAnswers: attempt.correctAnswers,
    incorrectAnswers: attempt.incorrectAnswers,
    status: attempt.status,
    completedAt: attempt.completedAt,
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

const buildFormattedAssessmentFromAttempt = (attempt: any) => {
  const sections =
    attempt.quiz.type === "multi-section"
      ? attempt.sections
      : [{ section: { title: "General" }, questions: attempt.questions }];

  let output = `
      ------------------------------------------------------------
      PARTICIPANT INFORMATION
      ------------------------------------------------------------

      Name: ${attempt.user.firstName} ${attempt.user.lastName}
      Age: ${attempt.user.age}
      Mobile: ${attempt.user.phone}
      Email: ${attempt.user.email}
      Assessment: ${attempt.quiz.title}
      Bio: ${attempt.user.bio || "N/A"}
      Occupation: ${attempt.user.occupation || "N/A"}
      Organization: ${attempt.user.organization || "N/A"}

      ------------------------------------------------------------
      ASSESSMENT RESPONSES (For Analysis Only – Do Not Display)
      ------------------------------------------------------------
    `;

  sections.forEach((sec: any) => {
    output += `\n${sec.section.title}\n`;

    sec.questions.forEach((q: any) => {
      let userAnswer = "No answer";

      if (q.selectedOptions?.length) {
        userAnswer = q.selectedOptions.join(", ");
      } else if (q.textAnswer) {
        userAnswer = q.textAnswer;
      }

      const shortQuestion = q.question.questionText
        ?.split("?")[0]
        ?.replace(/\(.*?\)/g, "") // remove Hindi or brackets
        ?.trim();

      output += `- ${shortQuestion}: ${userAnswer}\n`;
    });
  });

  output += `
      ------------------------------------------------------------
      END OF DATA
      ------------------------------------------------------------
  `;

  return output;
};

const buildFinalPrompt = async ({
  attempt,
  selectedPromptId,
  customPrompt,
}: any) => {
  const patternData = buildFormattedAssessmentFromAttempt(attempt);

  let promptDoc = null;

  // 1️⃣ Try selected prompt
  if (selectedPromptId) {
    promptDoc = await PromptModel.findById(selectedPromptId).lean();
  }

  // 3️⃣ Final content
  const sections = [
    promptDoc?.content || "",
    patternData,
  ];

  if (customPrompt) {
    sections.push(`Additional Instruction:\n${customPrompt}`);
  }

  return sections.filter(Boolean).join("\n\n");
};

export async function generateAttemptReport({
  customPrompt,
  excelFile,
  attemptId,
  selectedPromptId
}: {
  customPrompt: string;
  excelFile?: any;
  attemptId: string;
  selectedPromptId?: string;
}): Promise<QuizAttemptResponse> {

  // Fetch attempt with user, quiz, sections, questions
  const attempt = await QuizAttemptModel.findOne({
    _id: attemptId,
  }).populate([
    {
      path: "user",
      select: "_id firstName lastName phone email age occupation organization bio",
    },
    { path: "quiz", select: "_id title description type totalMarks" },
    {
      path: "sections",
      populate: [
        { path: "section", select: "_id title description" },
        {
          path: "questions",
          populate: {
            path: "question",
            select: "_id questionText questionType options points"
          },
        },
      ],
    },
    {
      path: "questions",
      populate: {
        path: "question",
        select: "_id questionText questionType options points"
      },
    },
  ]);

  if (!attempt) throw new Error("Attempt not found");

  const aiPrompt = await buildFinalPrompt({
    attempt,
    selectedPromptId,
    customPrompt,
  });

  // console.log("AI Prompt:\n", aiPrompt);

  /* Optional: log only in dev */
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `
          You are a professional report generation engine.

          STRICT RULES:
          - Output clean semantic HTML only.
          - Use only: <h2>, <h3>, <p>, <ul>, <li>, <strong>.
          - No markdown.
          - No explanations outside the report.
          - Never fabricate data.
          - Base conclusions strictly on provided information.
          - Maintain professional and neutral tone unless otherwise specified.
          - If data is missing or insufficient, state that clearly in the report.
        `
      },
      {
        role: "user",
        content: aiPrompt
      }
    ],
  });

  const aiReport = response.choices?.[0]?.message?.content || "Unable to generate summary";

  return {
    attemptId: attempt._id,
    quizId: attempt.quiz._id,
    user: attempt.user,
    report: aiReport,
  };
}

export async function saveGeneratedAttemptReport({
  reports,
  attemptId
}: {
  reports: string;
  attemptId: string;
}): Promise<QuizAttemptResponse> {
  try {
    // ---------------------------------------------------------------------
    // 1. Fetch Attempt
    // ---------------------------------------------------------------------
    const attempt = await QuizAttemptModel.findOne({
      _id: attemptId,
    }).populate([
      { path: "user", select: "_id firstName lastName email" },
      { path: "quiz", select: "_id title" },
    ]);

    if (!attempt) {
      throw new Error("Attempt not found or unauthorized");
    }

    // ---------------------------------------------------------------------
    // 2. Ensure /uploads and /uploads/reports directories exist
    // ---------------------------------------------------------------------
    const uploadsDir = path.join(__dirname, "../../uploads");
    const reportsDir = path.join(uploadsDir, "reports");

    // Create /uploads if missing
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("Created folder:", uploadsDir);
    }

    // Create /uploads/reports if missing
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
      console.log("Created folder:", reportsDir);
    }

    // ---------------------------------------------------------------------
    // 3. Generate PDF filename & path
    // ---------------------------------------------------------------------
    const pdfFileName = `Report_${attempt._id}.pdf`;
    const pdfFilePath = path.join(reportsDir, pdfFileName);

    // ---------------------------------------------------------------------
    // 4. Generate PDF using Puppeteer
    // ---------------------------------------------------------------------
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // Load HTML content
    await page.setContent(reports, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    await page.pdf({
      path: pdfFilePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "98px",
        bottom: "98px",
        left: "72px",
        right: "72px",
      },
    });

    await browser.close();

    // ---------------------------------------------------------------------
    // 5. Save HTML + File Path into DB
    // ---------------------------------------------------------------------
    attempt.reportContent = reports;                         // Save HTML
    attempt.report = `uploads/reports/${pdfFileName}`;      // Public URL/path

    await attempt.save();

    // ---------------------------------------------------------------------
    // 6. Return response
    // ---------------------------------------------------------------------
    return {
      message: "Report saved successfully",
      attemptId: attempt._id.toString(),
      quizId: attempt.quiz._id.toString(),
      user: attempt.user,
      report: attempt.report,              // PDF path
      reportContent: attempt.reportContent, // HTML content
      score: attempt.score,
      percentage: attempt.percentage,
      correctAnswers: attempt.correctAnswers,
      incorrectAnswers: attempt.incorrectAnswers,
      status: attempt.status,
      completedAt: attempt.completedAt,
    };

  } catch (error: any) {
    console.error("Error saving generated report:", error);
    throw new Error(error.message || "Failed to save report");
  }
}