import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("API Error on", req.method, req.originalUrl, ":", err);

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    sendError(res, 400, "Validation error", messages.join(", "));
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    const path = (err as any).path || "id";
    const val = (err as any).value;
    console.error(`Mongoose CastError at path "${path}" with value "${val}"`);
    sendError(res, 400, "Invalid ID", `Invalid format for ${path}: ${val}`);
    return;
  }

  if (err.name === "MongoServerError" && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    sendError(res, 409, "Duplicate entry", `${field} already exists`);
    return;
  }

  if (err.name === "JsonWebTokenError") {
    sendError(res, 401, "Invalid token", "Authentication failed");
    return;
  }

  if (err.name === "TokenExpiredError") {
    sendError(res, 401, "Token expired", "Please login again");
    return;
  }

  const statusCode = (err as any).statusCode || 500;
  const message = err.message || "Internal server error";

  sendError(res, statusCode, "Error", env.NODE_ENV === "development" ? message : "Internal server error");
};