import mongoose from "mongoose";

export interface CreatUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest extends CreatUserRequest { }

export interface UserDetailsResponse {
  _id?: string | mongoose.Types.ObjectId; // MongoDB ObjectId as string
  name: string;
  email: string;
  phone?: string;
  profile?: any;
  isActive?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  roles?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListResponse {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
  results: UserDetailsResponse[];
}

export interface AuthUserResponse extends UserDetailsResponse {
  access: string;
  refresh: string;
}