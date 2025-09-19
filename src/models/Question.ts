import mongoose, { Document } from "mongoose";

interface Option {
  text?: string;
  correct?: boolean;
}

interface QuestionDoc extends Document {
  questionText: string;
  questionType:
    | "radio_choice"
    | "multiple_choice"
    | "fill_blank"
    | "true_false"
    | "essay"
    | "short_answer";
  options: Option[];
  media: {
    image: string | null;
    video: string | null;
    audio: string | null;
  };
  points: number;
}

export const OptionSchema = new mongoose.Schema<Option>({
  text: { type: String, required: false },
  correct: { type: Boolean, default: false, select: false }, // do not return correct answer by default
});

const QuestionSchema = new mongoose.Schema<QuestionDoc>(
  {
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: [
        "radio_choice",
        "multiple_choice",
        "true_false",
        "fill_blank",
        "essay",
        "short_answer",
      ],
      default: "multiple_choice",
    },
    options: {
      type: [OptionSchema],
      validate: {
        validator: function (this: QuestionDoc, opts: any[]) {
          if (["multiple_choice", "radio_choice", "true_false"].includes(this.questionType)) {
            return opts && opts.length > 0;
          }
          return true;
        },
        message:
          "At least one option is required for multiple choice questions.",
      },
    },
    media: {
      image: { type: String, default: null },
      video: { type: String, default: null },
      audio: { type: String, default: null },
    },
    points: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model("Question", QuestionSchema);
