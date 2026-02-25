import ReportTemplate, {
  IReportTemplate,
} from "../models/ReportTemplate";
import { Types } from "mongoose";
import {
  ErrorMessageResponse,
  FieldValidationError,
  PaginatedResponse,
} from "../types/schema/Common";

/* =========================================
   PAGINATED RESPONSE INTERFACE
========================================= */


/* =========================================
   GET ALL REPORT TEMPLATES
========================================= */

export const getAllReportTemplates = async (
  page: number = 1,
  limit: number = 10,
  scope?: string,
  flag?: "active" | "admin",
  fields?: string
): Promise<PaginatedResponse<IReportTemplate>> => {
  const effectivePage = Math.max(1, page);
  const effectiveLimit = Math.max(1, Math.min(limit, 100));
  const skip = (effectivePage - 1) * effectiveLimit;

  /* =========================
     FILTER
  ========================== */

  const filter: any = { isDeleted: false };

  if (flag === "active") {
    filter.isActive = true;
  }

  if (scope) {
    filter.scope = scope;
  }

  /* =========================
     FIELD PROJECTION
  ========================== */

  let projection = "-__v";

  if (fields) {
    const allowedFields = [
      "_id",
      "name",
      "content",
      "scope",
      "isActive",
      "createdAt",
      "updatedAt",
    ];

    const requestedFields = fields
      .split(",")
      .map((f) => f.trim())
      .filter((f) => allowedFields.includes(f));

    if (requestedFields.length > 0) {
      projection = requestedFields.join(" ");
    }
  }

  /* =========================
     QUERY
  ========================== */

  const total = await ReportTemplate.countDocuments(filter);

  const results = await ReportTemplate.find(filter)
    .select(projection)
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

/* =========================================
   GET SINGLE TEMPLATE BY ID
========================================= */

export const getReportTemplateById = async (
  id: string
): Promise<Partial<IReportTemplate> | null> => {
  if (!Types.ObjectId.isValid(id)) return null;

  return await ReportTemplate.findById(id)
    .select("-__v")
    .lean();
};

/* =========================================
   CREATE TEMPLATE
========================================= */

export const createReportTemplate = async (
  data: Partial<IReportTemplate>
): Promise<IReportTemplate> => {
  const template = new ReportTemplate({
    ...data,
  });

  return await template.save();
};

/* =========================================
   UPDATE TEMPLATE
========================================= */

export const updateReportTemplate = async (
  id: string,
  data: Partial<IReportTemplate>
): Promise<
  | Partial<IReportTemplate>
  | FieldValidationError
  | ErrorMessageResponse
  | null
> => {
  if (!Types.ObjectId.isValid(id)) return null;

  return await ReportTemplate.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .select("-__v")
    .lean();
};

/* =========================================
   SOFT DELETE TEMPLATE
========================================= */

export const deleteReportTemplate = async (
  id: string
): Promise<Partial<IReportTemplate> | null> => {
  if (!Types.ObjectId.isValid(id)) return null;

  return await ReportTemplate.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { new: true }
  ).lean();
};

/* =========================================
   GET ACTIVE TEMPLATE BY SCOPE
   (Used During Report Generation)
========================================= */

export const getActiveTemplateByScope = async (
  scope: "welcome" | "guideline" | "advertisement"
): Promise<Partial<IReportTemplate> | null> => {
  return await ReportTemplate.findOne({
    scope,
    isActive: true,
    isDeleted: false,
  })
    .select("-__v")
    .lean();
};
