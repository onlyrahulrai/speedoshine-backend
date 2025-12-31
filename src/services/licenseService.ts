import LicenseKey, { ILicenseKey } from "../models/LicenseKey";
import { Types } from "mongoose";
import { ErrorMessageResponse, FieldValidationError } from "../types/schema/Common";

interface PaginatedResponse<T> {
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
  total: number;
  results: Partial<T>[];
}

/**
 * Get all license keys (paginated)
 * flag:
 *  - "active" → only active licenses
 *  - "admin"  → all non-deleted licenses
 */
export const getAllLicenses = async (
  page: number = 1,
  limit: number = 10,
  flag: "active" | "admin" = "active"
): Promise<PaginatedResponse<ILicenseKey>> => {
  const effectivePage = Math.max(1, page);
  const effectiveLimit = Math.max(1, Math.min(limit, 100));
  const skip = (effectivePage - 1) * effectiveLimit;

  const filter: any = {
    isDeleted: false,
  };

  if (flag === "active") {
    filter.isActive = true;
  }

  const total = await LicenseKey.countDocuments(filter);

  const results = await LicenseKey.find(filter).select("-__v")
    .populate("assessment", "title")
    .skip(skip)
    .limit(effectiveLimit)
    .sort({ createdAt: -1 })
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

/**
 * Get single license key by ID
 */
export const getLicenseById = async (
  id: string
): Promise<Partial<ILicenseKey> | null> => {
  if (!Types.ObjectId.isValid(id)) return null;

  return await LicenseKey.findById(id)
    .populate("assessment", "title").select("-__v")
    .lean();
};

/**
 * Get license by code (used during validation)
 */
export const getLicenseByCode = async (
  code: string
): Promise<Partial<ILicenseKey> | null> => {
  return await LicenseKey.findOne({
    code: code.toUpperCase(),
    isDeleted: false,
    isActive: true,
  }).select("-__v")
    .populate("assessment", "title")
    .lean();
};

/**
 * Create new license key
 */
export const createLicense = async (
  data: Partial<ILicenseKey>
): Promise<ILicenseKey> => {
  const license = new LicenseKey({
    ...data,
    code: data.code?.toUpperCase(),
  });

  return await license.save();
};

/**
 * Update license key by ID
 */
export const updateLicense = async (
  id: string,
  data: Partial<ILicenseKey>
): Promise<
  | Partial<ILicenseKey>
  | FieldValidationError
  | ErrorMessageResponse
  | null
> => {
  if (!Types.ObjectId.isValid(id)) return null;

  return await LicenseKey.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .select("-__v")
    .lean();
};

/**
 * Soft delete license key
 */
export const deleteLicense = async (
  id: string
): Promise<Partial<ILicenseKey> | null> => {
  if (!Types.ObjectId.isValid(id)) return null;

  return await LicenseKey.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { new: true }
  ).lean();
};

export const validateLicense = async (
  data: Partial<ILicenseKey>
): Promise<Partial<ILicenseKey> | null> => {
  const license = await LicenseKey.findOne({
    code: data.code,
    isDeleted: false,
    isActive: true,
  }).select("-__v")
    .lean();

  if (!license) {
    throw new Error("This license key is either inactive or could not be found.\nPlease reach out to our management team for verification or support.\nWe’ll get back to you within 24 hours.");
  }

  if (license.expiresAt && license.expiresAt < new Date()) {
    throw new Error("Your license has expired.\nPlease reach out to our management team for assistance.");
  }

  if (license.hasUsageLimit) {
    const usageLimit = typeof license.usageLimit === "string"
      ? parseInt(license.usageLimit)
      : license.usageLimit || 0;

    if ((license.usedCount || 0) >= usageLimit) {
      throw new Error("Your license has reached its maximum usage limit.\nPlease contact our management team for further assistance.");
    }
  } 

  if(license.scope === "ASSESSMENT" && data.assessment) {
    if (!license.assessment || license.assessment.toString() !== data.assessment.toString()) {
      throw new Error("This license is not valid for the specified assessment.\nPlease contact our management team for assistance.");
    }
  }

  return {
    code: license.code,
    name: license.name,
  }
}