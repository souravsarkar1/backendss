import { Response } from "express";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  error?: string
): void => {
  const response: ApiResponse<T> = {
    success,
    message,
    ...(data && { data }),
    ...(error && { error }),
  };
  res.status(statusCode).json(response);
};

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): void => {
  sendResponse(res, statusCode, true, message, data);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: string
): void => {
  sendResponse(res, statusCode, false, message, undefined, error);
};