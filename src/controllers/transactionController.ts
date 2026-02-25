import {
    Controller,
    Get,
    Post,
    Put,
    Route,
    Tags,
    Path,
    Request,
    Body,
    SuccessResponse,
    Query,
    Security
} from "tsoa";

import {
    TransactionRequest,
    TransactionResponse,
} from "../types/schema/Transaction";

import * as TransactionService from "../services/transactionService";
import { PaginatedResponse } from "../types/schema/Common";
import { Types } from "mongoose";

@Route("transactions")
@Tags("Transactions")
export class TransactionController extends Controller {

    /* ------------------------------------
       GET ALL TRANSACTIONS
    ------------------------------------ */
    @Security("jwt")
    @Get("/")
    @SuccessResponse(200, "Transactions retrieved")
    public async getTransactions(
        @Request() req: any,
        @Query() page: number = 1,
        @Query() limit: number = 10,
        @Query() transaction_type?: string,
        @Query() user?: string,
    ): Promise<PaginatedResponse<any>> {
        try {
            const filters: Record<string, any> = {};

            if (transaction_type) {
                filters.transaction_type = transaction_type;
            }

            if (user) {
                filters.user = new Types.ObjectId(user);
            }

            const authenticatedUser = req.user;

            if (authenticatedUser?.role !== "Admin") {
                filters.user = new Types.ObjectId(authenticatedUser._id);
            }

            return await TransactionService.getTransactions(page, limit, filters);
        } catch (error: any) {
            this.setStatus(500);
            throw new Error(error.message || "Failed to fetch transactions");
        }
    }
    /* ------------------------------------
       GET SINGLE TRANSACTION
    ------------------------------------ */
    @Security("jwt")
    @Get("{id}")
    @SuccessResponse(200, "Transaction retrieved")
    public async getTransaction(
        @Path() id: string
    ): Promise<TransactionResponse | null> {
        try {
            return await TransactionService.getTransactionById(id) as TransactionResponse | null;
        } catch (error: any) {
            this.setStatus(500);
            throw new Error(error.message || "Failed to fetch transaction");
        }
    }

    /* ------------------------------------
       CREATE TRANSACTION
    ------------------------------------ */
    @Security("jwt")
    @Post("/")
    @SuccessResponse(201, "Transaction created")
    public async createTransaction(
        @Request() req: any,
        @Body() body: TransactionRequest
    ): Promise<TransactionResponse> {
        try {
            const userId = req.user?._id;

            if (!userId) {
                this.setStatus(400);
                throw new Error("Invalid user");
            }

            const transaction = await TransactionService.createTransaction(userId, body);

            this.setStatus(201);

            return transaction as TransactionResponse;
        } catch (error: any) {
            this.setStatus(400);
            throw new Error(error.message || "Failed to create transaction");
        }
    }

    /* ------------------------------------
       UPDATE TRANSACTION
    ------------------------------------ */
    @Security("jwt")
    @Put("{id}")
    @SuccessResponse(200, "Transaction updated")
    public async updateTransaction(
        @Path() id: string,
        @Body() body: TransactionRequest
    ): Promise<TransactionResponse | null> {
        try {
            const updated = await TransactionService.updateTransaction(id, body);

            if (!updated) {
                this.setStatus(404);
                return null;
            }

            return updated as TransactionResponse;
        } catch (error: any) {
            this.setStatus(400);
            throw new Error(error.message || "Failed to update transaction");
        }
    }

    /* ------------------------------------
       VERIFY PAYMENT
    ------------------------------------ */
    @Security("jwt")
    @Post("{id}/verify")
    @SuccessResponse(200, "Transaction verified")
    public async verifyTransaction(
        @Path() id: string,
        @Body() body: any // Razorpay verification payload
    ): Promise<TransactionResponse | null> {
        try {
            return await TransactionService.verifyTransaction(id, body) as TransactionResponse;
        } catch (error: any) {
            this.setStatus(400);
            throw new Error(error.message || "Payment verification failed");
        }
    }

    /* ------------------------------------
       REFUND TRANSACTION
    ------------------------------------ */
    @Security("jwt")
    @Post("{id}/refund")
    @SuccessResponse(200, "Transaction refunded")
    public async refundTransaction(
        @Path() id: string
    ): Promise<TransactionResponse | null> {
        try {
            return await TransactionService.refundTransaction(id) as TransactionResponse;
        } catch (error: any) {
            this.setStatus(400);
            throw new Error(error.message || "Refund failed");
        }
    }
}