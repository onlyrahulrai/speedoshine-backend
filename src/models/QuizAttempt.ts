import mongoose from "mongoose";

const QuizAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },

    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true }],
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Answer", required: true }],

    currentQuestionIndex: { type: Number, default: 0 },

    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    incorrectAnswers: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    timeTaken: { type: Number }, // total time in seconds

    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },

    nextQuizUnlocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("QuizAttempt", QuizAttemptSchema);