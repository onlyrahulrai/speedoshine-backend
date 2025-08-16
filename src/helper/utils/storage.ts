import multer, { FileFilterCallback } from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import type { Request } from "express";

/**
 * Where to store uploads on disk.
 * Using process.cwd() keeps paths stable across build/output folders.
 */
const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

/**
 * Ensure a directory exists (idempotent).
 */
function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Very light filename base sanitizer: strips path separators and non-word chars.
 * Keeps unicode letters/numbers/space/.-_ and trims length.
 */
function sanitizeBaseName(name: string, maxLen = 100): string {
  const base = name.replace(/[/\\]+/g, ""); // remove slashes
  const dotIdx = base.lastIndexOf(".");
  const raw = dotIdx > 0 ? base.slice(0, dotIdx) : base;
  const cleaned = raw.normalize("NFKC").replace(/[^\p{L}\p{N}\s._-]+/gu, "").trim();
  return cleaned.slice(0, maxLen) || "file";
}

/**
 * Multer disk storage
 */
const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb) => {
    const folderName = (req.body?.folder as string) || "profile";
    const safeFolder = folderName.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\.+/, "") || "profile";
    const uploadPath = path.join(UPLOADS_ROOT, safeFolder);

    ensureDir(uploadPath);
    cb(null, uploadPath);
  },

  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeBaseName(file.originalname);
    const shortId = uuidv4().split("-")[0];
    const finalName = `${base}-${shortId}${ext}`;
    cb(null, finalName);
  },
});

/**
 * Allowed MIME types
 */
const ALLOWED_MIME_TYPES = new Set<string>([
  "image/png",
  "image/jpg",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls (older)
  // Optionally include a few common Excel variants browsers sometimes send:
  "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
  "application/octet-stream", // (some clients incorrectly send this; consider removing if too permissive)
]);

/**
 * File filter for validation
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .png, .jpg, .jpeg, .xlsx, and .xls files are allowed"));
  }
};

/**
 * Multer instance
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 10,                 // safety cap for array uploads
  },
});

export default upload;

export { upload, storage, fileFilter, UPLOADS_ROOT };
