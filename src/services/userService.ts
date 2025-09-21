import User, { IUser } from "../models/User";
import bcrypt from "bcryptjs";

interface PaginatedResponse<T> {
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
  total: number;
  results: Partial<T>[];
}

export const getAllUsers = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<IUser>> => {
  const effectivePage = Math.max(1, page);
  const effectiveLimit = Math.max(1, Math.min(limit, 100));

  const skip = (effectivePage - 1) * effectiveLimit;

  // total count for pagination
  const total = await User.countDocuments();

  // fetch paginated users
  const results = await User.find()
    .select("-password")
    .skip(skip)
    .limit(effectiveLimit)
    .lean();

  return {
    page: effectivePage,
    limit: effectiveLimit,
    total,
    has_next: skip + results.length < total,
    has_prev: effectivePage > 1,
    results,
  };
};


export const getUserById = async (
  id: string
): Promise<Partial<IUser> | null> => {
  return await User.findById(id).select("-password").lean();
};

export const createUser = async (data: Partial<IUser>): Promise<IUser> => {
  try {
    if (data.password) {
      const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
      const salt = await bcrypt.genSalt(saltRounds);
      data.password = await bcrypt.hash(data.password, salt);
    }

    // Set default values
    if (data.isVerified === undefined) {
      data.isVerified = true;
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
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
  }

  return await User.findByIdAndUpdate(id, data, { new: true })
    .select("-password") 
    .lean();
};

export const deleteUser = async (
  id: string
): Promise<Partial<IUser> | null> => {
  return await User.findByIdAndDelete(id).select("-password").lean();
};
