import mongoose, { Schema, Types } from "mongoose";

const STATUS = ["PENDING", "PAID", "FAILED", "REFUNDED"];

const PAYMENT_MODE = ["ONLINE", "CASH", "CHEQUE", "UPI", "BANK_TRANSFER", "OTHER"]

const PaymentSchema = new Schema(
    {
        franchise: {
            type: Types.ObjectId,
            ref: "Franchise",
            required: true,
            index: true,
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
            enum: STATUS,
            default: "PENDING",
            index: true,
        },

        paymentMode: {
            type: String,
            enum: PAYMENT_MODE,
        },

        // 🔥 Gateway tracking
        provider: {
            type: String,
            enum: ["RAZORPAY", "STRIPE", "MANUAL"],
            default: "MANUAL",
        },

        transactionId: String, // gateway txn id
        orderId: {
            type: String,
            index: true,
        },       // your internal order id

        attempt: {
            type: Number,
            default: 1,
        },

        // 🔥 Useful for debugging / reconciliation
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },

        paidAt: Date,

        // 🔥 Refund support (future-safe)
        refundedAt: Date,
        refundAmount: mongoose.Schema.Types.Decimal128,
        failureReason: String,

        // optional but useful
        receiptUrl: String,

        // soft delete
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

// -------------------------
// Hooks
// -------------------------

PaymentSchema.pre("save", function (next) {
    // validate online payments
    if (this.provider !== "MANUAL") {
        if (!this.orderId || !this.transactionId) {
            return next(
                new Error("orderId & transactionId required for online payments")
            );
        }
    }

    // status transition guard
    if (this.isModified("status")) {
        const prev = this.$locals?.prevStatus;
        if (prev) {
            const allowed = VALID_TRANSITIONS[prev] || [];
            if (!allowed.includes(this.status)) {
                return next(
                    new Error(`Invalid status transition: ${prev} → ${this.status}`)
                );
            }
        }
    }

    // auto paidAt
    if (this.isModified("status") && this.status === "PAID") {
        this.paidAt = new Date();
    }

    // auto refundedAt
    if (this.isModified("status") && this.status === "REFUNDED") {
        this.refundedAt = new Date();
    }

    // Decimal128 safe comparison
    if (this.refundAmount && this.amount) {
        const amount = parseFloat(this.amount.toString());
        const refund = parseFloat(this.refundAmount.toString());

        if (refund > amount) {
            return next(new Error("Refund cannot exceed payment amount"));
        }
    }

    next();
});


// -------------------------
// Indexes
// -------------------------

// orderId uniqueness (only when exists)
PaymentSchema.index(
    { orderId: 1 },
    { unique: true, sparse: true }
);

// transaction uniqueness per provider
PaymentSchema.index(
    { provider: 1, transactionId: 1 },
    { unique: true, sparse: true }
);

// performance indexes
PaymentSchema.index({ franchise: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ paidBy: 1, createdAt: -1 });
PaymentSchema.index({ type: 1, status: 1 });


// -------------------------
// Virtual (DX)
// -------------------------

PaymentSchema.virtual("amountInNumber").get(function () {
    return this.amount ? parseFloat(this.amount.toString()) : 0;
});


// -------------------------
// Export
// -------------------------
export default mongoose.model("Payment", PaymentSchema);