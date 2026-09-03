import { AuthRequest } from "../middlewares/auth.middleware.js";
import { Request, Response, NextFunction } from "express";
import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getCartController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );

    if (!cart) {
      sendSuccess(res, 200, "Cart retrieved", {
        cart: { items: [], totalItems: 0, totalPrice: 0 },
      });
      return;
    }

    const validItems = cart.items.filter(
      (item) => item.product && (item.product as any).isActive
    );

    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    sendSuccess(res, 200, "Cart retrieved", { cart });
  } catch (error) {
    next(error);
  }
};

export const updateCartItemController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity < 1) {
      sendError(res, 400, "Validation error", "Quantity must be a positive number");
      return;
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      sendError(res, 404, "Cart not found");
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id?.toString() === itemId
    );

    if (itemIndex === -1) {
      sendError(res, 404, "Cart item not found");
      return;
    }

    const cartItem = cart.items[itemIndex];
    if (!cartItem) {
      sendError(res, 404, "Cart item not found");
      return;
    }

    const product = await Product.findById(cartItem.product);

    if (!product || !product.isActive) {
      sendError(res, 404, "Product no longer available");
      return;
    }

    if (quantity > product.stock) {
      sendError(res, 400, "Insufficient stock", `Only ${product.stock} items available`);
      return;
    }

    cartItem.quantity = quantity;
    cart.calculateTotals();
    await cart.save();
    await cart.populate("items.product");

    sendSuccess(res, 200, "Cart updated", { cart });
  } catch (error) {
    next(error);
  }
};

export const removeCartItemController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      sendError(res, 404, "Cart not found");
      return;
    }

    cart.items = cart.items.filter((item) => item._id && item._id.toString() !== itemId);
    cart.calculateTotals();
    await cart.save();
    await cart.populate("items.product");

    sendSuccess(res, 200, "Item removed from cart", { cart });
  } catch (error) {
    next(error);
  }
};

export const clearCartController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      sendSuccess(res, 200, "Cart already empty", { cart: { items: [], totalItems: 0, totalPrice: 0 } });
      return;
    }

    cart.items = [];
    cart.calculateTotals();
    await cart.save();

    sendSuccess(res, 200, "Cart cleared", { cart });
  } catch (error) {
    next(error);
  }
};

export const getCartCountController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendSuccess(res, 200, "Cart count", { count: 0 });
      return;
    }

    const cart = await Cart.findOne({ user: req.user._id });

    sendSuccess(res, 200, "Cart count", { count: cart?.totalItems || 0 });
  } catch (error) {
    next(error);
  }
};