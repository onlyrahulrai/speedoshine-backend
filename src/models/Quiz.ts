import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    tagline: { type: String },
    description: { type: String },
    features: [String],
    focusAreas: [String],
    category: { type: String, index: true },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    tags: { type: [String], index: true },

    // Questions (references to Question documents)
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
      },
    ],

    type:{
      type: String,
      enum: ["standard", "multi-section"],
      default: "standard",
    },

    // Settings
    totalMarks: { type: Number, default: 0 },
    timeLimit: { type: Number }, // in seconds
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    allowBackNavigation: { type: Boolean, default: true },

    // Creator & access
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "public",
    },

    scheduledAt: { type: Date },

    // Status
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", QuizSchema);
