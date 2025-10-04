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

// Serve static files from public directory
app.use("/api/uploads", express.static(join(__dirname, "../uploads")));

// Add JSON parsing middleware for TSOA routes
app.use(express.json());

const apiRouter = express.Router();

const { RegisterRoutes } = await import("../dist/routes");

RegisterRoutes(apiRouter);

app.use("/api", apiRouter);

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

    return  res.json({
    count: files.length,
    files: files.map((f) => formatFile(f, `${req.protocol}://${req.get("host")}`)),
  });

  }
);

// Multer middleware will be applied in the controller
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
