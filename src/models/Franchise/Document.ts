import mongoose, { Schema, Types } from "mongoose";

const DOCUMENT_TYPES = [
    "AADHAAR",
    "PAN",
    "BANK",
    "CHEQUE",
    "AGREEMENT",
    "OTHER",
];

const ENTITY_TYPES = ["FRANCHISE", "STAFF", "USER"];

const DocumentSchema = new Schema(
    {
        entity: {
            type: Types.ObjectId,
            required: true,
            index: true,
        },

        entityType: {
            type: String,
            required: true,
            enum: ENTITY_TYPES,
            index: true,
        },

        type: {
            type: String,
            enum: DOCUMENT_TYPES,
            required: true,
            index: true,
        },

        // -------------------------
        // File Info
        // -------------------------
        fileName: String,
        fileSize: Number,
        mimeType: {
            type: String,
            enum: ["image/png", "image/jpeg", "application/pdf"],
        },
        storagePath: String,
        fileUrl: {
            type: String,
            required: true,
        },

        // -------------------------
        // Versioning
        // -------------------------
        version: {
            type: Number,
            default: 1,
        },
        isCurrent: { type: Boolean, default: true },

        // -------------------------
        // Audit
        // -------------------------
        uploadedBy: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },

        isVerified: { type: Boolean, default: false },

        expiresAt: Date,

        metadata: { type: Object, default: {} },

        // -------------------------
        // Soft Delete
        // -------------------------
        isDeleted: { type: Boolean, default: false }
    },
    { timestamps: { createdAt: "uploadedAt", updatedAt: false } }
);

// -------------------------
// Indexes
// -------------------------

// Only ONE current document per entity + type
DocumentSchema.index(
    { entity: 1, entityType: 1, type: 1 },
    { unique: true, partialFilterExpression: { isCurrent: true } }
);

// Fast lookups
DocumentSchema.index({ entity: 1, entityType: 1, type: 1 });
DocumentSchema.index({ entity: 1, entityType: 1, isDeleted: 1 });
DocumentSchema.index({ isDeleted: 1, entity: 1 });

// Optional: auto-delete expired docs
// DocumentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


// -------------------------
// Hooks
// -------------------------

// Handle versioning + isCurrent
DocumentSchema.pre("save", async function (next) {
    if (this.isNew) {
        const Document = mongoose.model("Document");

        const lastDoc = await Document.findOne({
            entity: this.entity,
            entityType: this.entityType,
            type: this.type,
        }).sort({ version: -1 });

        this.version = lastDoc ? lastDoc.version + 1 : 1;

        // mark previous docs as not current
        await Document.updateMany(
            {
                entity: this.entity,
                entityType: this.entityType,
                type: this.type,
                isCurrent: true,
            },
            { isCurrent: false }
        );
    }

    next();
});

// -------------------------
// Export
// -------------------------
export default mongoose.model("Document", DocumentSchema);