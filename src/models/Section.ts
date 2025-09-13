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
  },
);

export default mongoose.model("Section", SectionSchema);