import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

/*
 * Security
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

/*
 * CORS
 */
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === env.CLIENT_URL ||
        origin === "https://santipur-saree.vercel.app" ||
        /^https:\/\/santipur-saree(-[a-zA-Z0-9]+)?\.vercel\.app$/.test(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

/*
 * Rate limiting
 */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

/*
 * Body parsing
 */
app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

/*
 * Cookies
 */
app.use(cookieParser());

/*
 * Compression
 */
app.use(compression());

/*
 * Logging
 */
app.use(pinoHttp());

/*
 * Health check
 */
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    environment: env.NODE_ENV,
  });
});

/*
 * API Routes
 */
app.use("/api", routes);

/*
 * 404 Handler
 */
app.use(notFound);

/*
 * Error Handler
 */
app.use(errorHandler);

export default app;
