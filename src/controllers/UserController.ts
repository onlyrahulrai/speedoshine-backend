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
import * as UserService from "../services/userService";
import {
  UserListResponse,
  UserRequest,
  UserResponse,
} from "../types/schema/User";
import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";

@Route("users")
@Tags("User")
export class UserController extends Controller {
  @Security("jwt")
  @Get("/")
  @SuccessResponse<UserListResponse>(
    200,
    "List of users retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid request")
  public async getUsers(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string,
  ): Promise<UserListResponse> {
    return await UserService.getAllUsers(page, limit, search);
  }

  @Security("jwt")
  @Get("/assessments/summary")
  @SuccessResponse<UserListResponse>(
    200,
    "User assessment summaries retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication is required to access this resource")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  public async getUsersAssessmentSummary(
    @Query() page?: number,
    @Query() limit?: number
  ): Promise<UserListResponse> {
    return await UserService.getUserAssessmentSummary({ page, limit });
  }


  @Security("jwt")
  @Get("{id}")
  @SuccessResponse<UserResponse>(200, "User retrieved successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid user id supplied")
  public async getUser(@Path() id?: string): Promise<UserResponse | null> {
    return UserService.getUserById(id);
  }

  @Security("jwt")
  @Post("/")
  @SuccessResponse<UserResponse>(201, "User created successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  public async createUser(@Body() body?: UserRequest): Promise<UserResponse> {
    return UserService.createUser(body);
  }

  @Security("jwt")
  @Put("{id}")
  @SuccessResponse<UserResponse>(200, "User updated successfully")
  @Response<FieldValidationError>(422, "Validation error")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  public async updateUser(
    @Path() id?: string,
    @Body() body?: UserRequest
  ): Promise<UserResponse> {
    return UserService.updateUser(id, body);
  }

  @Security("jwt")
  @Delete("{id}")
  @SuccessResponse<SuccessMessageResponse>(200, "User deleted successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorMessageResponse>(400, "Invalid user id supplied")
  public async deleteUser(@Path() id: string): Promise<SuccessMessageResponse> {
    await UserService.deleteUser(id);
    return { message: "User deleted successfully" };
  }
}
