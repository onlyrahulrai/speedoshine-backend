import mongoose from "mongoose";
import { OptionSchema } from "./Question";

const UserQuestionSchema = new mongoose.Schema(
  {
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
    options: [OptionSchema],
    selectedOptions: [
      {
        type: String,
      },
    ],
    textAnswer: {
      type: String, // stores essay, fill-in-the-blank, short answer
      default: null,
    },
    correct: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("UserQuestion", UserQuestionSchema);
