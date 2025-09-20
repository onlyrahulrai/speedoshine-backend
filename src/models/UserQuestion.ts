import mongoose from "mongoose";

const UserOptionSchema = new mongoose.Schema({
  text: { type: String, required: false },
  correct: { type: Boolean, default: false, select: false },
});

const UserQuestionSchema = new mongoose.Schema(
  {
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
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
    options: [UserOptionSchema],
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
