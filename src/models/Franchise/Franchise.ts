import mongoose, { Schema, Types } from "mongoose";

const FranchiseSchema = new Schema(
    {
        franchiseId: { type: String, unique: true, index: true },

        owner: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
        },

        createdBy: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        createdByRole: {
            type: String,
            enum: ["ADMIN", "USER", "SYSTEM"],
            required: true,
            index: true,
        },

        source: {
            type: String,
            enum: ["SELF_SIGNUP", "ADMIN_PANEL", "SALES_TEAM", "API"],
        },

        basicDetails: {
            proprietorName: String,
            contactNumber: String,
            email: String,
            address: String,
            pincode: String,
        },

        businessDetails: {
            outletDetails: String,
            businessType: String,
            panNumber: String,
        },

        bankDetails: {
            accountNumber: String,
            ifsc: String,
        },

        verification: {
            kycVerified: Boolean,
            panVerified: Boolean,
            aadhaarVerified: Boolean,
            bankVerified: Boolean,
            agreementSigned: Boolean,
            termsAccepted: Boolean,
        },

        onboarding: {
            profileCreated: Boolean,
            loginCredentialsSent: Boolean,
            role: String,
            permissions: [String],
        },

        goLive: {
            trainingAssigned: Boolean,
            trainingCompleted: Boolean,
            catalogAccess: Boolean,
            pricingConfigured: Boolean,
            activated: Boolean,
        },

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
            ],
            index: true,
        },

        statusUpdatedBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        statusUpdatedAt: Date,

        statusReason: String,

        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model("Franchise", FranchiseSchema);