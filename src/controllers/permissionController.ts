import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Response,
  Tags,
  Path,
  Body,
  Security,
  SuccessResponse,
  Middlewares,
  Query
} from 'tsoa';
import * as permissionService from '../services/permissionService';
import { CreatePermissionRequest, PermissionListResponse, PermissionDetailsResponse, UpdatePermissionRequest } from '../types/schema/Permission';
import { AuthenticationRequiredResponse } from '../types/schema/Auth';
import { API_MESSAGES } from '../constraints/common';
import { AccessDeniedErrorMessageResponse, ErrorMessageResponse, FieldValidationError } from '../types/schema/Common';
import { PERMISSIONS } from '../constraints/permissions';
import { requirePermission } from '../middleware/requirePermission';

@Route('permissions')
@Tags('Permission')
export class PermissionController extends Controller {
  @Security("jwt")
  @Get('/')
  @SuccessResponse(
    200,
    "List of permissions retrieved successfully"
  )
  @Middlewares(requirePermission(PERMISSIONS.PERMISSION_READ))
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_LIST_FAILED)
  public async getPermissions(@Query() page: number = 1, @Query() limit: number = 10, @Query() search?: string): Promise<PermissionListResponse> {
    return await permissionService.getAllPermissions({ page, limit, search }) as unknown as PermissionListResponse;
  }

  @Security("jwt")
  @Get('{id}')
  @Middlewares(requirePermission(PERMISSIONS.PERMISSION_READ))
  @SuccessResponse(
    200,
    "Permission retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_FAILED)
  public async getPermission(@Path() id: string): Promise<PermissionDetailsResponse | null> {
    return await permissionService.getPermissionById(id) as PermissionDetailsResponse | null;
  }

  @Security("jwt")
  @Post('/')
  @Middlewares(requirePermission(PERMISSIONS.PERMISSION_CREATE))
  @SuccessResponse(201, "Permission created successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<FieldValidationError>(422, "Validation Failed")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.CREATE_FAILED)
  public async createPermission(@Body() body: CreatePermissionRequest): Promise<PermissionDetailsResponse | ErrorMessageResponse | FieldValidationError> {
    try {
      const fields: Record<string, any> = {};

      if (!body.name?.trim()) {
        fields.name = "Name is required";
      }

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await permissionService.createPermission(body) as unknown as PermissionDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);

      return {
        message: error.message || API_MESSAGES.CREATE_FAILED,
      }
    }
  }

  @Security("jwt")
  @Put('{id}')
  @Middlewares(requirePermission(PERMISSIONS.PERMISSION_UPDATE))
  @SuccessResponse(
    200,
    "Permission updated successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.UPDATE_FAILED)
  @Response<FieldValidationError>(422, "Validation Failed")
  public async updatePermission(
    @Path() id: string,
    @Body() body: UpdatePermissionRequest
  ): Promise<PermissionDetailsResponse | ErrorMessageResponse | FieldValidationError> {
    try {
      const fields: Record<string, any> = {};

      if (!body.name?.trim()) {
        fields.name = "Name is required";
      }

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await permissionService.updatePermission(id, body) as unknown as PermissionDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);

      return {
        message: error.message || API_MESSAGES.UPDATE_FAILED,
      }
    }
  }

  @Security("jwt")
  @Delete('{id}')
  @Middlewares(requirePermission(PERMISSIONS.PERMISSION_DELETE))
  @SuccessResponse(
    200,
    "Permission deleted successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.DELETE_FAILED)
  public async deletePermission(@Path() id: string): Promise<PermissionDetailsResponse> {
    return await permissionService.deletePermission(id) as unknown as PermissionDetailsResponse;
  }
}
