import jwt from "jsonwebtoken";
import path from "path";

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

export const formatFile = (file: Express.Multer.File, baseUrl: string) => {
  const relativePath = path.relative(process.cwd(), file.path)
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
}
