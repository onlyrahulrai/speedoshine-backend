import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Path,
  Body,
  Security,
  SuccessResponse,
  Response,
  Query,
  Request,
  Middlewares
} from "tsoa";
import * as BlogService from "../services/blogService";
import {
  CreateBlogRequest,
  UpdateBlogRequest,
  BlogDetailsResponse,
  BlogListResponse
} from "../types/schema/Blog";
import { AuthenticationRequiredResponse } from "../types/schema/Auth";
import { AccessDeniedErrorMessageResponse, ErrorMessageResponse, ErrorResponse, ValidateError } from "../types/schema/Common";
import { API_MESSAGES } from "../constraints/common";
import { PERMISSIONS } from "../constraints/permissions";
import { requirePermission } from "../middleware/requirePermission";
import { validateManageBlog } from "../helper/validators/blog";

@Route("blogs")
@Tags("Blog")
export class BlogController extends Controller {
  /** Get all blog posts with pagination */
  @Get("/")
  @SuccessResponse(
    200,
    "List of blogs retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorResponse>(400, API_MESSAGES.FETCH_LIST_FAILED)
  public async getBlogs(
    @Request() req: any,
    @Query() page: number = 1,
    @Query() limit: number = 10,
    @Query() search: string = "",
    @Query() category: string = "",
    @Query() tag: string = "",
    @Query() author: string = "",
    @Query() status: string = "",
  ) {
    return await BlogService.getAllBlogs(req, { page, limit, search, category, tag, author, status }) as BlogListResponse;
  }

  /** Get a single blog post by ID */
  @Get("/{blogId}")
  @SuccessResponse(
    200,
    "Blog retrieved successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<ErrorResponse>(400, API_MESSAGES.FETCH_FAILED)
  public async getBlogById(
    @Request() req: any,
    @Path() blogId: string
  ): Promise<BlogDetailsResponse | ErrorMessageResponse> {
    try {
      return await BlogService.getBlogById(req, blogId) as BlogDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.FETCH_FAILED };
    }
  }

  /** Create a new blog post */
  @Security("jwt")
  @Post("/")
  @Middlewares(requirePermission(PERMISSIONS.BLOG_CREATE))
  @SuccessResponse(201, "Blog created successfully")
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ValidateError>(422, "Validation Failed")
  @Response<ErrorResponse>(400, API_MESSAGES.CREATE_FAILED)
  public async createBlog(
    @Body() body: CreateBlogRequest
  ): Promise<BlogDetailsResponse | ErrorResponse | ValidateError> {
    try {
      const fields = validateManageBlog(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await BlogService.createBlog(body) as unknown as BlogDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.CREATE_FAILED };
    }
  }

  /** Update an existing blog post */
  @Security("jwt")
  @Put("/{blogId}")
  @Middlewares(requirePermission(PERMISSIONS.BLOG_UPDATE))
  @SuccessResponse(
    200,
    "Blog updated successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.UPDATE_FAILED)
  @Response<ValidateError>(422, "Validation Failed")
  public async updateBlog(
    @Path() blogId: string,
    @Body() body: UpdateBlogRequest
  ) {
    try {
      const fields = validateManageBlog(body);

      if (Object.keys(fields).length > 0) {
        this.setStatus(422);
        return { fields };
      }

      return await BlogService.updateBlog(blogId, body) as unknown as BlogDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.UPDATE_FAILED };
    }
  }

  /** Delete a blog post by ID */
  @Security("jwt")
  @Delete("/{blogId}")
  @Middlewares(requirePermission(PERMISSIONS.BLOG_DELETE))
  @SuccessResponse(
    200,
    "Blog deleted successfully"
  )
  @Response<AuthenticationRequiredResponse>(401, "Authentication required")
  @Response<AccessDeniedErrorMessageResponse>(403, "Access denied")
  @Response<ErrorMessageResponse>(400, API_MESSAGES.DELETE_FAILED)
  public async deleteBlog(
    @Path() blogId: string
  ) {
    try {
      return await BlogService.deleteBlog(blogId) as unknown as BlogDetailsResponse;
    } catch (error: any) {
      this.setStatus(400);
      return { message: error.message || API_MESSAGES.DELETE_FAILED };
    }
  }
}

