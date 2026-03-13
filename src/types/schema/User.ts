export interface UserRequest {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  age?: number;
  occupation?: string;
  organization?: string;
  password?: string;
  isActive?: boolean;
}

export interface UserResponse {
  _id?: string; // MongoDB ObjectId as string
  firstName: string;
  lastName: string;
  name?: string;
  username?: any;
  email: string;
  phone?: string;
  age?: number;
  occupation?: string;
  organization?: string;
  address?: any;
  profile?: any;
  bio?: any;
  isActive?: boolean;
  isVerified?: boolean;
  role?: any;
  createdAt: Date;
  updatedAt: Date;
  __V?: string
}

export interface UserListResponse {
  results: UserResponse[];
}
