import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILicenseKey extends Document {
  name: string;
  code: string;

  /** Scope */
  scope: "GLOBAL" | "ASSESSMENT";

  /** Relations */
  assessment?: Types.ObjectId;

  /** Usage control */
  hasUsageLimit: boolean;
  usageLimit?: number;
  usedCount: number;

  /** Validity */
  expiresAt?: Date;

  /** Status */
  isActive: boolean;
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const LicenseKeySchema = new Schema<ILicenseKey>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    code: {
      type: String,
      required: [true, "License code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    /** Scope */
    scope: {
      type: String,
      enum: ["GLOBAL", "ASSESSMENT"],
      default: "GLOBAL",
      index: true,
    },

    /** Assessment mapping (optional) */
    assessment: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: function () {
        return this.scope === "ASSESSMENT";
      },
    },

    /** Usage control */
    hasUsageLimit: {
      type: Boolean,
      default: false,
    },

    usageLimit: {
      type: Number,
      min: 1,
      required: function () {
        return this.hasUsageLimit === true;
      },
    },

    usedCount: {
      type: Number,
      default: 0,
    },

    /** Expiry */
    expiresAt: {
      type: Date,
      index: true,
    },

    /** Status flags */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* Helpful compound indexes */
LicenseKeySchema.index({ code: 1, isDeleted: 1 });
LicenseKeySchema.index({ assessment: 1, isActive: 1 });

const LicenseKey = mongoose.model<ILicenseKey>(
  "LicenseKey",
  LicenseKeySchema
);

export default LicenseKey;
