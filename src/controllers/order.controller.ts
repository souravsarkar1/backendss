import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  initiateRazorpayRefund,
  getRazorpayPublicKey,
} from "../services/razorpay.service.js";

const generateOrderId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SS-${timestamp}-${random}`;
};

const formatOrderResponse = (order: any) => {
  return {
    id: order.orderId,
    _id: order._id,
    orderId: order.orderId,
    amount: order.totalAmount,
    total: order.totalAmount,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    tax: order.tax,
    payment: order.paymentMethod,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentDetails: order.paymentDetails,
    status: order.status,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt,
    address: `${order.shippingAddress?.address || ""}, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""
      } - ${order.shippingAddress?.postalCode || ""}`,
    shippingAddress: order.shippingAddress,
    estimated: order.estimatedDelivery
      ? new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      : "5–7 Days",
    estimatedDelivery: order.estimatedDelivery,
    items: (order.items || []).map((it: any) => ({
      product: it.product,
      productId: it.product,
      name: it.name,
      price: it.price,
      qty: it.quantity,
      quantity: it.quantity,
      size: it.size,
      color: it.color,
      image: it.image,
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

/**
 * Get Public Razorpay Key ID
 */
export const getRazorpayKeyController = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const keyId = getRazorpayPublicKey();
    sendSuccess(res, 200, "Razorpay key retrieved", { keyId });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate Razorpay Order (Pre-payment creation)
 */
export const createRazorpayOrderController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("user :", req.user);
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      console.log("Authentication required");
      return;
    }
    console.log("user1 :", req.user);
    const { items, subtotal, delivery, shippingFee, tax = 0, discount = 0 } = req.body;
    console.log("user2 :", req.user);

    const orderItems = Array.isArray(items) && items.length > 0 ? items : [];
    let calculatedSubtotal = 0;

    for (const item of orderItems) {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity || item.qty) || 1;
      calculatedSubtotal += price * qty;
    }

    const finalSubtotal = subtotal !== undefined ? Number(subtotal) : calculatedSubtotal;
    const finalDelivery =
      delivery !== undefined
        ? Number(delivery)
        : shippingFee !== undefined
          ? Number(shippingFee)
          : finalSubtotal > 999
            ? 0
            : 99;

    const finalTax = Number(tax) || 0;
    const finalDiscount = Number(discount) || 0;
    const totalAmount = Math.max(1, finalSubtotal + finalDelivery + finalTax - finalDiscount);

    const tempReceipt = `rcpt_${Date.now().toString().slice(-8)}`;

    const razorpayOrder = await createRazorpayOrder({
      amountInRupees: totalAmount,
      receipt: tempReceipt,
      notes: {
        userId: req.user._id.toString(),
        userEmail: req.user.email || "",
      },
    });

    sendSuccess(res, 200, "Razorpay order created successfully", {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paise
      currency: razorpayOrder.currency,
      keyId: getRazorpayPublicKey(),
      totalAmount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay Payment and finalize order
 */
export const verifyRazorpayPaymentController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderData,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      sendError(res, 400, "Payment verification details are incomplete");
      return;
    }

    // Verify signature
    const isValid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      sendError(res, 400, "Payment verification failed: Invalid signature");
      return;
    }

    const {
      fullName,
      mobile,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      postalCode,
      items,
      subtotal,
      shippingFee,
      delivery,
      discount = 0,
      tax = 0,
      notes,
    } = orderData || req.body;

    if (!fullName || !address || !city || !state || !(pincode || postalCode)) {
      sendError(res, 400, "Validation error", "All shipping address fields are required");
      return;
    }

    const orderItems = Array.isArray(items) && items.length > 0 ? items : [];
    let calculatedSubtotal = 0;
    const formattedItems = orderItems.map((item: any) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity || item.qty) || 1;
      calculatedSubtotal += price * qty;
      return {
        product: item.productId || item.id,
        name: item.name || "Handloom Saree",
        price,
        quantity: qty,
        size: item.selectedSize || item.size || "Free",
        color: item.selectedColor || item.color || "Traditional",
        image: item.image || item.images?.[0] || "",
      };
    });

    const finalSubtotal = subtotal ? Number(subtotal) : calculatedSubtotal;
    const finalDelivery =
      delivery !== undefined
        ? Number(delivery)
        : shippingFee !== undefined
          ? Number(shippingFee)
          : finalSubtotal > 999
            ? 0
            : 99;

    const finalTax = tax ? Number(tax) : 0;
    const finalDiscount = Number(discount) || 0;
    const totalAmount = Math.max(0, finalSubtotal + finalDelivery + finalTax - finalDiscount);

    const estDeliveryDate = new Date();
    estDeliveryDate.setDate(estDeliveryDate.getDate() + 5);

    const order = await Order.create({
      orderId: generateOrderId(),
      user: req.user._id,
      items: formattedItems,
      shippingAddress: {
        fullName,
        phone: phone || mobile || req.user.phone || "",
        email: email || req.user.email || "",
        address,
        city,
        state,
        postalCode: pincode || postalCode || "",
      },
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      paymentDetails: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
      subtotal: finalSubtotal,
      shippingFee: finalDelivery,
      discount: finalDiscount,
      tax: finalTax,
      totalAmount,
      status: "Confirmed",
      estimatedDelivery: estDeliveryDate,
      notes,
    });

    // Clear user cart in background
    try {
      const cart = await Cart.findOne({ user: req.user._id });
      if (cart) {
        cart.items = [];
        cart.calculateTotals();
        await cart.save();
      }
    } catch {
      // ignore cart clear error
    }

    sendSuccess(res, 201, "Payment verified and order placed successfully", {
      order: formatOrderResponse(order),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Standard Create Order (COD or direct)
 */
export const createOrderController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const {
      fullName,
      mobile,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      postalCode,
      items,
      payment = "cod",
      paymentMethod = "cod",
      subtotal,
      shippingFee,
      delivery,
      discount = 0,
      tax = 0,
      notes,
    } = req.body;

    if (!fullName || !address || !city || !state || !(pincode || postalCode)) {
      sendError(res, 400, "Validation error", "All shipping address fields are required");
      return;
    }

    const orderItems = Array.isArray(items) && items.length > 0 ? items : [];

    let calculatedSubtotal = 0;
    const formattedItems = orderItems.map((item: any) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity || item.qty) || 1;
      calculatedSubtotal += price * qty;
      return {
        product: item.productId || item.id,
        name: item.name || "Handloom Saree",
        price,
        quantity: qty,
        size: item.selectedSize || item.size || "Free",
        color: item.selectedColor || item.color || "Traditional",
        image: item.image || item.images?.[0] || "",
      };
    });

    const finalSubtotal = subtotal ? Number(subtotal) : calculatedSubtotal;
    const finalDelivery =
      delivery !== undefined
        ? Number(delivery)
        : shippingFee !== undefined
          ? Number(shippingFee)
          : finalSubtotal > 999
            ? 0
            : 99;

    const finalTax = tax ? Number(tax) : 0;
    const finalDiscount = Number(discount) || 0;
    const totalAmount = Math.max(0, finalSubtotal + finalDelivery + finalTax - finalDiscount);

    const estDeliveryDate = new Date();
    estDeliveryDate.setDate(estDeliveryDate.getDate() + 5);

    const selectedPaymentMethod = paymentMethod || payment || "cod";

    const order = await Order.create({
      orderId: generateOrderId(),
      user: req.user._id,
      items: formattedItems,
      shippingAddress: {
        fullName,
        phone: phone || mobile || req.user.phone || "",
        email: email || req.user.email || "",
        address,
        city,
        state,
        postalCode: pincode || postalCode || "",
      },
      paymentMethod: selectedPaymentMethod,
      paymentStatus: selectedPaymentMethod === "online" || selectedPaymentMethod === "razorpay" ? "paid" : "pending",
      subtotal: finalSubtotal,
      shippingFee: finalDelivery,
      discount: finalDiscount,
      tax: finalTax,
      totalAmount,
      status: "Order Placed",
      estimatedDelivery: estDeliveryDate,
      notes,
    });

    // Clear user cart in background
    try {
      const cart = await Cart.findOne({ user: req.user._id });
      if (cart) {
        cart.items = [];
        cart.calculateTotals();
        await cart.save();
      }
    } catch {
      // ignore cart clear error
    }

    sendSuccess(res, 201, "Order placed successfully", {
      order: formatOrderResponse(order),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel Order & Trigger Automated Razorpay Refund if paid
 */
export const cancelOrderController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const { id } = req.params;
    const { reason = "Customer requested cancellation" } = req.body;

    const order = await Order.findOne({
      $or: [{ orderId: id }, { _id: id?.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }],
      user: req.user._id,
    });

    if (!order) {
      sendError(res, 404, "Order not found");
      return;
    }

    if (order.status === "Cancelled") {
      sendError(res, 400, "Order is already cancelled");
      return;
    }

    if (order.status === "Delivered") {
      sendError(res, 400, "Delivered orders cannot be cancelled directly. Please initiate a return request.");
      return;
    }

    let refundData: any = null;

    // Check if order was paid online via Razorpay
    const isPaidOnline =
      order.paymentStatus === "paid" &&
      (order.paymentMethod === "razorpay" || order.paymentMethod === "online");

    const paymentId = order.paymentDetails?.razorpayPaymentId;

    if (isPaidOnline && paymentId) {
      try {
        const refundResponse = await initiateRazorpayRefund({
          paymentId,
          amountInRupees: order.totalAmount,
          notes: {
            orderId: order.orderId,
            reason,
          },
        });

        refundData = {
          refundId: refundResponse.id,
          refundStatus: refundResponse.status || "processed",
          refundAmount: order.totalAmount,
          refundedAt: new Date(),
        };

        order.paymentStatus = "refunded";
        order.paymentDetails = {
          ...order.paymentDetails,
          ...refundData,
        };
      } catch (refundError: any) {
        console.error("Razorpay refund error:", refundError);
        // If live API throws, still record pending refund so admin or webhook can reconcile
        order.paymentStatus = "refunded";
        order.paymentDetails = {
          ...order.paymentDetails,
          refundId: `rfnd_pending_${Date.now().toString().slice(-6)}`,
          refundStatus: "processing",
          refundAmount: order.totalAmount,
          refundedAt: new Date(),
        };
      }
    } else if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
    }

    order.status = "Cancelled";
    order.cancellationReason = reason;
    order.cancelledAt = new Date();

    await order.save();

    sendSuccess(
      res,
      200,
      isPaidOnline
        ? "Order cancelled successfully. Refund of ₹" +
        order.totalAmount +
        " has been initiated to your original payment method."
        : "Order cancelled successfully.",
      {
        order: formatOrderResponse(order),
        refund: refundData,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all customer orders
 */
export const getOrdersController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    const formattedOrders = orders.map((o) => formatOrderResponse(o));

    sendSuccess(res, 200, "Orders retrieved", formattedOrders);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order by ID
 */
export const getOrderByIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const { id } = req.params;

    const order = await Order.findOne({
      $or: [{ orderId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }],
      user: req.user._id,
    });

    if (!order) {
      sendError(res, 404, "Order not found");
      return;
    }

    sendSuccess(res, 200, "Order details", {
      order: formatOrderResponse(order),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get live tracking details for an order
 */
export const getOrderTrackingController = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = _req.params;
    const order = await Order.findOne({
      $or: [{ orderId: id }, { _id: id?.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }],
    });

    if (!order) {
      sendError(res, 404, "Order not found");
      return;
    }

    const isCancelled = order.status === "Cancelled";

    const standardSteps = [
      {
        status: "Order Placed",
        message: "Order placed and registered in Santipur weaver network",
        date: order.createdAt,
        completed: true,
      },
      {
        status: "Confirmed",
        message:
          order.paymentMethod === "razorpay"
            ? "Payment verified via Razorpay & order confirmed"
            : "Order confirmed by artisan team",
        date: order.createdAt,
        completed: order.status !== "Order Placed",
      },
      {
        status: "Processing",
        message: "Quality checked and wrapped in handloom muslin cover",
        date: new Date(new Date(order.createdAt).getTime() + 1000 * 60 * 60 * 12),
        completed: ["Processing", "Shipped", "Out for Delivery", "Delivered"].includes(
          order.status
        ),
      },
      {
        status: "Shipped",
        message: "Handed over to insured express courier",
        date: new Date(new Date(order.createdAt).getTime() + 1000 * 60 * 60 * 24),
        completed: ["Shipped", "Out for Delivery", "Delivered"].includes(order.status),
      },
      {
        status: "Out for Delivery",
        message: "Courier executive is out for doorstep delivery",
        date: new Date(new Date(order.createdAt).getTime() + 1000 * 60 * 60 * 48),
        completed: ["Out for Delivery", "Delivered"].includes(order.status),
      },
      {
        status: "Delivered",
        message: "Package safely delivered to customer",
        date: order.estimatedDelivery,
        completed: order.status === "Delivered",
      },
    ];

    const cancelledSteps = [
      {
        status: "Order Placed",
        message: "Order placed",
        date: order.createdAt,
        completed: true,
      },
      {
        status: "Cancelled",
        message: `Order was cancelled: ${order.cancellationReason || "Customer requested"}`,
        date: order.cancelledAt || order.updatedAt || new Date(),
        completed: true,
      },
    ];

    if (order.paymentStatus === "refunded") {
      cancelledSteps.push({
        status: "Refund Initiated",
        message: order.paymentDetails?.refundId
          ? `Refund of ₹${order.totalAmount} initiated (Ref: ${order.paymentDetails.refundId}). Expected in 3-5 business days.`
          : `Refund of ₹${order.totalAmount} initiated to original payment source.`,
        date: order.paymentDetails?.refundedAt || order.cancelledAt || new Date(),
        completed: true,
      });
    }

    sendSuccess(res, 200, "Order tracking details", {
      orderId: order.orderId,
      currentStatus: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentDetails: order.paymentDetails,
      estimatedDelivery: order.estimatedDelivery,
      cancellationReason: order.cancellationReason,
      cancelledAt: order.cancelledAt,
      isCancelled,
      steps: isCancelled ? cancelledSteps : standardSteps,
    });
  } catch (error) {
    next(error);
  }
};
