import jwt from "jsonwebtoken";
import { User, IUser } from "../models/user.model.js";
import { env } from "../config/env.js";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (user: IUser): AuthTokens => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "30d",
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

export const setTokenCookies = (res: any, tokens: AuthTokens): void => {
  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("token", tokens.accessToken, cookieOptions);
  res.cookie("refreshToken", tokens.refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export const clearTokenCookies = (res: any): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
  });
};

export const signup = async (
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<{ user: IUser; otp: string }> => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const demoOtp = "123456";
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  //@ts-ignore

  const user = await User.create({
    name,
    email,
    password,
    phone,
    isEmailVerified: false,
    otp: demoOtp,
    otpExpires,
  });

  return { user, otp: demoOtp };
};

export const verifyOtp = async (email: string, otp: string): Promise<IUser> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  const isValidOtp =
    otp === "123456" ||
    (user.otp === otp && user.otpExpires && user.otpExpires > new Date());

  if (!isValidOtp) {
    throw new Error("Invalid or expired OTP");
  }

  user.isEmailVerified = true;
  //@ts-ignore
  user.otp = undefined;
  //@ts-ignore
  user.otpExpires = undefined;
  await user.save();

  return user;
};

export const resendOtp = async (email: string): Promise<string> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  const demoOtp = "123456";
  user.otp = demoOtp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  return demoOtp;
};

export const login = async (email: string, password: string): Promise<IUser> => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await (user as IUser).comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
};

export const googleSsoLogin = async (
  email: string,
  name: string,
  photoURL?: string
): Promise<{ user: IUser; tokens: AuthTokens }> => {
  let user = await User.findOne({ email });

  if (!user) {
    // Generate secure random password for OAuth user
    const randomPassword = `OAuth_${Math.random().toString(36).slice(-10)}_${Date.now()}`;
    //@ts-ignore
    user = await User.create({
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      password: randomPassword,
      avatar: photoURL || "",
      isEmailVerified: true,
      role: "customer",
      status: "active",
      lastLoginAt: new Date(),
    });
  } else {
    user.isEmailVerified = true;
    user.lastLoginAt = new Date();
    if (photoURL) {
      user.avatar = photoURL;
    }
    await user.save();
  }

  const tokens = generateTokens(user);
  return { user, tokens };
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as TokenPayload;
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error("User not found");
    }
    const tokens = generateTokens(user);
    return tokens.accessToken;
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};