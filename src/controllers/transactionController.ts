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
import { TransactionStatus } from "../models/Transaction";

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
        @Query() source?: string
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

            if (authenticatedUser?.role !== "Admin" && source !== "Admin") {
                filters.user = new Types.ObjectId(authenticatedUser._id);
                filters.transaction_status = { $ne: TransactionStatus.PENDING }
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

    @Security("jwt")
    @Post("{id}/cancel")
    @SuccessResponse(200, "Transaction cancelled")
    public async cancelTransaction(
        @Path() id: string
    ): Promise<TransactionResponse | null> {
        try {
            return await TransactionService.cancelTransaction(id) as TransactionResponse | null;
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
}