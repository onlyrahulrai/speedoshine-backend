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
import * as LicenseService from "../services/licenseService";
import { Request as ExpressRequest } from "express";
import { expressAuthentication } from "../auth/expressAuthentication";
import { Types } from "mongoose";

import {
  LicenseListResponse,
  LicenseRequest,
  LicenseResponse,
} from "../types/schema/License";

import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";

@Route("licenses")
@Tags("License")
export class LicenseController extends Controller {
  /**
   * LicenseController
   *
   * Exposes endpoints for managing license keys.
   *
   * - Public access allowed for `flag=active`
   * - Any other flag requires JWT authentication
   * - All write operations require authentication
   */

  /** Get all license keys with pagination */
  @Get("/")
  @SuccessResponse(
    200,
    "List of licenses retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid request")
  public async getLicenses(
    @Request() req?: any,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() flag: "active" | "admin" = "active"
  ): Promise<LicenseListResponse> {
    // Conditional auth: only public for active licenses
    if (flag !== "active") {
      try {
        await expressAuthentication(req as ExpressRequest, "jwt");
      } catch (err) {
        const e: any = new Error("Authentication required");
        e.status = 401;
        throw e;
      }
    }

    return await LicenseService.getAllLicenses(page, limit, flag) as LicenseListResponse;
  }

  /** Get license by ID */
  @Security("jwt")
  @Get("{id}")
  @SuccessResponse<LicenseResponse>(200, "License retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid license id supplied")
  public async getLicense(
    @Path() id: string
  ): Promise<LicenseResponse | null> {
    return await LicenseService.getLicenseById(id) as LicenseResponse | null;
  }

  /** Create new license */
  @Security("jwt")
  @Post("/")
  @SuccessResponse<LicenseResponse>(201, "License created successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  public async createLicense(
    @Body() body: LicenseRequest
  ): Promise<LicenseResponse> {
    const licenseData = {
      ...body,
      assessment: body.assessment ? new Types.ObjectId(body.assessment) : undefined,
    };
    return await LicenseService.createLicense(licenseData) as LicenseResponse;
  }

  /** Update existing license */
  @Security("jwt")
  @Put("{id}")
  @SuccessResponse<LicenseResponse>(200, "License updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  public async updateLicense(
    @Path() id: string,
    @Body() body: LicenseRequest
  ): Promise<LicenseResponse> {
    const licenseData = {
      ...body,
      assessment: body.assessment ? new Types.ObjectId(body.assessment) : null,
    };
    return await LicenseService.updateLicense(id, licenseData) as LicenseResponse;
  }

  /** Delete license (soft delete) */
  @Security("jwt")
  @Delete("{id}")
  @SuccessResponse<SuccessMessageResponse>(200, "License deleted successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid license id supplied")
  public async deleteLicense(
    @Path() id?: string
  ): Promise<SuccessMessageResponse> {
    await LicenseService.deleteLicense(id as string);
    return { message: "License deleted successfully" };
  }
}
