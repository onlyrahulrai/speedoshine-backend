export interface CreateTestimonialRequest {
  name: string;
  roleOrAge: string;
  message: string;
  type: "testimonial" | "story";
  rating?: number; // ⭐ added rating
  published?: boolean;
}

export interface UpdateTestimonialRequest {
  name: string;
  roleOrAge: string;
  message: string;
  type: "testimonial" | "story";
  rating?: number; // ⭐ added rating
  published?: boolean;
}

export interface TestimonialDetailsResponse {
  _id: string;
  name: string;
  roleOrAge: string;
  message: string;
  type: "testimonial" | "story";
  rating?: number; // ⭐ added rating
  published?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonialListResponse {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
  results: TestimonialDetailsResponse[];
}
