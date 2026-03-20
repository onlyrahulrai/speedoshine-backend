import jwt from "jsonwebtoken";
import path from "path";

/**
 * Generates a JWT token with the provided payload.
 * @param payload - The data to encode in the token
 * @param expiresIn - Token expiration time (default: "7d")
 * @returns The signed JWT token
 * @throws Error if JWT_SECRET is not defined in environment variables
 */
export const generateToken = (
  payload: object,
  expiresIn: string | number = "7d"
): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Formats a file upload object to include metadata and URL information.
 * @param file - The Express Multer file object
 * @param baseUrl - The base URL for constructing the file access URL
 * @returns An object containing file metadata and the relative/absolute URL paths
 */
export const formatFile = (file: Express.Multer.File, baseUrl: string) => {
  const relativePath = path
    .relative(process.cwd(), file.path)
    .replace(/\\/g, "/")
    .replace(/^.*uploads\//, "uploads/");

  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    filename: file.filename,
    relativePath: relativePath.replace(/^uploads\//, ""),
    url: `${baseUrl}/api/${relativePath}`,
  };
};
