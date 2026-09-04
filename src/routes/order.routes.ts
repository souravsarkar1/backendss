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
  getAdminOrdersController,
  getAdminOrderByIdController,
  updateAdminOrderStatusController,
  getAdminOrderStatsController,
} from "../controllers/order.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Admin Order Management routes (Admin only)
router.get("/admin/list", authenticate, authorize("admin"), getAdminOrdersController);
router.get("/admin/stats", authenticate, authorize("admin"), getAdminOrderStatsController);
router.get("/admin/:id", authenticate, authorize("admin"), getAdminOrderByIdController);
router.patch("/admin/:id/status", authenticate, authorize("admin"), updateAdminOrderStatusController);

// Razorpay specific routes
router.get("/razorpay/key", authenticate, getRazorpayKeyController);
router.post("/razorpay/create-order", authenticate, createRazorpayOrderController);
router.post("/razorpay/verify", authenticate, verifyRazorpayPaymentController);

// Standard Customer Order routes
router.post("/", authenticate, createOrderController);
router.get("/", authenticate, getOrdersController);
router.get("/:id", authenticate, getOrderByIdController);
router.post("/:id/cancel", authenticate, cancelOrderController);
router.get("/:id/tracking", authenticate, getOrderTrackingController);

export default router;
