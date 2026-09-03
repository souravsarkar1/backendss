import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import {
  signup,
  login,
  verifyOtp,
  resendOtp,
  generateTokens,
  setTokenCookies,
  clearTokenCookies,
  refreshAccessToken,
  googleSsoLogin,
} from "../services/auth.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const googleSsoController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, photoURL, photoUrl, avatar } = req.body;

    if (!email) {
      sendError(res, 400, "Validation error", "Google account email is required");
      return;
    }

    const picture = photoURL || photoUrl || avatar || "";
    const { user, tokens } = await googleSsoLogin(email, name, picture);
    setTokenCookies(res, tokens);

    sendSuccess(res, 200, "Google authentication successful", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const signupController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, mobile, phone } = req.body;

    if (!name || !email || !password) {
      sendError(res, 400, "Validation error", "Name, email, and password are required");
      return;
    }

    if (password.length < 6) {
      sendError(res, 400, "Validation error", "Password must be at least 6 characters");
      return;
    }

    const { user, otp } = await signup(name, email, password, phone || mobile);
    const tokens = generateTokens(user);
    setTokenCookies(res, tokens);

    sendSuccess(res, 201, "Registration successful. Please verify OTP.", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      otpDemo: otp,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Email already registered") {
      sendError(res, 409, "Signup failed", error.message);
      return;
    }
    next(error);
  }
};

export const verifyOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      sendError(res, 400, "Validation error", "Email and OTP are required");
      return;
    }

    const user = await verifyOtp(email, otp);
    const tokens = generateTokens(user);
    setTokenCookies(res, tokens);

    sendSuccess(res, 200, "OTP verified successfully", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "User not found" || error.message === "Invalid or expired OTP")
    ) {
      sendError(res, 400, "Verification failed", error.message);
      return;
    }
    next(error);
  }
};

export const resendOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendError(res, 400, "Validation error", "Email is required");
      return;
    }

    const otp = await resendOtp(email);
    sendSuccess(res, 200, "OTP resent successfully", { otpDemo: otp });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 400, "Validation error", "Email and password are required");
      return;
    }

    const user = await login(email, password);
    const tokens = generateTokens(user);
    setTokenCookies(res, tokens);

    sendSuccess(res, 200, "Login successful", {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid credentials") {
      sendError(res, 401, "Login failed", error.message);
      return;
    }
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    clearTokenCookies(res);
    sendSuccess(res, 200, "Logout successful");
  } catch (error) {
    next(error);
  }
};

export const getMeController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    sendSuccess(res, 200, "User retrieved", {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
        isEmailVerified: req.user.isEmailVerified,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      sendError(res, 401, "Refresh token required");
      return;
    }

    const accessToken = await refreshAccessToken(refreshToken);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("token", accessToken, cookieOptions);

    sendSuccess(res, 200, "Token refreshed");
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid refresh token") {
      clearTokenCookies(res);
      sendError(res, 401, "Session expired", error.message);
      return;
    }
    next(error);
  }
};