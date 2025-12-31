import mongoose from "mongoose";

const QuizAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },

    questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserQuestion",
    }],

    // NEW: Track sections explicitly
    sections: [
      {
        section: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
        questions: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserQuestion",
        }],
        score: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        incorrectAnswers: { type: Number, default: 0 },
        timeTaken: { type: Number, default: 0 }, // in seconds
        startedAt: { type: Date, default: Date.now },
        completedAt: { type: Date },
        status: {
          type: String,
          enum: ["in_progress", "completed"],
          default: "in_progress",
        },
      },
    ],

    currentQuestionIndex: { type: Number, default: 0 },
    currentSectionIndex: { type: Number, default: 0 },

    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    incorrectAnswers: { type: Number, default: 0 },

    report: {
      type: String,
    },

    reportContent: { type: String },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    timeTaken: { type: Number }, // total time in seconds

    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },

    licenseKey:{
      type: mongoose.Schema.Types.ObjectId, ref: "LicenseKey", 
    }
  },
  { timestamps: true }
);

export default mongoose.model("QuizAttempt", QuizAttemptSchema);