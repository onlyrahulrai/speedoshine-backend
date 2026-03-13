import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Path,
  Body,
  Query,
  Security,
  SuccessResponse,
  Response,
  Request,
} from "tsoa";

import * as QuizService from "../services/quizService";
import {
  QuizAccessResponse,
  QuizListResponse,
  QuizRequest,
  QuizResponse,
  QuizUpdateRequest,
} from "../types/schema/Quiz";

import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";
import { validateManageAssessment } from "../helper/validators/assessment";

@Route("quizzes")
@Tags("Quiz")
export class QuizController extends Controller {
  // @Security("jwt")
  @Get("/")
  @SuccessResponse<QuizListResponse>(
    200,
    "List of quizzes retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid request")
  public async getQuizzes(
    @Query() category?: string,
    @Query() difficulty?: string,
    @Query() tags?: string,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string,
    @Request() req?: any
  ): Promise<QuizListResponse> {
    // Convert comma-separated tags string to array if provided
    const tagsArray = tags ? tags.split(",").map((t) => t.trim()) : undefined;

    const userInfo = req?.user || null;

    return await QuizService.getAllQuizzes(userInfo, {
      category,
      difficulty,
      tags: tagsArray,
      page,
      limit,
      search
    });
  }

  @Security("jwt")
  @Get("{assessmentId}/access")
  @SuccessResponse(200, "Quiz retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid quiz id supplied")
  public async checkQuizAccess(@Request() req: any, @Path() assessmentId: string): Promise<QuizAccessResponse | ErrorMessageResponse> {
    const userId = req.user?._id;

    if (!userId) {
      this.setStatus(400);
      return { message: "Invalid User or unauthorized" } as any;
    }

    try {
      return await QuizService.checkQuizAccessById(userId, assessmentId) as QuizAccessResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || "Failed to update quiz" } as ErrorMessageResponse;
    }
  }

  @Get("{id}")
  @SuccessResponse(200, "Quiz retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid quiz id supplied")
  public async getQuiz(@Path() id: string, @Query() flag?: string,): Promise<QuizResponse | null> {
    return QuizService.getQuizById(id, flag);
  }

  /**
 * Get the Excel report for a specific quiz
 */
  @Get("{id}/participants/excel")
  @SuccessResponse<{ path?: string }>(200, "Quiz report retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid quiz id supplied")
  public async getQuizReportExcel(
    @Path() id: string
  ): Promise<Buffer> {
    // Call a service that generates the Excel report
    return QuizService.generateExcelReport(id);
  }

  @Get("{id}/participants")
  @SuccessResponse<QuizResponse>(200, "Quiz participants retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid quiz id supplied")
  public async getQuizParticipants(
    @Path() id: string,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() status?: string,
    @Query() score?: string,
    @Query() search?: string,
    @Query() source?: string,
  ): Promise<QuizResponse | null> {
    return QuizService.getQuizParticipants(id, source, { status, score, search, page, limit });
  }


  @Security("jwt")
  @Post("/")
  @SuccessResponse<QuizResponse>(201, "Quiz created successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  public async createQuiz(@Body() body: QuizRequest): Promise<QuizResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const errors = await validateManageAssessment(body);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422);
        return { type: "fields", errors };
      }

      return await QuizService.createQuiz(body);
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || "Failed to update quiz" };
    }
  }

  @Security("jwt")
  @Put("{id}")
  @SuccessResponse<QuizResponse>(200, "Quiz updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  public async updateQuiz(
    @Path() id: string,
    @Body() body: QuizUpdateRequest
  ): Promise<QuizResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const errors = await validateManageAssessment(body);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422);
        return { type: "fields", errors };
      }

      const quiz = await QuizService.updateQuiz(id, body);

      return quiz;
    } catch (error: any) {
      console.error("---------- Error creating quiz ----------:", error.message);
      this.setStatus(400);
      return { message: error?.message || "Failed to update quiz" };
    }
  }

  @Security("jwt")
  @Delete("{id}")
  @SuccessResponse<SuccessMessageResponse>(200, "Quiz deleted successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid quiz id supplied")
  public async deleteQuiz(@Path() id: string): Promise<SuccessMessageResponse> {
    await QuizService.deleteQuiz(id);
    return { message: "Quiz deleted successfully" };
  }
}
