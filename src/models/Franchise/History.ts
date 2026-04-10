import mongoose, { Schema, Types } from "mongoose";

const STATUS = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "ONBOARDING",
    "GO_LIVE",
    "ACTIVE",
    "REJECTED",
];

const HistorySchema = new Schema(
    {
        franchise: {
            type: Types.ObjectId,
            ref: "Franchise",
            required: true,
            index: true,
        },

        fromStatus: {
            type: String,
            enum: STATUS,
        },

        toStatus: {
            type: String,
            enum: STATUS,
            required: true,
            index: true,
        },

        changedBy: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
        },

        changedByRole: {
            type: String,
            enum: ["ADMIN", "USER", "SYSTEM"],
            required: true,
        },

        action: {
            type: String,
            enum: ["STATUS_CHANGE", "COMMENT", "AUTO_UPDATE"],
            default: "STATUS_CHANGE",
        },

        reason: String,

        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    { timestamps: { createdAt: "changedAt", updatedAt: false } }
);

HistorySchema.pre("save", function (next) {
    if (
        this.action === "STATUS_CHANGE" &&
        this.fromStatus === this.toStatus
    ) {
        return next(new Error("Invalid status transition"));
    }
    next();
});

HistorySchema.index({ franchise: 1, changedAt: -1 });

export default mongoose.model("History", HistorySchema);