import mongoose, { Document, Schema, Types } from "mongoose";

export enum AccessMethod {
    LICENSE = "license",
    PAYMENT = "payment",
}

export enum AccessStage {
    ACCESS_GRANTED = "access_granted",
    SUBJECT_FILLED = "subject_filled",
    ATTEMPT_CREATED = "attempt_created",
    COMPLETED = "completed",
}

export interface IAssessmentAccess extends Document {
    user: Types.ObjectId;
    assessment: Types.ObjectId;

    accessMethod: AccessMethod;

    licenseKey?: Types.ObjectId;
    transaction?: Types.ObjectId;

    stage: AccessStage;

    attempt?: Types.ObjectId;

    grantedAt: Date;
    isConsumed: boolean; // true after attempt created

    createdAt: Date;
    updatedAt: Date;
}

const AssessmentAccessSchema = new Schema<IAssessmentAccess>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        assessment: { type: Schema.Types.ObjectId, ref: "Assessment", required: true },

        accessMethod: {
            type: String,
            enum: Object.values(AccessMethod),
            required: true,
        },

        licenseKey: { type: Schema.Types.ObjectId, ref: "LicenseKey" },
        transaction: { type: Schema.Types.ObjectId, ref: "Transaction" },

        stage: {
            type: String,
            enum: Object.values(AccessStage),
            default: AccessStage.ACCESS_GRANTED,
        },

        attempt: { type: Schema.Types.ObjectId, ref: "QuizAttempt" },

        grantedAt: { type: Date, default: Date.now },

        isConsumed: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// prevent duplicate active access
AssessmentAccessSchema.index(
    { user: 1, assessment: 1, isConsumed: 1 },
    { unique: false }
);

export default mongoose.model<IAssessmentAccess>(
    "AssessmentAccess",
    AssessmentAccessSchema
);