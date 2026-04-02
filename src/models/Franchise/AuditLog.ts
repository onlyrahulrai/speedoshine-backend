import mongoose, { Schema, Types } from "mongoose";

const AuditLogSchema = new Schema(
    {
        franchise: {
            type: Types.ObjectId,
            ref: "Franchise",
            index: true,
        },

        action: {
            type: String,
            enum: [
                "CREATED",
                "UPDATED",
                "STATUS_CHANGED",
                "APPROVED",
                "REJECTED",
                "PAYMENT_DONE",
                "DOCUMENT_UPLOADED",
            ],
            index: true,
        },

        performedBy: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
        },


        metadata: Schema.Types.Mixed,

        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    }
);

export default mongoose.model("AuditLog", AuditLogSchema);