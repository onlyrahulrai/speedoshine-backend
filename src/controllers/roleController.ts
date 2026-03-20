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
import * as roleService from '../services/roleService';
import { CreateRoleRequest, RoleListResponse, RoleDetailsResponse, UpdateRoleRequest } from '../types/schema/Role';
import { AuthenticationRequiredResponse } from '../types/schema/Auth';
import { API_MESSAGES } from '../constraints/common';
import { AccessDeniedErrorMessageResponse, ErrorMessageResponse, FieldValidationError } from '../types/schema/Common';
import { PERMISSIONS } from '../constraints/permissions';
import { requirePermission } from '../middleware/requirePermission';

@Route('roles')
@Tags('Role')
export class RoleController extends Controller {
  @Security("jwt")
  @Get('/')
  @SuccessResponse(
    200,
    "List of roles retrieved successfully"
  )
  @Middlewares(requirePermission(PERMISSIONS.ROLE_READ))
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_LIST_FAILED)
  public async getRoles(@Query() page: number = 1, @Query() limit: number = 10, @Query() search?: string): Promise<RoleListResponse> {
    return await roleService.getAllRoles({ page, limit, search }) as unknown as RoleListResponse;
  }

  @Security("jwt")
  @Get('{id}')
  @Middlewares(requirePermission(PERMISSIONS.ROLE_READ))
  @SuccessResponse(
    200,
    "Role retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_FAILED)
  public async getRole(@Path() id: string): Promise<RoleDetailsResponse | null> {
    return await roleService.getRoleById(id) as RoleDetailsResponse | null;
  }

  @Security("jwt")
  @Post('/')
  @Middlewares(requirePermission(PERMISSIONS.ROLE_CREATE))
  @SuccessResponse(201, "Role created successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<FieldValidationError>(422, "Validation Failed")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.CREATE_FAILED)
  public async createRole(@Body() body: CreateRoleRequest): Promise<RoleDetailsResponse | ErrorMessageResponse | FieldValidationError> {
    try {
      const fields: Record<string, any> = {};

      if (!body.name?.trim()) {
        fields.name = "Name is required";
      }

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await roleService.createRole(body) as unknown as RoleDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);

      return {
        message: error.message || API_MESSAGES.CREATE_FAILED,
      }
    }
  }

  @Security("jwt")
  @Put('{id}')
  @Middlewares(requirePermission(PERMISSIONS.ROLE_UPDATE))
  @SuccessResponse(
    200,
    "Role updated successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.UPDATE_FAILED)
  @Response<FieldValidationError>(422, "Validation Failed")
  public async updateRole(
    @Path() id: string,
    @Body() body: UpdateRoleRequest
  ): Promise<RoleDetailsResponse | ErrorMessageResponse | FieldValidationError> {
    try {
      const fields: Record<string, any> = {};

      if (!body.name?.trim()) {
        fields.name = "Name is required";
      }

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await roleService.updateRole(id, body) as unknown as RoleDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);

      return {
        message: error.message || API_MESSAGES.UPDATE_FAILED,
      }
    }
  }

  @Security("jwt")
  @Delete('{id}')
  @Middlewares(requirePermission(PERMISSIONS.ROLE_DELETE))
  @SuccessResponse(
    200,
    "Role deleted successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.DELETE_FAILED)
  public async deleteRole(@Path() id: string): Promise<RoleDetailsResponse> {
    return await roleService.deleteRole(id) as unknown as RoleDetailsResponse;
  }
}
