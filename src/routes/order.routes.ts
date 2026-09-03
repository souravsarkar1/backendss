import { Router } from "express";
import {
  createOrderController,
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
  cancelOrderController,
  getOrdersController,
  getOrderByIdController,
  getOrderTrackingController,
  getRazorpayKeyController,
} from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Razorpay specific routes
router.get("/razorpay/key", authenticate, getRazorpayKeyController);
router.post("/razorpay/create-order", authenticate, createRazorpayOrderController);
router.post("/razorpay/verify", authenticate, verifyRazorpayPaymentController);

// Standard Order management routes
router.post("/", authenticate, createOrderController);
router.get("/", authenticate, getOrdersController);
router.get("/:id", authenticate, getOrderByIdController);
router.post("/:id/cancel", authenticate, cancelOrderController);
router.get("/:id/tracking", authenticate, getOrderTrackingController);

export default router;
