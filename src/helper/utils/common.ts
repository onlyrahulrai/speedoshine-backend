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

export function shuffle(array: any[], type: string = "questions"): any[] {
  const arr = [...array]; // clone to avoid mutating original

  let other: any = null;

  if (type === "options") {
    // Pull out "Other" if it exists
    const otherIndex = arr.findIndex((opt) =>
      typeof opt?.text === "string"
        ? ["other", "none of these"].includes(opt.text.toLowerCase())
        : false
    );

    if (otherIndex !== -1) {
      other = arr.splice(otherIndex, 1)[0]; // remove "Other"
    }
  }

  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  if (type === "options" && other) {
    arr.push(other); // put "Other" back at the end
  }

  return arr;
}
