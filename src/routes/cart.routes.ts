import { Router } from "express";
import {
  getCartController,
  updateCartItemController,
  removeCartItemController,
  clearCartController,
  getCartCountController,
} from "../controllers/cart.controller.js";
import { addToCartController } from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, getCartController);
router.post("/", authenticate, addToCartController);
router.post("/add", authenticate, addToCartController);
router.delete("/", authenticate, clearCartController);
router.get("/count", authenticate, getCartCountController);

router.put("/item/:itemId", authenticate, updateCartItemController);
router.delete("/item/:itemId", authenticate, removeCartItemController);
router.delete("/clear", authenticate, clearCartController);

// Also support direct /:itemId paths used by cartService
router.put("/:itemId", authenticate, updateCartItemController);
router.delete("/:itemId", authenticate, removeCartItemController);

export default router;