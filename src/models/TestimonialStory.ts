import mongoose, { Document } from "mongoose";

export interface ITestimonial extends Document {
  type: "testimonial" | "story";
  name: string;
  roleOrAge?: string;
  message: string;
  rating?: number;
  createdBy?: mongoose.Schema.Types.ObjectId | null;
  updatedBy?: mongoose.Schema.Types.ObjectId | null;
  published: boolean;
}

const testimonialStorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["testimonial", "story"],
      required: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    roleOrAge: {
      type: String,
      trim: true,
      default: "", // e.g., "Student" or "25"
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    // ⭐ rating field
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    published: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TestimonialStory", testimonialStorySchema);
