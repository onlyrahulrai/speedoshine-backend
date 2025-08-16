import { UserResponse } from "./User";

export interface LoginInput {
  email?: any;
  password?: any;
}

export interface RegisterInput {
  firstName?: any;
  lastName?: any;
  email?:any;
  age?: any;
  password?: any;
  confirmPassword?: any;
}

export interface RequestResetPasswordConfirmInput {
  newPassword?: any;
  confirmPassword?: any;
  token?: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface EditProfileInput {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  age?: number;
  address?: any;
  profile?: any;
  bio?: string;
}

export interface AuthUserResponse extends UserResponse {
  token: string;
}

export interface AuthenticationRequiredResponse {
  message?: string
}