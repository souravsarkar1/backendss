import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { User } from "../models/user.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import bcrypt from "bcrypt";

export const getProfileController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    sendSuccess(res, 200, "Profile retrieved", {
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.phone || "",
        phone: user.phone || "",
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        addresses: user.addresses || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    const { name, mobile, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    if (name) user.name = name.trim();
    if (mobile !== undefined || phone !== undefined) {
      user.phone = (mobile || phone || "").trim();
    }
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    sendSuccess(res, 200, "Profile updated successfully", {
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.phone || "",
        phone: user.phone || "",
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAddressesController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    const user = await User.findById(req.user._id);
    const addresses = (user?.addresses || []).map((addr: any) => ({
      id: addr._id?.toString(),
      _id: addr._id,
      fullName: addr.fullName,
      mobile: addr.phone,
      phone: addr.phone,
      address: addr.addressLine1,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2,
      landmark: addr.landmark,
      city: addr.city,
      state: addr.state,
      pincode: addr.postalCode,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault || false,
    }));

    sendSuccess(res, 200, "Addresses retrieved", addresses);
  } catch (error) {
    next(error);
  }
};

export const addAddressController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    const {
      fullName,
      mobile,
      phone,
      address,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      postalCode,
      isDefault,
    } = req.body;

    if (!fullName || !(phone || mobile) || !(address || addressLine1) || !city || !state || !(pincode || postalCode)) {
      sendError(res, 400, "Validation error", "All mandatory address fields are required");
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    if (isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    const newAddress = {
      fullName: fullName.trim(),
      phone: (phone || mobile).trim(),
      addressLine1: (address || addressLine1).trim(),
      addressLine2: addressLine2?.trim() || "",
      landmark: landmark?.trim() || "",
      city: city.trim(),
      state: state.trim(),
      postalCode: (pincode || postalCode).trim(),
      country: "India",
      isDefault: !!isDefault || user.addresses.length === 0,
    };

    user.addresses.push(newAddress as any);
    await user.save();

    const created: any = user.addresses[user.addresses.length - 1];
    const formatted = {
      id: created._id?.toString(),
      _id: created._id,
      fullName: created.fullName,
      mobile: created.phone,
      phone: created.phone,
      address: created.addressLine1,
      addressLine1: created.addressLine1,
      addressLine2: created.addressLine2,
      city: created.city,
      state: created.state,
      pincode: created.postalCode,
      postalCode: created.postalCode,
      isDefault: created.isDefault,
    };

    sendSuccess(res, 201, "Address added successfully", formatted);
  } catch (error) {
    next(error);
  }
};

export const updateAddressController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    const { id } = req.params;
    const {
      fullName,
      mobile,
      phone,
      address,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      postalCode,
      isDefault,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    const addressDoc = (user.addresses as any).id(id);
    if (!addressDoc) {
      sendError(res, 404, "Address not found");
      return;
    }

    if (isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    if (fullName) addressDoc.fullName = fullName.trim();
    if (phone || mobile) addressDoc.phone = (phone || mobile).trim();
    if (address || addressLine1) addressDoc.addressLine1 = (address || addressLine1).trim();
    if (addressLine2 !== undefined) addressDoc.addressLine2 = addressLine2.trim();
    if (landmark !== undefined) addressDoc.landmark = landmark.trim();
    if (city) addressDoc.city = city.trim();
    if (state) addressDoc.state = state.trim();
    if (pincode || postalCode) addressDoc.postalCode = (pincode || postalCode).trim();
    if (isDefault !== undefined) addressDoc.isDefault = !!isDefault;

    await user.save();

    const formatted = {
      id: addressDoc._id?.toString(),
      _id: addressDoc._id,
      fullName: addressDoc.fullName,
      mobile: addressDoc.phone,
      phone: addressDoc.phone,
      address: addressDoc.addressLine1,
      city: addressDoc.city,
      state: addressDoc.state,
      pincode: addressDoc.postalCode,
      isDefault: addressDoc.isDefault,
    };

    sendSuccess(res, 200, "Address updated successfully", formatted);
  } catch (error) {
    next(error);
  }
};

export const deleteAddressController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    user.addresses = user.addresses.filter((a) => a._id?.toString() !== id);
    await user.save();

    sendSuccess(res, 200, "Address removed successfully", { id });
  } catch (error) {
    next(error);
  }
};

export const changePasswordController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Not authenticated");
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      sendError(res, 400, "Validation error", "Current and new passwords are required");
      return;
    }

    if (newPassword.length < 6) {
      sendError(res, 400, "Validation error", "New password must be at least 6 characters");
      return;
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 400, "Invalid current password");
      return;
    }

    user.password = newPassword;
    await user.save();

    sendSuccess(res, 200, "Password changed successfully");
  } catch (error) {
    next(error);
  }
};
