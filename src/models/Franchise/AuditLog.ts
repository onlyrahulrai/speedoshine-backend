import mongoose, { Schema, Types } from "mongoose";

const ACTION_TYPES = [
    "CREATED",
    "UPDATED",
    "DELETED",
    "DOCUMENT_UPLOADED",
    "DOCUMENT_DELETED",
    "PAYMENT_INITIATED",
    "PAYMENT_COMPLETED",
    "LOGIN",
    "LOGOUT",
    "FAILED_LOGIN",
];

const ENTITY_TYPES = [
    "FRANCHISE",
    "USER",
    "STAFF",
    "PAYMENT",
    "DOCUMENT",
];

const AuditLogSchema = new Schema(
    {
        // -------------------------
        // What entity this log is about
        // -------------------------
        entity: {
            type: Types.ObjectId,
            required: true,
            index: true,
        },

        entityType: {
            type: String,
            enum: ENTITY_TYPES,
            required: true,
            index: true,
        },

        // -------------------------
        // Action performed
        // -------------------------
        action: {
            type: String,
            enum: ACTION_TYPES,
            required: true,
            index: true,
        },

        // -------------------------
        // Who performed the action
        // -------------------------
        performedBy: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
        },

        performedByRole: {
            type: String,
            enum: ["ADMIN", "USER", "SYSTEM"],
            required: true,
        },

        // -------------------------
        // Additional context
        // -------------------------
        ipAddress: String,
        userAgent: String,

        // -------------------------
        // Change tracking (VERY IMPORTANT)
        // -------------------------
        changes: {
            type: Schema.Types.Mixed,
            // example:
            // { before: { status: "DRAFT" }, after: { status: "SUBMITTED" } }
        },

        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true, // createdAt = log time
    }
);


// -------------------------
// Indexes
// -------------------------

// fast entity-based lookup
AuditLogSchema.index({ entity: 1, entityType: 1, createdAt: -1 });

// user activity tracking
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });

// action-based queries
AuditLogSchema.index({ action: 1, createdAt: -1 });


// -------------------------
// Export
// -------------------------
export default mongoose.model("AuditLog", AuditLogSchema);