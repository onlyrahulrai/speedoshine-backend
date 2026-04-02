import mongoose, { Schema, Types } from "mongoose";

const PaymentSchema = new Schema(
    {
        franchise: {
            type: Types.ObjectId,
            ref: "Franchise",
            index: true,
            required: true,
        },

        paidBy: {
            type: Types.ObjectId,
            ref: "User",
            index: true,
        },

        type: {
            type: String,
            enum: ["BOOKING", "ONBOARDING", "REGISTRATION"],
            required: true,
            index: true,
        },

        // ✅ FIX: Use Decimal128
        amount: {
            type: mongoose.Schema.Types.Decimal128,
            required: true,
        },

        currency: {
            type: String,
            default: "INR",
        },

        status: {
            type: String,
            enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
            default: "PENDING",
            index: true,
        },

        paymentMode: {
            type: String,
            enum: ["ONLINE", "CASH", "CHEQUE", "UPI", "BANK_TRANSFER"],
        },

        // 🔥 Gateway tracking
        provider: {
            type: String,
            enum: ["RAZORPAY", "STRIPE", "MANUAL"],
            default: "MANUAL",
        },

        transactionId: String, // gateway txn id
        orderId: String,       // your internal order id

        // 🔥 Useful for debugging / reconciliation
        metadata: {
            type: Schema.Types.Mixed,
        },

        paidAt: Date,

        // 🔥 Refund support (future-safe)
        refundedAt: Date,
        refundAmount: mongoose.Schema.Types.Decimal128,
    },
    { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);