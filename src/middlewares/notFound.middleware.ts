import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  sendError(res, 404, "Route not found", `Cannot ${req.method} ${req.originalUrl}`);
};