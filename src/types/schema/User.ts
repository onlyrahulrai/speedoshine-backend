export interface UserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  age?: number;
  password?: string;
}

export interface UserResponse {
  _id: string; // MongoDB ObjectId as string
  firstName: string;
  lastName: string;
  name?: string;
  username?: any;
  email: string;
  phone?: string;
  age?: number;
  address?: any;
  profile?: any;
  bio?: any;
  isActive?: boolean;
  isVerified?: boolean;
  role?: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  results: UserResponse[];
}
