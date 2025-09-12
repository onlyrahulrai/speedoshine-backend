import mongoose from "mongoose";
import { OptionSchema } from "./Question";

const UserQuestionSchema = new mongoose.Schema(
  {
    section: { type: mongoose.Schema.Types.ObjectId, ref: "QuizSection", default: null },
    attempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuizAttempt",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    questionType: {
      type: String,
      enum: ["radio_choice", "multiple_choice", "fill_blank", "true_false", "essay", "short_answer"],
      required: true
    },
    options: [OptionSchema],
    selectedOptions: [
      {
        type: String,
      },
    ], // stores radio_choice, multiple_choice, true_false answer
    textAnswer: {
      type: String, // stores essay, fill-in-the-blank, short answer
      default: null,
    },
    correct: { type: Boolean, default: false },
    timeTaken: { type: Number, default: 0 },
    answeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("UserQuestion", UserQuestionSchema);
