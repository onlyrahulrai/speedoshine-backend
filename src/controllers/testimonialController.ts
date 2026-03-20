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
} from "tsoa";
import * as TestimonialService from "../services/testimonialService";
import {
  TestimonialListResponse,
  CreateTestimonialRequest,
  UpdateTestimonialRequest,
  TestimonialDetailsResponse,
} from "../types/schema/Testimonial";
import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";
import { validateManageTestimonials } from "../helper/validators/testimonials";

@Route("testimonials")
@Tags("Testimonial")
export class TestimonialController extends Controller {
  /** Get all testimonials with pagination */
  @Get("/")
  @SuccessResponse(
    200,
    "List of testimonials retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid request")
  public async getTestimonials(
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<TestimonialListResponse | ErrorMessageResponse> {
    try {
      return await TestimonialService.getAllTestimonials(page, limit);
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || "Failed to fetch testimonials" };
    }
  }

  /** Get testimonial by ID */
  @Security("jwt")
  @Get("{id}")
  @SuccessResponse(200, "Testimonial retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid testimonial id supplied")
  public async getTestimonial(@Path() id: string): Promise<TestimonialDetailsResponse | ErrorMessageResponse | null> {
    try {
      return await TestimonialService.getTestimonialById(id) as unknown as TestimonialDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || "Failed to fetch testimonial" };
    }
  }

  /** Create new testimonial */
  @Security("jwt")
  @Post("/")
  @SuccessResponse(201, "Testimonial created successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  public async createTestimonial(@Body() body: CreateTestimonialRequest): Promise<TestimonialDetailsResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const fields: Record<string, string> = validateManageTestimonials(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await TestimonialService.createTestimonial(body) as unknown as TestimonialDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || "Failed to create testimonial" };
    }
  }

  /** Update existing testimonial */
  @Security("jwt")
  @Put("{id}")
  @SuccessResponse(200, "Testimonial updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  public async updateTestimonial(
    @Path() id: string,
    @Body() body: UpdateTestimonialRequest
  ): Promise<TestimonialDetailsResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const fields: Record<string, string> = validateManageTestimonials(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);

        return { fields };
      }

      return await TestimonialService.updateTestimonial(id, body) as unknown as TestimonialDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || "Failed to update testimonial" };
    }
  }

  /** Delete testimonial */
  @Security("jwt")
  @Delete("{id}")
  @SuccessResponse(200, "Testimonial deleted successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid testimonial id supplied")
  public async deleteTestimonial(@Path() id?: string): Promise<SuccessMessageResponse | ErrorMessageResponse> {
    try {
      if (!id) {
        throw new Error("Invalid id");
      }
      await TestimonialService.deleteTestimonial(id);
      return { message: "Testimonial deleted successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || "Failed to delete testimonial" };
    }
  }
}
