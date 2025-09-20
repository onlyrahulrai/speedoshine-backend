import QuizModel from "../models/Quiz"; // your mongoose Quiz model
import QuizAttemptModel from "../models/QuizAttempt"; // mongoose QuizAttempt model
import QuestionModel from "../models/Question"; // mongoose Question model
import SectionModel from "../models/Section";

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

export async function getQuizById(id: string, flag?: "edit" | "attempts") {
  try {
    const populateOptions = [];

    if (flag === "edit"){
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

    if (flag === "attempts"){
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
