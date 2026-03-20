import { ErrorMessageResponse } from "./Common";
import { UserDetailsResponse } from "./User";

export interface LoginInput {
  email?: any;
  password?: any;
}

export interface RegisterInput {
  name?: any;
  email?: any;
  phone?: any;
  password?: any;
  confirmPassword?: any;
}

export interface RequestResetPasswordConfirmInput {
  newPassword?: any;
  confirmPassword?: any;
  token: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyPhoneInput {
  phone?: string;
  otp?: string;
  type?: string;
}

export interface ResendPhoneOtpInput {
  phone?: string;
  type?: string;
}

export interface EditProfileInput {
  name?: string;
  email?: string;
  phone?: string;
  profile?: any;
}

export interface AuthUserResponse extends UserDetailsResponse {
  access: string;
  refresh: string;
}

export interface AuthenticationRequiredResponse extends ErrorMessageResponse {
}
