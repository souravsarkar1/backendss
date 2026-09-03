import { Router } from "express";
import {
  getCategoriesController,
  getProductsController,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", getCategoriesController);
router.get("/:slug", (req, res, next) => {
  req.query.category = req.params.slug;
  return getProductsController(req, res, next);
});
router.get("/:slug/products", (req, res, next) => {
  req.query.category = req.params.slug;
  return getProductsController(req, res, next);
});

export default router;
