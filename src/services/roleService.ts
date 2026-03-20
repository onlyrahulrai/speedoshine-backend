import Role, { IRole } from "../models/Role";
import { RoleDetailsResponse, RoleListResponse, UpdateRoleRequest } from "../types/schema/Role";

export const getAllRoles = async (query: Record<string, any>): Promise<RoleListResponse> => {
  try {
    const { page, limit, search } = query;

    const effectivePage = Math.max(1, page);
    const effectiveLimit = Math.max(1, Math.min(limit, 100));
    const skip = (effectivePage - 1) * effectiveLimit;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Role.countDocuments(filter);

    const results = await Role.find(filter)
      .skip(skip)
      .limit(effectiveLimit)
      .populate("permissions")
      .select("-__v")
      .lean();

    return {
      page: effectivePage,
      limit: effectiveLimit,
      total,
      has_next: skip + results.length < total,
      has_prev: effectivePage > 1,
      results: results as unknown as RoleDetailsResponse[],
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch roles");
  }
};

export const getRoleById = async (
  id: string
): Promise<IRole | null> => {
  try {
    const role = await Role.findById(id).populate("permissions");

    if (!role) {
      throw new Error("Role not found");
    }

    return role;
  } catch (error: any) {
    if (error.name === "CastError") {
      throw new Error("Invalid Role ID format");
    }
    throw new Error(error.message || "Failed to fetch role");
  }
};

export const createRole = async (
  data: { name: string; order?: number; permissions?: string[] }
): Promise<IRole> => {
  try {
    const role = new Role(data);

    return await role.save();
  } catch (error: any) {
    throw new Error(error.message || "Failed to create role");
  }
};

export const updateRole = async (
  id: string,
  data: UpdateRoleRequest
): Promise<IRole | null> => {
  try {
    const updatedRole = await Role.findByIdAndUpdate(id, data, { new: true }).populate("permissions");

    if (!updatedRole) {
      throw new Error("Role not found");
    }

    return updatedRole;
  } catch (error: any) {
    if (error.name === "CastError") {
      throw new Error("Invalid Role ID format");
    }
    throw new Error(error.message || "Failed to update role");
  }
};

export const deleteRole = async (
  id: string
): Promise<IRole | null> => {
  try {
    const deletedRole = await Role.findByIdAndDelete(id);

    if (!deletedRole) {
      throw new Error("Role not found");
    }

    return deletedRole;
  } catch (error: any) {
    if (error.name === "CastError") {
      throw new Error("Invalid Role ID format");
    }
    throw new Error(error.message || "Failed to delete role");
  }
};
