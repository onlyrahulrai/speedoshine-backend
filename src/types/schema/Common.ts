export interface FieldValidationError {
  type?: string;
  errors?: Record<string, string>;
}

export interface ErrorMessageResponse {
  type?: string;
  message?: string;
}

export interface SuccessMessageResponse {
  message: string;
}

export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
  total: number;
  results: Partial<T>[];
}