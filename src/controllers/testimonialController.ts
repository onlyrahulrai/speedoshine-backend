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
    // If the request is for non-published testimonials, require authentication at runtime
    if (flag !== "published") {
      try {
        // expressAuthentication will throw if token is missing/invalid
        await expressAuthentication(req as ExpressRequest, "jwt");
      } catch (err) {
        // rethrow so tsoa/express returns 401 as configured by @Response
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
