import QuizModel from "../models/Quiz";
import QuizAttemptModel from "../models/QuizAttempt";
import QuestionModel from "../models/Question";
import SectionModel from "../models/Section";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { Types } from "mongoose";

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface AllQuizFilters extends PaginationParams {
  category?: string;
  difficulty?: string;
  tags?: string[];
  search?: string;
}

interface ParticipantFilters extends PaginationParams {
  flag?: string;
  status?: string;
  score?: string;
  search?: string;
}

export async function getAllQuizzes({
  page = 1,
  limit = 10,
  category,
  difficulty,
  tags,
  search
}: AllQuizFilters) {
  const skip = (page - 1) * limit;

  // Build query object
  const match: any = {};

  if (category && category !== "all") {
    match.category = category;
  }

  if (difficulty && difficulty !== "all") {
    match.difficulty = difficulty;
  }

  if (tags && tags.length > 0) {
    match.tags = { $in: tags };
  }

  if (search) {
    match.title = { $regex: search, $options: "i" };
  }

  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } }, // optional sorting
    { $skip: skip },
    { $limit: limit },
    // Lookup attempts to count participants
    {
      $lookup: {
        from: "quizattempts",
        localField: "_id",
        foreignField: "quiz",
        as: "attempts"
      }
    },
    {
      $addFields: {
        participants: { $size: { $ifNull: ["$attempts", []] } }
      }
    },
    {
      $project: {
        attempts: 0 // exclude full attempts
      }
    }
  ];

  // Run aggregation and count query in parallel
  const [results, total] = await Promise.all([
    QuizModel.aggregate(pipeline),
    QuizModel.countDocuments(match)
  ]);

  return {
    results,
    total,
    page,
    limit,
    hasPrev: page > 1,
    hasNext: skip + results.length < total
  };
}

export async function getQuizById(id: string, flag?: "edit" | "attempts") {
  try {
    const populateOptions = [];

    if (flag === "edit") {
      populateOptions.push(
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
      );
    }

    if (flag === "attempts") {
      populateOptions.push(
        {
          path: "sections",
          select: "title description questions",
        }
      )
    }

    let quiz = await QuizModel.findById(id).select("-__v")
      .populate(populateOptions)
      .lean();

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    return quiz;
  } catch (error: any) {
    throw new Error(
      error.message || "Failed to fetch quiz. Please try again."
    );
  }
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
      focusAreas,
      category,
      difficulty,
      tags,
      questions,
      sections,
      totalMarks,
      timeLimit,
      shuffleQuestions,
      shuffleOptions,
      allowBackNavigation,
      type,
      fees,
      scoringEnabled,
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
      focusAreas: any;
      category: any;
      difficulty: any;
      tags: any;
      totalMarks: any;
      timeLimit: any;
      shuffleQuestions: any;
      shuffleOptions: any;
      allowBackNavigation: any;
      visibility: any;
      scoringEnabled: any;
      fees: any;
      type: any;
      scheduledAt: any;
      isActive: any;
      createdBy: any;
      questions?: any[];
      sections?: any[];
    } = {
      title,
      subtitle,
      tagline,
      description,
      features,
      focusAreas,
      category,
      difficulty,
      tags,
      totalMarks,
      type,
      timeLimit,
      shuffleQuestions,
      shuffleOptions,
      allowBackNavigation,
      scoringEnabled,
      fees,
      visibility,
      scheduledAt,
      isActive,
      createdBy,
      // Do NOT allow client to set _id, createdAt, updatedAt, attemptsCount, averageScore
    };

    if (type === "multi-section") {
      const sectionIds: any[] = [];

      // Use for...of instead of forEach
      for (const section of sections || []) {
        const { title, description, questions } = section;

        // Create questions for this section
        const createdQuestions = await QuestionModel.insertMany(questions);

        // Save section
        const sectionInstance = await new SectionModel({
          title,
          description,
          questions: createdQuestions.map((q) => q._id),
        }).save();

        sectionIds.push(sectionInstance._id);
      }

      quizData.sections = sectionIds;
    } else {
      const createdQuestions = await QuestionModel.insertMany(questions);
      quizData.questions = createdQuestions.map((q) => q._id);
    }

    // Optionally, validate required fields here
    const quiz = new QuizModel(quizData);

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
  const { questions, sections, ...body } = data;

  // Find existing quiz
  const existingQuiz = await QuizModel.findById(id).lean();
  if (!existingQuiz) {
    throw new Error("Quiz not found");
  }

  if (existingQuiz.type === "multi-section") {
    const updatedSectionIds: any[] = [];

    for (const section of sections || []) {
      if (section._id) {
        // --- Update existing section ---
        const existingSection = await SectionModel.findById(section._id).lean();
        if (!existingSection) continue;

        // Handle section questions
        const existingQuestionIds = (existingSection.questions || []).map((q: any) => q.toString());
        const updatedQuestionIds = (section.questions || [])
          .filter((q: any) => q._id)
          .map((q: any) => q._id.toString());

        // Find deleted questions
        const deletedQuestionIds = existingQuestionIds.filter(
          (id: string) => !updatedQuestionIds.includes(id)
        );
        if (deletedQuestionIds.length > 0) {
          await QuestionModel.deleteMany({ _id: { $in: deletedQuestionIds } });
        }

        // Update or create questions
        const updatedQuestions = await Promise.all(
          (section.questions || []).map(async (q: any) => {
            if (q._id) {
              return QuestionModel.findByIdAndUpdate(q._id, q, { new: true });
            } else {
              return await QuestionModel.create(q);
            }
          })
        );

        // Update section
        const updatedSection = await SectionModel.findByIdAndUpdate(
          section._id,
          {
            title: section.title,
            description: section.description,
            questions: updatedQuestions.map((q) => q._id),
          },
          { new: true }
        );

        updatedSectionIds.push(updatedSection?._id);
      } else {
        // --- Create new section ---
        const createdQuestions = await QuestionModel.insertMany(section.questions || []);
        const newSection = await new SectionModel({
          title: section.title,
          description: section.description,
          questions: createdQuestions.map((q) => q._id),
        }).save();

        updatedSectionIds.push(newSection._id);
      }
    }

    body.sections = updatedSectionIds;
  } else {
    // --- Normal quiz handling ---
    const existingQuestionIds = (existingQuiz.questions || []).map((q: any) => q.toString());
    const updatedQuestionIds = (questions || [])
      .filter((q: any) => q._id)
      .map((q: any) => q._id.toString());

    // Deleted questions
    const deletedQuestionIds = existingQuestionIds.filter(
      (id: string) => !updatedQuestionIds.includes(id)
    );
    if (deletedQuestionIds.length > 0) {
      await QuestionModel.deleteMany({ _id: { $in: deletedQuestionIds } });
    }

    // Update or create
    const updatedQuestions = await Promise.all(
      (questions || []).map(async (q: any) => {
        if (q._id) {
          return QuestionModel.findByIdAndUpdate(q._id, q, { new: true });
        } else {
          return await QuestionModel.create(q);
        }
      })
    );

    body.questions = updatedQuestions.map((q) => q._id);
  }

  // Update quiz main fields
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

export async function getQuizParticipants(
  quizId: string,
  filters: ParticipantFilters = {}
) {
  try {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new Error("Invalid quiz id supplied");
    }

    const match: Record<string, any> = { quiz: new Types.ObjectId(quizId) };

    // ✅ apply filters
    if (filters.status) {
      match.status = filters.status; // "completed" | "in_progress"
    }

    if (filters.score) {
      if (filters.score === "high") {
        match.score = { $gte: 80 }; // 80 and above
      } else if (filters.score === "medium") {
        match.score = { $gte: 70, $lt: 80 }; // 70 to 79
      } else if (filters.score === "low") {
        match.score = { $lte: 60 }; // 60 and below
      }
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    const skip = (page - 1) * limit;

    const basePipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ];

    // ✅ optional text search
    if (filters.search) {
      basePipeline.push({
        $match: {
          $or: [
            { "user.firstName": { $regex: filters.search, $options: "i" } },
            { "user.lastName": { $regex: filters.search, $options: "i" } },
            { "user.email": { $regex: filters.search, $options: "i" } },
          ],
        },
      });
    }

    // ✅ total count first
    const totalResult = await QuizAttemptModel.aggregate([
      ...basePipeline,
      { $count: "count" },
    ]).exec();

    const total = totalResult.length > 0 ? totalResult[0].count : 0;

    // ✅ fetch paginated participants
    const results = await QuizAttemptModel.aggregate([
      ...basePipeline,
      { $sort: { createdAt: -1 } }, // latest first
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          status: 1,
          score: 1,
          percentage: 1,
          createdAt: 1,
          startedAt: 1,
          completedAt: 1,
          report: 1,
          timeTaken: 1,
          "user._id": 1,
          "user.firstName": 1,
          "user.lastName": 1,
          "user.email": 1,
        },
      },
    ]).exec();

    return {
      results,
      page,
      limit,
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  } catch (error: any) {
    throw new Error(error.message || "Internal Server Error");
  }
}

export async function generateExcelReport(_id: string): Promise<{ path: string }> {
  try {
    // 1. Fetch quiz and attempts
    const quiz = await QuizModel.findOne({ _id });

    if (!quiz) throw new Error("Quiz not found");

    let attempts = await QuizAttemptModel.find({ quiz: quiz._id })
      .populate([
        {
          path: "quiz",
          select: "_id title description type",
        },
        {
          path: "sections",
          populate: [
            {
              path: "section",
              select: "title",
            },
            {
              path: "questions",
              select:
                "_id attempt question options.text options._id selectedOptions textAnswer answeredAt",
              populate: {
                path: "question",
                select: "_id questionText questionType media points timeLimit",
              },
            },
          ],
        },
        {
          path: "questions",
          select:
            "_id attempt question options.text options._id selectedOptions textAnswer answeredAt",
          populate: {
            path: "question",
            select: "_id questionText questionType media points timeLimit",
          },
        },
      ])
      .lean();

    if (attempts.length === 0) throw new Error("No attempts found");

    // Filter out incomplete attempts
    attempts = attempts.sort((a, b) => {
      if (a.status === b.status) return 0;
      if (a.status === "completed") return -1;
      if (b.status === "completed") return 1;
      return 0;
    });

    // 2. Create workbook
    const workbook = new ExcelJS.Workbook();

    // ✅ STANDARD QUIZ
    if (quiz.type === "standard") {
      const sheet = workbook.addWorksheet("Responses");

      // Collect all unique questions
      const allQuestionsMap = new Map<string, string>();
      for (const attempt of attempts) {
        for (const q of attempt.questions) {
          allQuestionsMap.set(q.question._id.toString(), q.question.questionText);
        }
      }

      const allQuestionIds = Array.from(allQuestionsMap.keys());
      const allQuestionTexts = Array.from(allQuestionsMap.values());

      // Header row
      const headerRow = ["Timestamp", ...allQuestionTexts];
      sheet.addRow(headerRow);

      // Add answers
      for (const attempt of attempts) {
        const answersMap = new Map<string, string>();
        for (const q of attempt.questions) {
          let ans = "No answer";
          switch (q.question.questionType) {
            case "multiple_choice":
            case "radio_choice":
            case "true_false":
              ans = q.selectedOptions?.join(", ") || "No answer";
              break;
            case "fill_in_blank":
            case "essay":
            case "short_answer":
              ans = q.textAnswer || "No answer";
              break;
          }
          answersMap.set(q.question._id.toString(), ans);
        }

        const answerRow = [
          attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : "N/A",
          ...allQuestionIds.map((qid) => answersMap.get(qid) || "No answer"),
        ];
        sheet.addRow(answerRow);
      }

      // Auto column width
      sheet.columns.forEach((col) => {
        let maxLength = 10;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const cellLength = (cell.value?.toString().length || 0) + 2;
          if (cellLength > maxLength) maxLength = cellLength;
        });
        col.width = maxLength;
      });
    }

    // ✅ SECTIONED QUIZ
    else {
      // ✅ Collect all unique sections across all attempts
      const allSectionsMap = new Map<string, string>();
      for (const attempt of attempts) {
        for (const sec of attempt.sections || []) {
          if (sec.section?._id) {
            allSectionsMap.set(sec.section._id.toString(), sec.section.title);
          }
        }
      }

      const allSections = Array.from(allSectionsMap.entries());

      const sanitizeSheetName = (name: string) =>
        name.replace(/[\\/*?:[\]]/g, "").substring(0, 31);

      for (const [sectionId, sectionTitle] of allSections) {
        const sheetName = sanitizeSheetName(sectionTitle || "Untitled Section");
        const sheet = workbook.addWorksheet(sheetName);

        // ✅ Collect all unique questions across all attempts in this section
        const allQuestionsMap = new Map<string, string>();
        for (const attempt of attempts) {
          const section = attempt.sections.find(
            (s: any) => s.section._id.toString() === sectionId
          );
          if (!section) continue;

          for (const q of section.questions) {
            allQuestionsMap.set(q.question._id.toString(), q.question.questionText);
          }
        }

        const allQuestionIds = Array.from(allQuestionsMap.keys());
        const allQuestionTexts = Array.from(allQuestionsMap.values());

        // Header row → Timestamp + all questions
        const headerRow = ["Timestamp", ...allQuestionTexts];
        sheet.addRow(headerRow);

        // ✅ Add answers
        for (const attempt of attempts) {
          const section = attempt.sections.find(
            (s: any) => s.section._id.toString() === sectionId
          );
          if (!section) continue;

          const answersMap = new Map<string, string>();
          for (const q of section.questions) {
            let ans = "No answer";
            switch (q.question.questionType) {
              case "multiple_choice":
              case "radio_choice":
              case "true_false":
                ans = q.selectedOptions?.join(", ") || "No answer";
                break;
              case "fill_in_blank":
              case "essay":
              case "short_answer":
                ans = q.textAnswer || "No answer";
                break;
            }
            answersMap.set(q.question._id.toString(), ans);
          }

          const answerRow = [
            attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : "N/A",
            ...allQuestionIds.map((qid) => answersMap.get(qid) || "No answer"),
          ];
          sheet.addRow(answerRow);
        }

        // Auto column width
        sheet.columns.forEach((col) => {
          let maxLength = 10;
          col.eachCell({ includeEmpty: true }, (cell) => {
            const cellLength = (cell.value?.toString().length || 0) + 2;
            if (cellLength > maxLength) maxLength = cellLength;
          });
          col.width = maxLength;
        });
      }
    }

    // 3. Ensure reports dir exists
    const reportsDir = path.join(process.cwd(), "uploads", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // 4. File path
    const fileName = `quiz-report-${_id}-${Date.now()}.xlsx`;
    const filePath = path.join(reportsDir, fileName);

    // 5. Save
    await workbook.xlsx.writeFile(filePath);

    return {
      path: `uploads/reports/${fileName}`,
    };
  } catch (error: any) {
    throw new Error(error.message || "Internal Server Error");
  }
}
