import {
    Controller,
    Post,
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
        @Query() step: "BASIC" | "BUSINESS" | "VERIFICATION",
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
}
