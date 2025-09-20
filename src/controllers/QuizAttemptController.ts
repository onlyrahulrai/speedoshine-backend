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
  SubmitAnswersRequest,
} from "../types/schema/QuizAttempt";

import { ErrorMessageResponse } from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";
import { QuestionResponse } from "../types/schema/Question";

@Route("quiz-attempts")
@Tags("QuizAttempt")
export class QuizAttemptController extends Controller {
  @Security("jwt")
  @Post("start/{quizId}")
  @SuccessResponse<QuizAttemptResponse>(201, "Quiz attempt started")
  @Response<ErrorMessageResponse>(400, "Invalid quiz id or user")
  public async startAttempt(
    @Request() req: any,
    @Path() quizId: string
  ): Promise<QuizAttemptResponse> {
    const userId = req.user?._id;

    if (!quizId || !userId) {
      this.setStatus(400);
      return { message: "Invalid quiz id or user" } as any;
    }

    return QuizAttemptService.startAttempt(quizId, userId);
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
    @Path() attemptId: string,
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
