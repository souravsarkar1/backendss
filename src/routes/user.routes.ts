import { Router } from "express";
import {
  getProfileController,
  updateProfileController,
  getAddressesController,
  addAddressController,
  updateAddressController,
  deleteAddressController,
  changePasswordController,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/profile", authenticate, getProfileController);
router.put("/profile", authenticate, updateProfileController);

router.get("/addresses", authenticate, getAddressesController);
router.post("/addresses", authenticate, addAddressController);
router.put("/addresses/:id", authenticate, updateAddressController);
router.delete("/addresses/:id", authenticate, deleteAddressController);

router.post("/change-password", authenticate, changePasswordController);

export default router;
