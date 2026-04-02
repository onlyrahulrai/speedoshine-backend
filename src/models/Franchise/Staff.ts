import mongoose, { Schema, Types } from "mongoose";

const StaffSchema = new Schema(
    {
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

        name: String,
        role: String,
        phone: String,
        email: String,

        aadhaarNumber: String,
        panNumber: String,

        bankDetails: {
            accountNumber: String,
            ifsc: String,
        },

        status: {
            type: String,
            enum: ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"],
            index: true,
        },

        trainingStatus: String,
        trainingProgress: Number,

        loginAccess: {
            type: Boolean,
            default: false,
        },

        rejectionReason: String,

        submittedAt: Date,
    },
    { timestamps: true }
);

export default mongoose.model("Staff", StaffSchema);