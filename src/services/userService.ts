import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";
import { UserListResponse, UserDetailsResponse } from "../types/schema/User";

export const getAllUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<UserListResponse> => {
  try {
    const effectivePage = Math.max(1, page);
    const effectiveLimit = Math.max(1, Math.min(limit, 100));

    const skip = (effectivePage - 1) * effectiveLimit;

    // total count for pagination
    const total = await User.countDocuments();

    const match = search
      ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    // fetch paginated users
    const results = await User.find(match)
      .select("-password -__v")
      .sort("-createdAt")
      .skip(skip)
      .limit(effectiveLimit)
      .lean();

    return {
      page: effectivePage,
      limit: effectiveLimit,
      total,
      has_next: skip + results.length < total,
      has_prev: effectivePage > 1,
      results: results as unknown as UserDetailsResponse[],
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch users");
  }
};

export const getUserById = async (
  id: string
): Promise<UserDetailsResponse | null> => {
  try {
    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      throw new Error("User not found");
    }

    return user as unknown as UserDetailsResponse;
  } catch (error: any) {
    if (error.name === "CastError") {
      throw new Error("Invalid User ID format");
    }
    throw new Error(error.message || "Failed to fetch user");
  }
};

export const createUser = async (data: Partial<IUser>): Promise<IUser> => {
  try {
    if (data.password) {
      const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
      const salt = await bcrypt.genSalt(saltRounds);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const user = new User(data);

    return await user.save();
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (
  id: string,
  data: Partial<IUser>
): Promise<Partial<IUser> | null> => {
  try {
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(id, data, { new: true })
      .select("-password")
      .lean();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  } catch (error: any) {
    if (error.name === "CastError") {
      throw new Error("Invalid User ID format");
    }
    throw new Error(error.message || "Failed to update user");
  }
};

export const deleteUser = async (
  id: string
): Promise<Partial<IUser> | null> => {
  try {
    const deletedUser = await User.findByIdAndUpdate(
      id,
      { isActive: false, deletedAt: new Date() },
      { new: true }
    )
      .select("-password -__v")
      .lean();

    if (!deletedUser) {
      throw new Error("User not found");
    }

    return deletedUser;
  } catch (error: any) {
    if (error.name === "CastError") {
      throw new Error("Invalid User ID format");
    }
    throw new Error(error.message || "Error deleting user");
  }
};

