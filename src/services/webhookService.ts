import crypto from "crypto";
import TransactionModel, { TransactionStatus, TransactionType } from "../models/Transaction";

export const razorpay = async (req: any) => {
    try {
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
            provider_order_id: payment.order_id,
        });

        if (!transaction) {
            return { message: "Transaction not found" };
        }

        if (transaction.transaction_status === TransactionStatus.SUCCESSFUL) {
            return { message: "Transaction already successful" };
        }

        transaction.provider_payment_id = payment.id;
        transaction.provider_event_id = eventId;
        transaction.provider_signature = razorpay_signature;
        transaction.payment_method = payment.method
        transaction.currency = payment.currency
        transaction.provider_fee = payment.fee ?? 0;
        transaction.provider_tax = payment.tax ?? 0;
        transaction.amount_refunded = payment.amount_refunded ?? 0;
        transaction.metadata = payment;

        if (
            event === "payment.captured" &&
            payment.status === "captured"
        ) {
            transaction.transaction_status = TransactionStatus.SUCCESSFUL;

            await transaction.save();

            if (transaction.transaction_type === TransactionType.ASSESSMENT_ATTEMPT) {
                if (!transaction.resource?.id) {
                    throw new Error("Missing assessment reference");
                }
            }
            return { message: "Payment processed successfully" };
        }

        if (event === "payment.failed") {
            transaction.transaction_status = TransactionStatus.FAILED;
            transaction.error_details = payment.error_description || "Payment failed";
            await transaction.save();
        }

        return { message: "Webhook processed successfully" };
    } catch (error: any) {
        throw new Error(error.message || "Failed to process webhook");
    }
};