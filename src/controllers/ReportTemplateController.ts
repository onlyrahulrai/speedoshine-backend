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
  Patch,
} from "tsoa";

import * as ReportTemplateService from "../services/reportTemplateService";

import {
  ReportTemplateRequest,
  ReportTemplateResponse,
  ReportTemplateListResponse,
  ReportTemplatePatchRequest,
} from "../types/schema/ReportTemplate";

import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";

import { AuthenticationRequiredResponse } from "../types/schema/Auth";

@Route("report-templates")
@Tags("ReportTemplate")
export class ReportTemplateController extends Controller {
  /**
   * ReportTemplateController
   *
   * - All endpoints require authentication (Admin only)
   * - Supports scope-based filtering (welcome, guideline, advertisement)
   */

  /** Get all report templates */
  @Security("jwt")
  @Get("/")
  @SuccessResponse(200, "List of report templates retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid request")
  public async getReportTemplates(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() scope?: string,
    @Query() flag?: "active" | "admin",
    @Query() fields?: string
  ): Promise<ReportTemplateListResponse> {
    return await ReportTemplateService.getAllReportTemplates(
      page,
      limit,
      scope,
      flag,
      fields
    ) as ReportTemplateListResponse;
  }

  /** Get report template by ID */
  @Security("jwt")
  @Get("{id}")
  @SuccessResponse(200, "Report template retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid report template id supplied")
  public async getReportTemplate(
    @Path() id: string
  ): Promise<ReportTemplateResponse | null> {
    return await ReportTemplateService.getReportTemplateById(
      id
    ) as ReportTemplateResponse | null;
  }

  /** Create new report template */
  @Security("jwt")
  @Post("/")
  @SuccessResponse(201, "Report template created successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  public async createReportTemplate(
    @Body() body: ReportTemplateRequest
  ): Promise<ReportTemplateResponse> {
    try {
      const template =
        await ReportTemplateService.createReportTemplate(body);

      this.setStatus(201);
      return template as ReportTemplateResponse;

    } catch (error: any) {
      let status = 400;
      let errors: any = {};

      if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || "field";

        status = 422;

        errors = {
          type: "fields",
          errors: {
            [field]: `A template with this ${field} already exists.`,
          },
        };
      } else {
        errors = {
          type: "error",
          message:
            error?.message ||
            "Something went wrong while creating report template",
        } as ErrorMessageResponse;
      }

      this.setStatus(status);
      return errors as ReportTemplateResponse;
    }
  }

  /** Update existing report template */
  @Security("jwt")
  @Put("{id}")
  @SuccessResponse(200, "Report template updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  public async updateReportTemplate(
    @Path() id: string,
    @Body() body: ReportTemplateRequest
  ): Promise<ReportTemplateResponse> {
    try {
      return await ReportTemplateService.updateReportTemplate(
        id,
        body
      ) as ReportTemplateResponse;

    } catch (error: any) {
      let status = 400;
      let errors: any = {};

      if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || "field";

        status = 422;

        errors = {
          type: "fields",
          errors: {
            [field]: `A template with this ${field} already exists.`,
          },
        };
      } else {
        errors = {
          type: "error",
          message:
            error?.message ||
            "Something went wrong while updating report template",
        } as ErrorMessageResponse;
      }

      this.setStatus(status);
      return errors as ReportTemplateResponse;
    }
  }

  /** Partially update report template */
  @Security("jwt")
  @Patch("{id}")
  @SuccessResponse(200, "Report template partially updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  public async patchReportTemplate(
    @Path() id: string,
    @Body() body: ReportTemplatePatchRequest
  ): Promise<ReportTemplateResponse> {
    try {
      return await ReportTemplateService.updateReportTemplate(
        id,
        body
      ) as ReportTemplateResponse;

    } catch (error: any) {
      let status = 400;
      let errors: any = {};

      if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || "field";

        status = 422;

        errors = {
          type: "fields",
          errors: {
            [field]: `A template with this ${field} already exists.`,
          },
        };
      } else {
        errors = {
          type: "error",
          message:
            error?.message ||
            "Something went wrong while updating report template",
        } as ErrorMessageResponse;
      }

      this.setStatus(status);
      return errors as ReportTemplateResponse;
    }
  }

  /** Soft delete report template */
  @Security("jwt")
  @Delete("{id}")
  @SuccessResponse<SuccessMessageResponse>(
    200,
    "Report template deleted successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid report template id supplied")
  public async deleteReportTemplate(
    @Path() id: string
  ): Promise<SuccessMessageResponse> {
    await ReportTemplateService.deleteReportTemplate(id);

    return { message: "Report template deleted successfully" };
  }
}
