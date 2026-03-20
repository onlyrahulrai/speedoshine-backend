export interface SuccessMessageResponse {
  message: string;
}

export interface ErrorMessageResponse {
  message?: string;
}

export interface FieldValidationError {
  fields?: Record<string, string>;
}

export interface AccessDeniedErrorMessageResponse extends ErrorMessageResponse { }

export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
  results: Partial<T>[];
}