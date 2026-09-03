import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { sendError } from "../utils/response.js";

export interface AuthRequest<P = any> extends Request<P> {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      sendError(res, 401, "Authentication required", "No token provided");
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      sendError(res, 401, "User not found", "Invalid token");
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 401, "Invalid token", "Token verification failed");
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 401, "Token expired", "Please login again");
      return;
    }
    sendError(res, 500, "Authentication error", "Internal server error");
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 403, "Access denied", "Insufficient permissions");
      return;
    }

    next();
  };
};