import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    totalMarks: { type: Number, default: 0 },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
  },
);

export default mongoose.model("Section", SectionSchema);