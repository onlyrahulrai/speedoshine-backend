import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  identifier: string;
  otp: string;
  type: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OTPSchema: Schema = new Schema(
  {
    identifier: { type: String, required: true },
    otp: { type: String, required: true },
    type: {
      type: String,
      enum: ["login", "signup", "reset", "booking", "update"],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // 5 minutes TTL
    },
  },
  { timestamps: false }
);

const OTP = mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
