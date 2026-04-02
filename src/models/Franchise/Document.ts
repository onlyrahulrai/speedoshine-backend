import mongoose, { Schema, Types } from "mongoose";

const DocumentSchema = new Schema(
    {
        // 🔥 Generic reference
        entityId: {
            type: Types.ObjectId,
            required: true,
            index: true,
        },

        entityType: {
            type: String,
            required: true,
            enum: ["FRANCHISE", "STAFF", "USER"],
            index: true,
        },

        type: {
            type: String,
            enum: ["AADHAAR", "PAN", "BANK", "CHEQUE"],
            index: true,
        },

        url: String,
        name: String,
        size: Number,
        mimeType: String,

        version: {
            type: Number,
            default: 1,
        },

        uploadedBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Document", DocumentSchema);