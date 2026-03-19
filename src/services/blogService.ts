import BlogModel from "../models/Blog";
import { Types } from "mongoose";
import { BlogDetailsResponse, BlogListResponse } from "../types/schema/Blog";
import { USER_ROLES } from "../constraints/common";

export const getAllBlogs = async (req: any, query: any): Promise<BlogListResponse> => {
  const { page, limit, search, category, tag, author, status } = query;

  const user = req?.user;

  const effectivePage = Math.max(1, page);
  const effectiveLimit = Math.max(1, Math.min(limit, 100));
  const skip = (effectivePage - 1) * effectiveLimit;

  const filter: any = {
    isDeleted: false,
  };

  if (status === "active") {
    filter.isActive = true;
  }

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  if (category) {
    filter.category = category;
  }

  if (tag) {
    filter.tags = tag;
  }

  const userRole = typeof user?.role === "object" ? user?.role?.name : user?.role;

  if (userRole === USER_ROLES.COUNSELLOR) {
    filter.author = user?._id;
  }

  if (!user || userRole === USER_ROLES.USER) {
    filter.published = true;
  }

  if (author) {
    if (!Types.ObjectId.isValid(author)) {
      throw new Error("Invalid author ID");
    }

    filter.author = author;
  }

  const total = await BlogModel.countDocuments(filter);

  const results = await BlogModel.find(filter).select("-__v")
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
    results: results as unknown as BlogDetailsResponse[],
  };
};

export const getBlogById = async (req: any, blogIdOrSlug: string): Promise<BlogDetailsResponse> => {
  const user = req?.user;

  let blog: any = null;

  if (Types.ObjectId.isValid(blogIdOrSlug)) {
    blog = await BlogModel.findById(blogIdOrSlug).populate("author", "firstName lastName name").select("-__v").lean();
  } else {
    blog = await BlogModel.findOne({ slug: blogIdOrSlug }).populate("author", "firstName lastName name").select("-__v").lean();
  }

  if (!blog) {
    throw new Error("Blog not found");
  }

  const userRole = typeof user?.role === "object" ? user?.role?.name : user?.role;

  if ((!user || userRole === USER_ROLES.USER) && !blog.published) {
    throw new Error("Blog not found");
  }

  if (blog.author && typeof blog.author === 'object') {
    (blog.author as any).name = `${(blog.author as any).firstName || ''} ${(blog.author as any).lastName || ''}`.trim();
  }

  return blog as unknown as BlogDetailsResponse;
};

export const createBlog = async (blogData: any) => {
  const { title, slug, excerpt, content, coverImage, category, tags, readTime, published, author } = blogData;

  const blog = new BlogModel({
    title,
    slug,
    excerpt,
    content,
    coverImage,
    category,
    tags,
    readTime,
    published,
    author,
  });

  await blog.save();

  return blog;
};

export const updateBlog = async (blogId: string, updateData: any) => {
  try {
    const { title, slug, excerpt, content, coverImage, category, tags, readTime, published, author } = updateData;

    const blog = await BlogModel.findById(blogId);

    if (!blog) {
      throw new Error("Blog not found");
    }

    blog.title = title;
    blog.slug = slug;
    blog.excerpt = excerpt;
    blog.content = content;
    blog.coverImage = coverImage;
    blog.category = category;
    blog.tags = tags;
    blog.readTime = readTime;
    blog.published = published;
    blog.author = author;

    await blog.save();

    return blog;
  } catch (error: any) {
    throw new Error(error.message || "Failed to update blog");
  }
};

export const deleteBlog = async (blogId: string) => {
  // Logic to delete a blog post by its ID
  try {
    const blog = await BlogModel.findById(blogId);

    if (!blog) {
      throw new Error("Blog not found");
    }

    blog.isDeleted = true;

    await blog.save();

    return blog;
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete blog");
  }
};