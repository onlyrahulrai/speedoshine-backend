import mongoose, { Schema, Document, Types } from "mongoose";

/* ------------------------------------
   ENUMS
------------------------------------ */

export enum TransactionType {
  ASSESSMENT_ATTEMPT = "assessment_attempt",
}

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESSFUL = "successful",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

/* ------------------------------------
   INTERFACE
------------------------------------ */

export interface ITransaction extends Document {
  user?: Types.ObjectId;
  amount: number;
  razorpay_order_id?: string;
  transaction_type: TransactionType;

  resource?: {
    id: Types.ObjectId;
    model: "Quiz"; // restrict for now
  };

  transaction_status: TransactionStatus;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  razorpay_event_id?: string;
  paid_at?: Date;
  error_details?: string;
  metadata: Record<string, any>;

  payment_method?: string,
  currency?: string,
  razorpay_fee?: number,
  razorpay_tax?: number,
  amount_refunded?: number,
  refund_status?: string,

  createdAt: Date;
  updatedAt: Date;
}

/* ------------------------------------
   SCHEMA
------------------------------------ */

const TransactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    razorpay_order_id: {
      type: String,
      required: true,
    },

    transaction_type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },

    resource: {
      id: {
        type: Schema.Types.ObjectId,
        refPath: "resource.model", // 🔥 dynamic reference
      },
      model: {
        type: String,
        enum: ["Quiz"], // add more later
      },
    },

    transaction_status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true,
    },

    razorpay_payment_id: {
      type: String,
      index: true
    },

    razorpay_signature: {
      type: String,
    },

    razorpay_event_id: {
      type: String,
      index: true,
    },

    paid_at: {
      type: Date,
    },

    error_details: {
      type: String,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },

    payment_method: { type: String },
    currency: { type: String, default: "INR" },
    razorpay_fee: { type: Number },
    razorpay_tax: { type: Number },
    amount_refunded: { type: Number, default: 0 },
    refund_status: { type: String },
  },
  {
    timestamps: true,
  }
);

/* Unique index to prevent duplicate orders */
TransactionSchema.index(
  { razorpay_order_id: 1 },
  { unique: true }
);

/* ------------------------------------
   MODEL
------------------------------------ */

const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema
);

export default Transaction;