import {
  Controller,
  Get,
  Post,
  Put,
  Route,
  Tags,
  Path,
  Body,
  Request,
  Security,
  SuccessResponse,
  Response,
  Query,
} from "tsoa";

import * as QuizAttemptService from "../services/quizAttemptService";
import {
  QuizAttemptResponse,
} from "../types/schema/QuizAttempt";

import { ErrorMessageResponse } from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";
import { QuestionResponse } from "../types/schema/Question";

@Route("quiz-attempts")
@Tags("QuizAttempt")
export class QuizAttemptController extends Controller {
  @Security("jwt")
  @Get("/")
  @SuccessResponse<QuizAttemptResponse>(200, "Quiz attempt retrieved")
  @Response<ErrorMessageResponse>(400, "Invalid attempt id")
  public async getAttempts(
    @Request() req?: any,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<QuizAttemptResponse> {
    const userId = req.user?._id;

    if (!userId) {
      this.setStatus(400);
      return { message: "Invalid attempt id or user" } as any;
    }

    return QuizAttemptService.getAttempts(userId, page, limit);
  }

  @Security("jwt")
  @Post("start/{quizId}")
  @SuccessResponse<QuizAttemptResponse>(201, "Quiz attempt started")
  @Response<ErrorMessageResponse>(400, "Invalid quiz id or user")
  public async startAttempt(
    @Request() req: any,
    @Path() quizId: string,
    @Body() body?: { licenseKey?: string },
  ): Promise<QuizAttemptResponse> {
    const userId = req.user?._id;

    if (!quizId || !userId) {
      this.setStatus(400);
      return { message: "Invalid quiz id or user" } as any;
    }

    return QuizAttemptService.startAttempt(quizId, userId, body?.licenseKey);
  }

  @Security("jwt")
  @Put("{attemptId}/submit")
  @SuccessResponse<QuizAttemptResponse>(200, "Answers submitted")
  @Response<ErrorMessageResponse>(400, "Invalid attempt id or answers")
  public async submitAnswers(
    @Path() attemptId: string,
    @Request() req: any,
  ): Promise<QuizAttemptResponse> {
    const userId = req.user?._id;

    if (!attemptId || !userId) {
      this.setStatus(400);
      return { message: "Invalid quiz id or user" } as any;
    }

    return QuizAttemptService.submitAnswers(attemptId, userId);
  }

  @Security("jwt")
  @Put("{attemptId}")
  @SuccessResponse<QuizAttemptResponse>(200, "Quiz attempt updated successfully")
  @Response<ErrorMessageResponse>(400, "Failed to update quiz attempt: invalid attempt ID or request data")
  public async editAttempt(
    @Path() attemptId?: string,
    @Request() req: any,
    @Body() body?: any,
  ): Promise<QuizAttemptResponse> {
    const userId = req.user?._id;

    if (!attemptId || !userId) {
      this.setStatus(400);
      return { message: "Invalid attempt ID or unauthorized user" } as any;
    }

    return QuizAttemptService.editAttempt(attemptId, body);
  }

  @Security("jwt")
  @Post("{attemptId}/reports/save")
  @SuccessResponse<QuizAttemptResponse>(200, "Quiz attempt Report retrieved")
  @Response<ErrorMessageResponse>(400, "Invalid attempt id")
  public async saveGeneratedAttemptReport(
    @Request() req: any,
    @Path() attemptId: string,
    @Body() body: { reports?: string }
  ): Promise<QuizAttemptResponse> {
    try {
      const { reports } = body;

      if (!attemptId) {
        this.setStatus(400);
        return { message: "Invalid attempt id" } as any;
      }

      if (!reports || typeof reports !== "string") {
        this.setStatus(400);
        return { message: "Invalid report data" } as any;
      }

      return await QuizAttemptService.saveGeneratedAttemptReport({
        reports,
        attemptId
      });
    } catch (error: any) {
      console.error("Error saving report:", error);
      this.setStatus(500);
      return { message: error.message || "Failed to save report" } as any;
    }
  }

  @Security("jwt")
  @Post("{attemptId}/reports")
  @SuccessResponse<QuizAttemptResponse>(200, "Quiz attempt Report retrieved")
  @Response<ErrorMessageResponse>(400, "Invalid attempt id")
  public async generateAttemptReport(
    @Request() req: any,
    @Path() attemptId: string,
  ): Promise<QuizAttemptResponse> {
    const userId = req.user?._id;

    if (!attemptId || !userId) {
      this.setStatus(400);
      return { message: "Invalid attempt id or user" } as any;
    }

    // Access multipart form data from request
    const { customPrompt } = req.body;

    const excelFile = req.file; // File uploaded via multer

    return QuizAttemptService.generateAttemptReport({
      customPrompt,
      excelFile,
      attemptId,
    });
  }

  @Security("jwt")
  @Get("{attemptId}")
  @SuccessResponse<QuizAttemptResponse>(200, "Quiz attempt retrieved")
  @Response<ErrorMessageResponse>(400, "Invalid attempt id")
  public async getAttempt(
    @Request() req: any,
    @Path() attemptId: string,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<QuizAttemptResponse> {
    const userId = req.user?._id;

    if (!attemptId || !userId) {
      this.setStatus(400);
      return { message: "Invalid attempt id or user" } as any;
    }

    return QuizAttemptService.getAttemptQuestions(attemptId, userId, page, limit);
  }

  @Security("jwt")
  @Post("{attemptId}/save-answer")
  @SuccessResponse<QuestionResponse>(
    200,
    "Next question retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(
    400,
    "Invalid attempt id or no more questions"
  )
  public async saveAnswer(
    @Request() req: any,
    @Path() attemptId?: string,
    @Body()
    body: {
      questionId: string;
      selectedOptions?: string[]; // for multiple_choice, radio_choice, true_false
      textAnswer?: string; // for essay, short_answer, fill_blank
    },
  ): Promise<QuestionResponse> {
    const userId = req.user?._id;

    if (!userId) throw new Error("Authentication required");

    return await QuizAttemptService.saveAnswer({
      attemptId,
      questionId: body.questionId,
      userId,
      selectedOptions: body.selectedOptions,
      textAnswer: body.textAnswer,
    });;
  }
}
