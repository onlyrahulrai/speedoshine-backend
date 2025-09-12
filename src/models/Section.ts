import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    timeLimit: { type: Number }, // optional section-wise timer
    totalMarks: { type: Number, default: 0 },
  },
);

export default mongoose.model("SectionSchema", SectionSchema);