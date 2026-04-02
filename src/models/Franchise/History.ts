import mongoose, { Schema, Types } from "mongoose";

const HistorySchema = new Schema(
    {
        franchise: {
            type: Types.ObjectId,
            ref: "Franchise",
            required: true,
            index: true,
        },

        // 🔥 track transition properly
        fromStatus: {
            type: String,
            enum: [
                "DRAFT",
                "SUBMITTED",
                "UNDER_REVIEW",
                "APPROVED",
                "ONBOARDING",
                "GO_LIVE",
                "ACTIVE",
                "REJECTED",
            ],
        },

        toStatus: {
            type: String,
            enum: [
                "DRAFT",
                "SUBMITTED",
                "UNDER_REVIEW",
                "APPROVED",
                "ONBOARDING",
                "GO_LIVE",
                "ACTIVE",
                "REJECTED",
            ],
            required: true,
            index: true,
        },

        // 🔥 proper user reference
        changedBy: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
        },

        changedByRole: {
            type: String,
            enum: ["ADMIN", "USER", "SYSTEM"],
        },

        reason: String,

        metadata: {
            type: Schema.Types.Mixed,
        },

        changedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("History", HistorySchema);