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
  Security,
  SuccessResponse,
  Response,
  Query,
  Request,
} from "tsoa";
import * as TestimonialService from "../services/testimonialService";
import { Request as ExpressRequest } from "express";
import { expressAuthentication } from "../auth/expressAuthentication";
import {
  TestimonialListResponse,
  TestimonialRequest,
  TestimonialResponse,
} from "../types/schema/Testimonial";
import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";

@Route("testimonials")
@Tags("Testimonial")
export class TestimonialController extends Controller {
  /**
   * TestimonialController
   *
   * Exposes endpoints for managing testimonials.
   * - `getTestimonials` is public for `flag=published` (default).
   * - For any other `flag` value (e.g. `draft`, `private`), the controller
   *   enforces runtime JWT authentication using `expressAuthentication`.
   * - Other CRUD endpoints use `@Security("jwt")` and require authentication.
   */
  /** Get all testimonials with pagination */
  @Get("/")
  @SuccessResponse<TestimonialListResponse>(
    200,
    "List of testimonials retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid request")
  public async getTestimonials(
    @Request() req?: any,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() flag?: string = "published"
  ): Promise<TestimonialListResponse> {
    // Conditional auth: only require JWT for non-published testimonials
    // Published testimonials (default) are publicly accessible
    if (flag !== "published") {
      try {
        await expressAuthentication(req as ExpressRequest, "jwt");
      } catch (err) {
        const e: any = new Error("Authentication required");
        e.status = 401;
        throw e;
      }
    }

    return await TestimonialService.getAllTestimonials(page, limit, flag);
  }

  /** Get testimonial by ID */
  @Security("jwt")
  @Get("{id}")
  @SuccessResponse<TestimonialResponse>(200, "Testimonial retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid testimonial id supplied")
  public async getTestimonial(@Path() id: string): Promise<TestimonialResponse | null> {
    return await TestimonialService.getTestimonialById(id);
  }

  /** Create new testimonial */
  @Security("jwt")
  @Post("/")
  @SuccessResponse<TestimonialResponse>(201, "Testimonial created successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  public async createTestimonial(@Body() body: TestimonialRequest): Promise<TestimonialResponse> {
    return await TestimonialService.createTestimonial(body);
  }

  /** Update existing testimonial */
  @Security("jwt")
  @Put("{id}")
  @SuccessResponse<TestimonialResponse>(200, "Testimonial updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  public async updateTestimonial(
    @Path() id: string,
    @Body() body: TestimonialRequest
  ): Promise<TestimonialResponse> {
    return await TestimonialService.updateTestimonial(id, body);
  }

  /** Delete testimonial */
  @Security("jwt")
  @Delete("{id}")
  @SuccessResponse<SuccessMessageResponse>(200, "Testimonial deleted successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid testimonial id supplied")
  public async deleteTestimonial(@Path() id?: string): Promise<SuccessMessageResponse> {
    await TestimonialService.deleteTestimonial(id);
    return { message: "Testimonial deleted successfully" };
  }
}
