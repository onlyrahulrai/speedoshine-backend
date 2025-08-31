import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    questionType: {
      type: String,
      enum: ["radio_choice", "multiple_choice", "true_false", "essay", "short_answer", "fill_blank", "matching_pairs"],
      required: true,
    },
    // User’s answer(s) - flexible based on type
    selectedOptions: [String], // multiple_choice (ids of selected options)
    trueFalseAnswer: { type: Boolean }, // true_false
    essayAnswer: { type: String }, // essay
    shortAnswer: { type: String }, // short_answer
    fillBlankAnswers: [String], // fill_blank (array of answers for blanks)
    matchingPairs: [
      {
        left: String,  // e.g. Question part
        right: String, // user’s matched answer
      },
    ],
    correct: Boolean,
    timeTaken: Number, // per-question
  },
  { _id: false }
);

const Answer = mongoose.model("Answer", AnswerSchema);

export default Answer;