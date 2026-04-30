import {
    Controller,
    Get,
    Post,
    Path,
    Route,
    Tags,
    Body,
    SuccessResponse,
    Response,
    Security,
    Request,
    Query,
} from "tsoa";
import * as franchiseService from "../services/franchiseService";
import {
    ApplyFranchiseRequest,
    FranchiseListResponse,
    FranchiseResponse,
} from "../types/schema/Franchise";
import {
    ErrorMessageResponse,
    FieldValidationError,
} from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";
import { validateApplyFranchiseStep } from "../helper/validators/franchise";

@Route("franchises")
@Tags("Franchise")
export class FranchiseController extends Controller {
    @Security("jwt")
    @Post("/apply")
    @SuccessResponse(200, "Franchise application processed successfully")
    @Response<AuthenticationRequiredResponse>(401, "Authentication required")
    @Response<FieldValidationError>(422, "Validation Failed")
    @Response<ErrorMessageResponse>(400, "Failed to process franchise application")
    public async applyFranchise(
        @Request() req: any,
        @Query() step: "BASIC" | "BUSINESS" | "BANK_DETAILS" | "VERIFICATION",
        @Body() body: ApplyFranchiseRequest
    ): Promise<FranchiseResponse | ErrorMessageResponse | FieldValidationError> {
        try {
            const userId = req.user?._id;

            if (!userId) {
                this.setStatus(401);
                return { message: "Authentication required" };
            }

            // 1. Validate the request body step-wise
            const fields = validateApplyFranchiseStep(step, body);

            if (Object.keys(fields).length > 0) {
                this.setStatus(422);
                return { fields };
            }

            // 2. Delegate to the service layer to process the partial/full save
            const result = await franchiseService.saveFranchiseApplicationStep(
                userId,
                step,
                body
            );

            // Return 201 if a new franchise logic occurred, or 200 for updates
            this.setStatus(body.franchiseId ? 200 : 201);

            return result as unknown as FranchiseResponse;
        } catch (error: any) {
            this.setStatus(400);

            return {
                message: error.message || "Failed to process franchise application",
            };
        }
    }

    /**
     * Admin-initiated franchise registration
     */
    @Security("jwt")
    @Post("/register")
    @SuccessResponse(200, "Franchise registration processed successfully")
    @Response<AuthenticationRequiredResponse>(401, "Authentication required")
    @Response<FieldValidationError>(422, "Validation Failed")
    @Response<ErrorMessageResponse>(400, "Failed to register franchise")
    public async registerFranchise(
        @Request() req: any,
        @Query() step: "BASIC" | "BUSINESS" | "BANK_DETAILS" | "VERIFICATION",
        @Body() body: ApplyFranchiseRequest
    ): Promise<FranchiseResponse | ErrorMessageResponse | FieldValidationError> {
        try {
            const userId = req.user?._id;
            const userRole = req.user?.role || "USER";

            if (!userId) {
                this.setStatus(401);
                return { message: "Authentication required" };
            }

            // 1. Validate the request body
            const fields = validateApplyFranchiseStep(step, body);
            if (Object.keys(fields).length > 0) {
                this.setStatus(422);
                return { fields };
            }

            // 2. Delegate with ADMIN context
            const result = await franchiseService.saveFranchiseApplicationStep(
                userId,
                step,
                body,
                { source: "ADMIN_PANEL", role: "ADMIN" }
            );

            this.setStatus(body.franchiseId ? 200 : 201);
            return result as unknown as FranchiseResponse;
        } catch (error: any) {
            this.setStatus(400);
            return {
                message: error.message || "Failed to process franchise registration",
            };
        }
    }

    /**
     * Retrieves all franchise applications submitted by the logged-in user.
     */
    @Security("jwt")
    @Get("/")
    @Response<AuthenticationRequiredResponse>(401, "Authentication required")
    @Response<ErrorMessageResponse>(400, "Failed to retrieve applications")
    public async getApplications(
        @Request() req: any,
        @Query() status?: string,
        @Query() page?: string,
        @Query() limit?: string
    ): Promise<FranchiseListResponse> {
        const userId = req.user?._id;

        const isAdmin = req.user?.roles?.map((role: any) => role.name).includes("Admin");

        return (await franchiseService.getFranchiseApplications(
            userId,
            isAdmin, {
            status,
            page,
            limit
        }
        )) as unknown as FranchiseListResponse;
    }

    /**
     * Retrieves the full details of a specific franchise application for the dossier view.
     */
    @Security("jwt")
    @Get("/{id}")
    @Response<AuthenticationRequiredResponse>(401, "Authentication required")
    @Response<ErrorMessageResponse>(404, "Application not found")
    public async getApplicationDetail(
        @Request() req: any,
        @Path() id: string
    ): Promise<FranchiseResponse | ErrorMessageResponse> {
        try {
            const userId = req.user?._id;

            const isAdmin = req.user?.roles?.map((role: any) => role.name).includes("Admin");

            const application = await franchiseService.getFranchiseApplicationById(
                id,
                userId,
                isAdmin
            );

            return application as unknown as FranchiseResponse;
        } catch (error: any) {
            this.setStatus(404);
            return {
                message: error.message || "Application not found",
            };
        }
    }
}
