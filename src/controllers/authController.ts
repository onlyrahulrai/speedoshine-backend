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
  validateVerifyPhone,
  validateResendPhoneOtp,
} from "../helper/validators/auth";
import {
  AuthenticationRequiredResponse,
  AuthUserResponse,
  EditProfileInput,
  LoginInput,
  RegisterInput,
  RequestResetPasswordConfirmInput,
  VerifyEmailInput,
  VerifyPhoneInput,
  ResendPhoneOtpInput,
} from "../types/schema/Auth";
import { UserDetailsResponse } from "../types/schema/User";
import {
  ErrorMessageResponse,
  FieldValidationError,
  SuccessMessageResponse,
} from "../types/schema/Common";
import { API_MESSAGES } from "../constraints/common";

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
      const fields = await validateLogin(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return {
          fields,
        };
      }

      const user = await AuthService.loginUser(body.email, body.password);

      this.setStatus(200);

      return user as any;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.LOGIN_FAILED };
    }
  }

  @Post("/register")
  @SuccessResponse<UserDetailsResponse>(201, "User registered successfully")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  public async register(
    @Body() body: RegisterInput
  ): Promise<UserDetailsResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const fields = await validateRegister(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422); // 422 for validation issues
        return {
          fields,
        };
      }

      const user = await AuthService.registerUser(body);

      this.setStatus(201);

      // Ensure createdAt and updatedAt are present for UserResponse
      return user as any;
    } catch (error: any) {
      console.error("Registration error:", error);
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.REGISTER_FAILED };
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
      const fields = validateRequestResetPassword(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return {
          fields,
        };
      }

      await AuthService.requestPasswordReset(body.email as string);

      this.setStatus(200);

      return { message: "Password reset instructions sent successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.PASSWORD_RESET_FAILED };
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
        message: error?.message || API_MESSAGES.FETCH_FAILED,
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
      const fields = await validateRequestResetPasswordConfirm(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return {
          fields,
        };
      }

      await AuthService.confirmResetPassword(body.token, body.newPassword);

      this.setStatus(202);

      return { message: "Password has been reset successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.PASSWORD_RESET_FAILED };
    }
  }

  @Post("verify-email")
  @SuccessResponse(202, "Email verification initiated")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or token")
  public async verifyEmail(
    @Body() body: VerifyEmailInput
  ): Promise<{ message: string } | ErrorMessageResponse> {
    try {
      const result = await AuthService.verifyEmail(body.token);

      this.setStatus(202);

      return { message: "Email verified successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.VERIFY_EMAIL_FAILED };
    }
  }

  @Post("verify-phone")
  @SuccessResponse(200, "Phone number verified")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Invalid OTP or phone number")
  public async verifyPhone(
    @Body() body: VerifyPhoneInput
  ): Promise<SuccessMessageResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const fields = validateVerifyPhone(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      await AuthService.verifyPhoneOtp(body?.phone, body?.otp, body?.type);

      this.setStatus(200);

      return { message: "Phone number verified successfully" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.VERIFY_PHONE_FAILED };
    }
  }

  @Post("send-phone-otp")
  @SuccessResponse(200, "Verification OTP resent")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Failed to resend Verification OTP")
  public async sendPhoneOtp(
    @Body() body: ResendPhoneOtpInput
  ): Promise<SuccessMessageResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const fields = validateResendPhoneOtp(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      await AuthService.sendPhoneOtp(body.phone, body.type);

      this.setStatus(200);

      return { message: "Verification OTP has been sent" };
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.OTP_FAILED };
    }
  }

  @Post("login-with-otp")
  @SuccessResponse<AuthUserResponse>(200, "OTP Login successful")
  @Response<FieldValidationError>(422, "One or more fields failed validation")
  @Response<ErrorMessageResponse>(400, "Invalid OTP or phone number")
  public async loginWithOtp(
    @Body() body: VerifyPhoneInput
  ): Promise<AuthUserResponse | FieldValidationError | ErrorMessageResponse> {
    try {
      const fields = validateVerifyPhone(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      const user = await AuthService.loginWithOtp(body.phone as string, body.otp as string);

      this.setStatus(200);

      return user as any;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message || API_MESSAGES.LOGIN_FAILED };
    }
  }

  @Security("jwt")
  @Put("edit-profile")
  @SuccessResponse<UserDetailsResponse>(200, "Profile updated successfully")
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
    | UserDetailsResponse
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

      const fields = await validateEditProfile(userId, body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return {
          fields,
        };
      }

      const user = await AuthService.editUserProfile(userId, body);

      this.setStatus(200);

      return user as any;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message };
    }
  }

  @Security("jwt")
  @Post("change-password")
  @SuccessResponse<UserDetailsResponse>(200, "Password changed successfully")
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
    | UserDetailsResponse
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

      const fields = await validateChangePassword(body, userId);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422); // Correct for validation errors
        return {
          fields,
        };
      }

      const user = await AuthService.changePassword(userId, body);

      this.setStatus(200);

      return user as any;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error?.message };
    }
  }

  @Security("jwt")
  @Get("user-details")
  @SuccessResponse<UserDetailsResponse>(200, "User details retrieved successfully")
  @Response<ErrorMessageResponse>(400, "Invalid request parameters or format")
  @Response<AuthenticationRequiredResponse>(
    401,
    "Authentication required to perform this action"
  )
  public async getUserDetails(
    @Request() req: any
  ): Promise<
    UserDetailsResponse | AuthenticationRequiredResponse | ErrorMessageResponse
  > {
    const userId = req.user?._id;

    if (!userId) {
      this.setStatus(401);
      return { message: "Authentication required" };
    }

    try {
      this.setStatus(200);

      return await AuthService.getUserDetails(userId) as any;
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
