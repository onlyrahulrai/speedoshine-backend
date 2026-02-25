import crypto from "crypto";
import TransactionModel, { TransactionStatus } from "../models/Transaction";

export const razorpay = async (req: any) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const razorpay_signature = req.headers["x-razorpay-signature"];
    const eventId = req.headers["x-razorpay-event-id"];

    if (!razorpay_signature) {
        throw new Error("Missing Razorpay signature");
    }

    if (!eventId) {
        throw new Error("Missing Razorpay event id");
    }

    const payload = req.body; // 🔥 This is raw Buffer

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

    if (razorpay_signature !== expectedSignature) {
        throw new Error("Invalid webhook signature");
    }

    const parsed = JSON.parse(payload.toString());
    const event = parsed.event;
    const payment = parsed.payload?.payment?.entity;

    if (!payment?.order_id) {
        return { message: "Invalid webhook payload" };
    }

    const alreadyProcessed = await TransactionModel.findOne({
        razorpay_event_id: eventId,
    });

    if (alreadyProcessed) {
        return { message: "Duplicate webhook ignored" };
    }

    const transaction = await TransactionModel.findOne({
        razorpay_order_id: payment.order_id,
    });

    if (!transaction) {
        return { message: "Transaction not found" };
    }

    transaction.razorpay_payment_id = payment.id;
    transaction.razorpay_event_id = eventId;
    transaction.razorpay_signature = razorpay_signature;
    transaction.payment_method = payment.method
    transaction.currency = payment.currency
    transaction.razorpay_fee = payment.fee ?? 0;
    transaction.razorpay_tax = payment.tax ?? 0;
    transaction.amount_refunded = payment.amount_refunded ?? 0;
    transaction.metadata = payment;

    if (
        event === "payment.captured" &&
        transaction.transaction_status !== TransactionStatus.SUCCESSFUL
    ) {
        transaction.transaction_status = TransactionStatus.SUCCESSFUL;
    }

    if (event === "payment.failed") {
        transaction.transaction_status = TransactionStatus.FAILED;
        transaction.error_details = payment.error_description || "Payment failed";
    }

    await transaction.save();

    return { message: "Webhook processed successfully" };
};