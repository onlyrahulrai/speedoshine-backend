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
  Middlewares,
} from "tsoa";
import * as UserService from "../services/userService";
import {
  UserListResponse,
  CreatUserRequest,
  UpdateUserRequest,
  UserDetailsResponse,
} from "../types/schema/User";
import {
  ErrorMessageResponse,
  SuccessMessageResponse,
  AccessDeniedErrorMessageResponse,
  FieldValidationError
} from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";
import { API_MESSAGES } from "../constraints/common";
import { PERMISSIONS } from "../constraints/permissions";
import { requirePermission } from "../middleware/requirePermission";
import { validateManageUser } from "../helper/validators/user";

@Route("users")
@Tags("User")
export class UserController extends Controller {

  /** Get all users with pagination */
  @Security("jwt")
  @Get("/")
  @Middlewares(requirePermission(PERMISSIONS.USER_READ))
  @SuccessResponse(
    200,
    "List of users retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_LIST_FAILED)
  public async getUsers(
    @Query() page: number = 1,
    @Query() limit: number = 10,
    @Query() search: string = "",
  ): Promise<UserListResponse | ErrorMessageResponse> {
    try {
      return await UserService.getAllUsers(page, limit, search) as unknown as UserListResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.FETCH_LIST_FAILED };
    }
  }

  /** Get a single user by ID */
  @Security("jwt")
  @Get("/{id}")
  @Middlewares(requirePermission(PERMISSIONS.USER_READ))
  @SuccessResponse(
    200,
    "User retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.FETCH_FAILED)
  public async getUser(
    @Path() id: string
  ): Promise<UserDetailsResponse | ErrorMessageResponse> {
    try {
      return await UserService.getUserById(id) as unknown as UserDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.FETCH_FAILED };
    }
  }

  /** Create a new user */
  @Security("jwt")
  @Post("/")
  @Middlewares(requirePermission(PERMISSIONS.USER_CREATE))
  @SuccessResponse(
    201,
    "User created successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<FieldValidationError>(422, "Validation Failed")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.CREATE_FAILED)
  public async createUser(
    @Body() body: CreatUserRequest
  ): Promise<UserDetailsResponse | ErrorMessageResponse | FieldValidationError> {
    try {
      const fields = await validateManageUser(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await UserService.createUser(body) as unknown as UserDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.CREATE_FAILED };
    }
  }

  /** Update an existing user */
  @Security("jwt")
  @Put("/{id}")
  @Middlewares(requirePermission(PERMISSIONS.USER_UPDATE))
  @SuccessResponse(
    200,
    "User updated successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.UPDATE_FAILED)
  @Response<FieldValidationError>(422, "Validation Failed")
  public async updateUser(
    @Path() id: string,
    @Body() body: UpdateUserRequest
  ): Promise<UserDetailsResponse | ErrorMessageResponse | FieldValidationError> {
    try {
      const fields = await validateManageUser(body, id);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await UserService.updateUser(id, body) as unknown as UserDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.UPDATE_FAILED };
    }
  }

  /** Delete a user by ID */
  @Security("jwt")
  @Delete("/{id}")
  @Middlewares(requirePermission(PERMISSIONS.USER_DELETE))
  @SuccessResponse(
    200,
    "User deleted successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.DELETE_FAILED)
  public async deleteUser(
    @Path() id: string
  ): Promise<UserDetailsResponse | ErrorMessageResponse> {
    try {
      return await UserService.deleteUser(id) as unknown as UserDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.DELETE_FAILED };
    }
  }
}
