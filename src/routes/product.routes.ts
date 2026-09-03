import { Router } from "express";
import {
  getProductsController,
  getProductByIdController,
  getFeaturedProductsController,
  getNewArrivalsController,
  getBestSellersController,
  getRelatedProductsController,
  getCategoriesController,
  searchProductsController,
  addToCartController,
  addToWishlistController,
  removeFromWishlistController,
  getWishlistController,
  createProductController,
  updateProductController,
  deleteProductController,
  updateStockController,
  bulkCreateProductsController,
  getAdminProductsController,
} from "../controllers/product.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Admin / Management routes (Admin access only)
router.get("/admin/list", authenticate, authorize("admin"), getAdminProductsController);
router.post("/bulk", authenticate, authorize("admin"), bulkCreateProductsController);
router.patch("/:id/stock", authenticate, authorize("admin"), updateStockController);
router.post("/", authenticate, authorize("admin"), createProductController);
router.put("/:id", authenticate, authorize("admin"), updateProductController);
router.delete("/:id", authenticate, authorize("admin"), deleteProductController);

// Public product routes
router.get("/", getProductsController);
router.get("/featured", getFeaturedProductsController);
router.get("/new-arrivals", getNewArrivalsController);
router.get("/best-sellers", getBestSellersController);
router.get("/categories", getCategoriesController);
router.get("/search", searchProductsController);
router.get("/:id/related", getRelatedProductsController);
router.get("/:id", getProductByIdController);

// User cart & wishlist routes
router.post("/cart/add", authenticate, addToCartController);
router.post("/wishlist/add", authenticate, addToWishlistController);
router.delete("/wishlist/:productId", authenticate, removeFromWishlistController);
router.get("/wishlist", authenticate, getWishlistController);

export default router;