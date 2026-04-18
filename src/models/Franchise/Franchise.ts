import mongoose, { Schema, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const FranchiseSchema = new Schema(
    {
        franchiseId: {
            type: String,
            unique: true,
            index: true,
            trim: true,
        },

        owner: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
        },

        applicant: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        applicantRole: {
            type: String,
            enum: ["ADMIN", "USER", "SYSTEM"],
            required: true,
            index: true,
        },

        source: {
            type: String,
            enum: ["SELF_SIGNUP", "ADMIN_PANEL", "SALES_TEAM", "API"],
            default: "SELF_SIGNUP",
        },

        // -------------------------
        // Basic Details
        // -------------------------
        basicDetails: {
            proprietorName: { type: String, trim: true, required: true },
            contactNumber: { type: String, trim: true, required: true },
            email: { type: String, lowercase: true, trim: true },
            address: { type: String, trim: true },
            city: { type: String, trim: true },
            district: { type: String, trim: true },
            state: { type: String, trim: true },
            country: { type: String, default: "India" },
            pincode: { type: String, trim: true },
        },

        // -------------------------
        // Business Details
        // -------------------------
        businessDetails: {
            preferredLocation: String,
            investmentCapacity: String,

            isFullOwner: { type: Boolean, default: true },

            availableSpace: Number,

            preferredModel: {
                type: String,
                enum: ["COCO", "FOCO", "FOFO"],
            },

            expectedTimeToStart: String,

            businessExperience: { type: Boolean, default: false },

            businessType: {
                type: String,
                enum: ["Individual", "Firm", "Company"],
            },

            experienceDescription: String,

            outletDetails: String,

            panNumber: {
                type: String,
                uppercase: true,
                trim: true,
            },

            gstNumber: {
                type: String,
                uppercase: true,
                trim: true,
            },

            sapCode: String,
            retailOutletDetails: String,
            whyFranchise: String,
            totalFranchiseFee: { type: Number, default: 0 },
        },

        // -------------------------
        // Bank Details
        // -------------------------
        bankDetails: {
            accountNumber: String,
            ifsc: String,
        },

        // -------------------------
        // Verification
        // -------------------------
        verification: {
            // Documents
            panCardDoc: String,
            aadhaarCardDoc: String,
            bankDetailsDoc: String,
            sapCodeDoc: String,

            // Text Fields
            remarks: String,

            // Flags
            kycVerified: { type: Boolean, default: false },
            panVerified: { type: Boolean, default: false },
            aadhaarVerified: { type: Boolean, default: false },
            bankVerified: { type: Boolean, default: false },
            agreementSigned: { type: Boolean, default: false },

            // Required Consents
            termsAccepted: { type: Boolean, default: false, required: true },
        },

        // -------------------------
        // Onboarding
        // -------------------------
        onboarding: {
            profileCreated: { type: Boolean, default: false },
            loginCredentialsSent: { type: Boolean, default: false },

            role: {
                type: String,
                enum: ["owner", "manager", "staff"],
            },

            permissions: [{ type: String }],
        },

        // -------------------------
        // Go Live
        // -------------------------
        goLive: {
            trainingAssigned: { type: Boolean, default: false },
            trainingCompleted: { type: Boolean, default: false },
            catalogAccess: { type: Boolean, default: false },
            pricingConfigured: { type: Boolean, default: false },
            activated: { type: Boolean, default: false },
        },

        // -------------------------
        // Status
        // -------------------------
        status: {
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
            default: "DRAFT",
            index: true,
        },

        statusUpdatedBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        statusUpdatedAt: Date,
        statusReason: String,

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

// -------------------------
// Indexes
// -------------------------

FranchiseSchema.index(
    { "businessDetails.panNumber": 1 },
    { unique: true, sparse: true }
);
FranchiseSchema.index({ status: 1, createdAt: -1 });
FranchiseSchema.index({ isDeleted: 1, status: 1 });
FranchiseSchema.index({
    "basicDetails.proprietorName": "text",
    "basicDetails.city": "text",
});

FranchiseSchema.pre("save", function (next) {
    if (!this.franchiseId) {
        this.franchiseId = `FR-${uuidv4().slice(0, 8)}`;
    }
    next();
});

// -------------------------
// Export
// -------------------------
export default mongoose.model("Franchise", FranchiseSchema);