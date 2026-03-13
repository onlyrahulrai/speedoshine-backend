import { ReportTemplateScope } from "../../models/ReportTemplate";

/**
 * Base Report Template Model
 */
export interface ReportTemplateResponse {
  id: string;
  name: string;
  content: string;
  scope: ReportTemplateScope;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Request (POST)
 */
export interface ReportTemplateRequest {
  _id?: string; // Optional for create, required for update
  name: string;
  content: string;
  scope: ReportTemplateScope;
  isActive?: boolean;
  isDeleted?: boolean;
}

/**
 * Patch Request (Partial Update)
 */
export interface ReportTemplatePatchRequest {
  name?: string;
  content?: string;
  scope?: ReportTemplateScope;
  isActive?: boolean;
  isDeleted?: boolean;
}

/**
 * List Response (Pagination)
 */
export interface ReportTemplateListResponse {
  data: ReportTemplateResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
