import { UserResponse } from "./User";

export interface LoginInput {
  email?: any;
  password?: any;
}

export interface RegisterInput {
  firstName?: any;
  lastName?: any;
  email?: any;
  phone?: any;
  age?: any;
  occupation?: any;
  organization?: any;
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
  occupation?: string;
  organization?: string;
}

export interface AuthUserResponse extends UserResponse {
  access: string;
  refresh: string;
  __v?: number;
}

export interface AuthenticationRequiredResponse {
  message?: string;
}
