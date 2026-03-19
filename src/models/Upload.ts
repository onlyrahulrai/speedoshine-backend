import mongoose, { Schema, Document } from "mongoose";

export interface IUpload extends Document {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UploadSchema = new Schema<IUpload>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// We might want to create an index on url for faster lookups
UploadSchema.index({ url: 1 });

export default mongoose.model<IUpload>("Upload", UploadSchema);
