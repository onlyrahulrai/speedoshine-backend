import mongoose, { Schema, Document } from "mongoose";

export interface ITokenBlacklist extends Document {
  token: string;
  user?: mongoose.Schema.Types.ObjectId; // optional now
  reason: "LOGOUT" | "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "OTHER";
  expiresAt: Date;
  createdAt: Date;
}

const TokenBlacklistSchema: Schema<ITokenBlacklist> = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // optional
    },
    reason: {
      type: String,
      enum: ["LOGOUT", "EMAIL_VERIFICATION", "PASSWORD_RESET", "OTHER"],
      default: "OTHER",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired tokens
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlacklist = mongoose.model<ITokenBlacklist>(
  "TokenBlacklist",
  TokenBlacklistSchema
);
