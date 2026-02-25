import "reflect-metadata";

import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import "colors";
import { createServer } from "node:http";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../dist/swagger.json" assert { type: "json" };
import "./workers";
import "./helper/utils/promiseAny";
import { expressAuthentication } from "./auth/expressAuthentication";
import optionalAuth from "./middleware/optionalAuth";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
// @ts-ignore
import { initSocket } from "./helper/utils/socket";
import { connectDB } from "./config/database";
import upload from "./helper/utils/storage";
import { formatFile } from "./helper/utils/common";

(global as any).expressAuthentication = expressAuthentication;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5500;

app.use(cors());

/* =====================================================
   1. WEBHOOK RAW BODY (MUST BE FIRST)
   ===================================================== */

app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" })
);

/* =====================================================
   2. OPTIONAL AUTH
   ===================================================== */
app.use(optionalAuth);

/* =====================================================
   3. STATIC FILES
   ===================================================== */
app.use("/api/uploads", express.static(join(__dirname, "../uploads")));

/* =====================================================
   4. JSON PARSER (AFTER RAW)
   ===================================================== */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   5. FILE UPLOAD ROUTES
   ===================================================== */
app.post(
  "/api/quiz-attempts/:attemptId/reports",
  upload.single("excelFile"),
  (req: Request, res: Response, next: NextFunction) => {
    // Attach file to request for TSOA controller to access
    next();
  }
);

app.post(
  "/api/upload/single",
  upload.single("file"),
  (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileResponse = formatFile(
      req.file,
      `${req.protocol}://${req.get("host")}`
    );

    return res.json({ file: fileResponse });
  }
);

app.post(
  "/api/upload/multiple",
  upload.array("files", 5),
  (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files?.length)
      return res.status(400).json({ message: "No files uploaded" });

    return res.json({
      count: files.length,
      files: files.map((f) => formatFile(f, `${req.protocol}://${req.get("host")}`)),
    });

  }
);


/* =====================================================
   6. TSOA ROUTES
   ===================================================== */
const apiRouter = express.Router();

const { RegisterRoutes } = await import("../dist/routes");

RegisterRoutes(apiRouter);

app.use("/api", apiRouter);

/* =====================================================
   7. SWAGGER
   ===================================================== */
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", async (req, res) => {
  return res.status(200).send("Hello, John Doe");
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Unexpected error";
  res.status(status).json({ error: message });
});

(async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`.blue.bold);
  });
})();
