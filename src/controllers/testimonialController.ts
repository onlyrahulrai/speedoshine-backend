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
import { API_MESSAGES } from "../constraints/common";
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
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_LIST_FAILED)
  public async getTestimonials(
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<TestimonialListResponse | ErrorMessageResponse> {
    try {
      return await TestimonialService.getAllTestimonials(page, limit);
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.FETCH_LIST_FAILED };
    }
  }

  /** Get testimonial by ID */
  @Security("jwt")
  @Get("{id}")
  @SuccessResponse(200, "Testimonial retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_FAILED)
  public async getTestimonial(@Path() id: string): Promise<TestimonialDetailsResponse | ErrorMessageResponse | null> {
    try {
      return await TestimonialService.getTestimonialById(id) as unknown as TestimonialDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.FETCH_FAILED };
    }
  }

  /** Create new testimonial */
  @Security("jwt")
  @Post("/")
  @SuccessResponse(201, "Testimonial created successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.CREATE_FAILED)
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
      return { message: error.message || API_MESSAGES.CREATE_FAILED };
    }
  }

  /** Update existing testimonial */
  @Security("jwt")
  @Put("{id}")
  @SuccessResponse(200, "Testimonial updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.UPDATE_FAILED)
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
      return { message: error.message || API_MESSAGES.UPDATE_FAILED };
    }
  }

  /** Delete testimonial */
  @Security("jwt")
  @Delete("{id}")
  @SuccessResponse(200, "Testimonial deleted successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.DELETE_FAILED)
  public async deleteTestimonial(@Path() id?: string): Promise<SuccessMessageResponse | ErrorMessageResponse> {
    try {
      if (!id) {
        throw new Error("Invalid id");
      }
      await TestimonialService.deleteTestimonial(id);
      return { message: "Testimonial deleted successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.DELETE_FAILED };
    }
  }
}
