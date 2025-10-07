import {
  Controller,
  Post,
  Get,
  Route,
  Tags,
  Body,
  SuccessResponse,
  Response,
  Request,
  Security,
  Put,
} from "tsoa";
import * as AuthService from "../services/authService";
import {
  validateChangePassword,
  validateEditProfile,
  validateLogin,
  validateRegister,
  validateRequestResetPassword,
  validateRequestResetPasswordConfirm,
} from "../helper/validators/auth";
import {
  AuthenticationRequiredResponse,
  AuthUserResponse,
  EditProfileInput,
  LoginInput,
  RegisterInput,
  RequestResetPasswordConfirmInput,
  VerifyEmailInput,
} from "../types/schema/Auth";
import { UserResponse } from "../types/schema/User";
import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";

@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
  @Post("/login")
  @SuccessResponse<AuthUserResponse>(200, "Login successful")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  public async login(
    @Body() body: LoginInput
  ): Promise<AuthUserResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const errors = await validateLogin(body);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422); // Unprocessable Entity
        return {
          type: "fields",
          errors,
        };
      }

      const user = await AuthService.loginUser(body.email, body.password);

      this.setStatus(200);

      return user; // merge user details + token
    } catch (error: any) {
      console.error("Login error:", error);
      this.setStatus(400);
      return { message: error?.message || "Failed to login" };
    }
  }

  @Post("/register")
  @SuccessResponse<UserResponse>(201, "User registered successfully")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  public async register(
    @Body() body: RegisterInput
  ): Promise<UserResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const errors = await validateRegister(body);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422); // 422 for validation issues
        return {
          type: "fields",
          errors,
        };
      }

      const user = await AuthService.registerUser(body);

      this.setStatus(201);

      // Ensure createdAt and updatedAt are present for UserResponse
      return {
        ...user,
        _id: user._id?.toString(),
        createdAt: (user as any).createdAt ?? new Date(),
        updatedAt: (user as any).updatedAt ?? new Date(),
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        username: user.username ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        age: user.age ?? 0,
        address: user.address ?? "",
        profile: user.profile ?? "",
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      this.setStatus(400);
      return { message: error?.message || "Failed to register user" };
    }
  }

  @Post("request-reset-password")
  @SuccessResponse(202, "Password reset request accepted")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  public async requestResetPassword(
    @Body() body: { email?: string }
  ): Promise<
    SuccessMessageResponse | FieldValidationError | ErrorMessageResponse
  > {
    try {
      const errors = validateRequestResetPassword(body);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422);
        return {
          type: "fields",
          errors,
        };
      }

      await AuthService.requestPasswordReset(body.email as string);

      this.setStatus(200);

      return { message: "Password reset instructions sent successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || "Failed to request password reset" };
    }
  }

  @Security("jwt")
  @Post("resend-verification-email")
  @SuccessResponse(202, "Verification email resent successfully")
  @Response<ErrorMessageResponse>(
    400,
    "Invalid request or email could not be sent"
  )
  @Response<AuthenticationRequiredResponse>(
    401,
    "Authentication required to perform this action"
  )
  public async resendVerificationEmail(
    @Request() req: any
  ): Promise<
    | SuccessMessageResponse
    | ErrorMessageResponse
    | AuthenticationRequiredResponse
  > {
    try {
      const user = req.user;

      if (!user) {
        this.setStatus(401);
        return { message: "Authentication required" };
      }

      await AuthService.resendVerificationEmail(user);

      this.setStatus(202);

      return { message: "Verification email resent successfully" };
    } catch (error: any) {
      this.setStatus(400);

      return {
        message: error?.message || "Failed to resend verification email",
      };
    }
  }

  @Post("confirm-reset-password")
  @SuccessResponse(202, "Password reset confirmed")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Invalid or expired reset token")
  public async confirmResetPassword(
    @Body() body: RequestResetPasswordConfirmInput
  ): Promise<
    { message: string } | FieldValidationError | ErrorMessageResponse
  > {
    try {
      const errors = await validateRequestResetPasswordConfirm(body);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422);
        return {
          type: "fields",
          errors,
        };
      }

      await AuthService.confirmResetPassword(body.token, body.newPassword);

      this.setStatus(202);

      return { message: "Password has been reset successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || "Invalid or expired reset token" };
    }
  }

  @Post("verify-email")
  @SuccessResponse(202, "Email verification initiated")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or token")
  public async verifyEmail(
    @Body() body?: VerifyEmailInput
  ): Promise<{ message: string } | ErrorMessageResponse> {
    try {
      const result = await AuthService.verifyEmail(body.token);

      this.setStatus(202);

      return { message: "Email verified successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || "Invalid verification token" };
    }
  }

  @Security("jwt")
  @Put("edit-profile")
  @SuccessResponse<UserResponse>(200, "Profile updated successfully")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<AuthenticationRequiredResponse>(
    401,
    "Authentication required to perform this action"
  )
  public async editProfile(
    @Request() req: any,
    @Body() body: EditProfileInput
  ): Promise<
    | UserResponse
    | ErrorMessageResponse
    | FieldValidationError
    | AuthenticationRequiredResponse
  > {
    try {
      const userId = req.user?._id;

      if (!userId) {
        this.setStatus(401);
        return { message: "Authentication required" };
      }

      const errors = await validateEditProfile(body);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422);
        return {
          type: "fields",
          errors,
        };
      }

      const user = await AuthService.editUserProfile(userId, body);

      this.setStatus(200);

      return user;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message };
    }
  }

  @Security("jwt")
  @Post("change-password")
  @SuccessResponse<UserResponse>(200, "Password changed successfully")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<AuthenticationRequiredResponse>(
    401,
    "Authentication required to perform this action"
  )
  public async changePassword(
    @Request() req: any,
    @Body()
    body: {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    }
  ): Promise<
    | UserResponse
    | ErrorMessageResponse
    | FieldValidationError
    | AuthenticationRequiredResponse
  > {
    try {
      const userId = req.user?._id;

      if (!userId) {
        this.setStatus(401);
        return { message: "Authentication required" };
      }

      const errors = await validateChangePassword(body, userId);

      if (Object.keys(errors).length > 0) {
        this.setStatus(422); // Correct for validation errors
        return {
          type: "fields",
          errors,
        };
      }

      const user = await AuthService.changePassword(userId, body);

      this.setStatus(200);

      return user;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message };
    }
  }

  @Security("jwt")
  @Get("user-details")
  @SuccessResponse<UserResponse>(200, "User details retrieved successfully")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  @Response<AuthenticationRequiredResponse>(
    401,
    "Authentication required to perform this action"
  )
  public async getUserDetails(
    @Request() req: any
  ): Promise<
    UserResponse | AuthenticationRequiredResponse | ErrorMessageResponse
  > {
    const userId = req.user?._id;

    if (!userId) {
      this.setStatus(401);
      return { message: "Authentication required" };
    }

    try {
      const user = await AuthService.getUserDetails(userId);
      this.setStatus(200);
      return user;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || "Invalid request" };
    }
  }

  @Post("logout")
  @SuccessResponse("200", "Successfully logged out")
  @Response("401", "Unauthorized")
  public async logout(@Request() req: any): Promise<{ message: string }> {
    try {
      await AuthService.logout(req);

      return { message: "Successfully logged out" };
    } catch (error) {
      this.setStatus(401);
      return { message: "Invalid token" };
    }
  }
}
