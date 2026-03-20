import "reflect-metadata";
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import "colors";
import { createServer } from "node:http";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../dist/swagger.json" assert { type: "json" };
import "./workers";
import { serverAdapter as bullBoardAdapter } from "./jobs/bullBoard";
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
import axios from 'axios';
import Upload from "./models/Upload";

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
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileResponse = formatFile(
      req.file,
      `${req.protocol}://${req.get("host")}`
    );

    try {
      await Upload.create({
        url: fileResponse.url,
        filename: fileResponse.filename,
        mimetype: fileResponse.mimetype,
        size: fileResponse.size,
        used: false,
      });
    } catch (error) {
      console.error("Failed to save upload record:", error);
    }

    return res.json({ file: fileResponse });
  }
);

app.post(
  "/api/upload/multiple",
  upload.array("files", 5),
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files?.length)
      return res.status(400).json({ message: "No files uploaded" });

    const fileResponses = files.map((f) => formatFile(f, `${req.protocol}://${req.get("host")}`));

    try {
      await Upload.insertMany(
        fileResponses.map((f) => ({
          url: f.url,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          used: false,
        }))
      );
    } catch (error) {
      console.error("Failed to save upload records:", error);
    }

    return res.json({
      count: files.length,
      files: fileResponses,
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
app.use("/admin/queues", bullBoardAdapter.getRouter());


const RECHARGE_CONFIG = {
  baseUrl: 'https://business.a1topup.com/recharge/api',
  username: '505663',
  pwd: 'jtyc7xry',
  circleCode: '10'
};

app.post('/api/recharge', async (req, res) => {
  const { operatorCode, number, amount, orderId } = req.body;

  if (!operatorCode || !number || !amount || !orderId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const params = {
      username: RECHARGE_CONFIG.username,
      pwd: RECHARGE_CONFIG.pwd,
      circlecode: RECHARGE_CONFIG.circleCode,
      operatorcode: operatorCode,
      number: number,
      amount: amount,
      orderid: orderId,
      format: 'json',
    };

    const response = await axios.get(RECHARGE_CONFIG.baseUrl, { params });

    res.json(response.data);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process recharge with provider'
    });
  }
});

app.get("/", async (req, res) => {
  return res.status(200).send("Hello, John Doe");
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Unexpected error";
  res.status(status).json({ message });
});

(async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`.blue.bold);
  });
})();
