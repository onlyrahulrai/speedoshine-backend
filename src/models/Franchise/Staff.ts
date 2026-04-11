import mongoose, { Schema, Types } from "mongoose";

const STAFF_STATUS = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"];

const STAFF_ROLES = ["MANAGER", "CLEANER"];

const StaffSchema = new Schema(
    {
        // -------------------------
        // Relations
        // -------------------------
        franchise: {
            type: Types.ObjectId,
            ref: "Franchise",
            index: true,
        },

        user: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
            sparse: true, // allows null for non-activated staff
        },

        // -------------------------
        // Basic Info
        // -------------------------
        name: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: STAFF_ROLES,
            required: true,
            index: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        email: {
            type: String,
            trim: true,
            index: true,
        },

        // -------------------------
        // KYC Details
        // -------------------------
        aadhaarNumber: {
            type: String,
            trim: true,
            index: true,
        },
        panNumber: {
            type: String,
            trim: true,
            index: true,
        },

        // -------------------------
        // Bank Details
        // -------------------------
        bankDetails: {
            accountNumber: String,
            ifsc: String,
        },


        // -------------------------
        // Status
        // -------------------------
        status: {
            type: String,
            enum: STAFF_STATUS,
            default: "PENDING",
            index: true,
        },

        rejectionReason: String,

        // -------------------------
        // Training
        // -------------------------
        trainingStatus: {
            type: String,
            enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
            default: "NOT_STARTED",
        },

        trainingProgress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },

        // -------------------------
        // Access Control
        // -------------------------
        loginAccess: {
            type: Boolean,
            default: false,
        },

        // -------------------------
        // Audit
        // -------------------------
        createdBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        approvedBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        submittedAt: Date,
        approvedAt: Date,

        // -------------------------
        // Soft Delete
        // -------------------------
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Staff", StaffSchema);