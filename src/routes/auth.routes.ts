import { Router } from "express";
import {
  signupController,
  loginController,
  logoutController,
  getMeController,
  refreshTokenController,
  verifyOtpController,
  resendOtpController,
  googleSsoController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", signupController);
router.post("/verify-otp", verifyOtpController);
router.post("/resend-otp", resendOtpController);
router.post("/login", loginController);
router.post("/google", googleSsoController);
router.post("/logout", logoutController);
router.post("/refresh", refreshTokenController);
router.get("/me", authenticate, getMeController);

export default router;