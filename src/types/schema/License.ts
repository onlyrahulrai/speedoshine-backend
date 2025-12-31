// types/schema/License.ts
export interface LicenseRequest {
  _id?: string;
  name: string;
  code: string;
  scope?: "GLOBAL" | "ASSESSMENT";
  assessment?: string | null;
  hasUsageLimit?: boolean;
  usageLimit?: number | string | null;
  usedCount?: number;
  expiresAt?: Date;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LicenseResponse {
  _id: string;
  name: string;
  code: string;
  scope: string;
  assessment?: any;
  hasUsageLimit: boolean;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: Date;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenseListResponse {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
  results: LicenseResponse[];
}

export interface ValidateLicenseRequest {
  code: string;
  assessment?: string;
}