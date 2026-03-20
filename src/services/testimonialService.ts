import Testimonial, { ITestimonial } from "../models/TestimonialStory";
import { Types } from "mongoose";
import { CreateTestimonialRequest, TestimonialDetailsResponse, TestimonialListResponse, UpdateTestimonialRequest } from "../types/schema/Testimonial";

/**
 * Get all testimonials (paginated)
 */
export const getAllTestimonials = async (
  page: number = 1,
  limit: number = 10,
  flag: string = "published"
): Promise<TestimonialListResponse> => {
  try {
    const effectivePage = Math.max(1, page);
    const effectiveLimit = Math.max(1, Math.min(limit, 100));
    const skip = (effectivePage - 1) * effectiveLimit;

    const filter: any = {};

    if (flag === "published") {
      filter.published = true;
    }

    const total = await Testimonial.countDocuments(filter);

    const results = await Testimonial.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
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
      results: results as unknown as TestimonialDetailsResponse[],
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch testimonials");
  }
};

/**
 * Get single testimonial by ID
 */
export const getTestimonialById = async (
  id: string
): Promise<Partial<ITestimonial> | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) return null;
    const testimonial = await Testimonial.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!testimonial) {
      throw new Error("Testimonial not found");
    }

    return testimonial as unknown as TestimonialDetailsResponse;
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch testimonial");
  }
};

/**
 * Create new testimonial
 */
export const createTestimonial = async (
  data: Partial<CreateTestimonialRequest>
): Promise<TestimonialDetailsResponse> => {
  try {
    const testimonial = new Testimonial(data);
    const savedTestimonial = await testimonial.save();
    return savedTestimonial as unknown as TestimonialDetailsResponse;
  } catch (error: any) {
    throw new Error(error.message || "Failed to create testimonial");
  }
};

/**
 * Update testimonial by ID
 */
export const updateTestimonial = async (
  id: string,
  data: Partial<UpdateTestimonialRequest>
): Promise<Partial<TestimonialDetailsResponse> | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) return null;
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, data, { new: true }).lean();

    if (!updatedTestimonial) {
      throw new Error("Testimonial not found");
    }

    return updatedTestimonial as unknown as TestimonialDetailsResponse;
  } catch (error: any) {
    throw new Error(error.message || "Failed to update testimonial");
  }
};

/**
 * Delete testimonial by ID
 */
export const deleteTestimonial = async (
  id: string
): Promise<Partial<TestimonialDetailsResponse> | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) return null;
    const deletedTestimonial = await Testimonial.findByIdAndDelete(id).lean();

    if (!deletedTestimonial) {
      throw new Error("Testimonial not found");
    }

    return deletedTestimonial as unknown as TestimonialDetailsResponse;
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete testimonial");
  }
};
