import UserModel from "../models/User";
import TransactionModel, { ITransaction, TransactionStatus, TransactionType } from "../models/Transaction";
import { Types } from "mongoose";
import { TransactionRequest } from "../types/schema/Transaction";
import { PaginatedResponse } from "../types/schema/Common";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

export const getTransactions = async (
    page: number = 1,
    limit: number = 10,
    params: Record<string, any> = {}
): Promise<PaginatedResponse<ITransaction>> => {
    try {
        const effectivePage = Math.max(1, page);
        const effectiveLimit = Math.max(1, Math.min(limit, 100));
        const skip = (effectivePage - 1) * effectiveLimit;

        const filter: Record<string, any> = {};

        Object.assign(filter, params);

        const transactions = await TransactionModel.find(filter)
            .lean()
            .select("-__v -metadata")
            .populate("user", "name email phone")
            .populate({
                path: "resource.id",
                select: "title type fees name"
            })
            .skip(skip)
            .limit(effectiveLimit)
            .sort({ createdAt: -1 });

        const total = await TransactionModel.countDocuments(filter);

        return {
            page: effectivePage,
            limit: effectiveLimit,
            total,
            has_next: skip + transactions.length < total,
            has_prev: effectivePage > 1,
            results: transactions
        };
    } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
    }
};

export const getTransactionById = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) return null;

    return await TransactionModel.findById(id)
        .populate("user", "name email phone")
        .lean();
};

export const getTransactionsByUser = async (userId: string) => {
    if (!Types.ObjectId.isValid(userId)) return [];

    return await TransactionModel.find({ user: new Types.ObjectId(userId) })
        .populate("user", "name email phone")
        .lean();
};

export const createTransaction = async (userId: string, values: Record<string, any>) => {
    const { amount, transaction_type, notes, metadata } = values;

    try {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new Error("User not found");
        }

        const formattedNotes =
            typeof notes === "object" && notes !== null
                ? notes
                : { message: notes || "" };

        // console.log("Values: ", values);

        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100, // in paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                transaction_type,
                ...formattedNotes,
            },
        });

        const body: any = {
            user: new Types.ObjectId(userId),
            transaction_type,
            razorpay_order_id: razorpayOrder.id,
            amount,
            transaction_status: TransactionStatus.PENDING,
        };

        switch (transaction_type) {
            case TransactionType.ASSESSMENT_ATTEMPT:
                if (metadata?.id && metadata?.model) {
                    body.resource = {
                        id: new Types.ObjectId(metadata.id),
                        model: metadata.model, // must match enum: "Assessment"
                    };
                }
                break;

            default:
                break;
        }

        const transaction = await TransactionModel.create(body);

        return transaction;
    } catch (error) {
        console.error("Error creating transaction:", error);
        throw error;
    }
};

export const updateTransaction = async (id: string, body: TransactionRequest) => {
    if (!Types.ObjectId.isValid(id)) return null;

    return await TransactionModel.findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true,
    }).select("-__v")
};

export const cancelTransaction = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) return null;

    return await TransactionModel.findByIdAndUpdate(id, {
        transaction_status: TransactionStatus.CANCELLED,
    }, {
        new: true,
        runValidators: true,
    }).select("-__v")
};