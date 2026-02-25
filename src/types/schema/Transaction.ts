import { TransactionStatus, TransactionType } from "../../models/Transaction";

export type TransactionRequest = {
  amount: number;
  transaction_type: string;
  metadata?: any; // for any additional info like assessmentId
  notes?: any
};

// For tsoa (API schema)
export interface TransactionResponse {
  _id?: string;
  user?: string; // or Types.ObjectId if you want, but string is safer for tsoa
  amount: number;
  transaction_id?: string;
  transaction_type: TransactionType;
  resource?: {
    id: string;
    model: "Assessment";
  };
  transaction_status: TransactionStatus;
  razorpay_payment_id?: string;
  error_details?: string;
  createdAt: Date;
  updatedAt: Date;
  _v?: number; // optional, as it may not be needed in responses
}

