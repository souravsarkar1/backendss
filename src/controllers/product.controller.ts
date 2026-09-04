import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { Cart } from "../models/cart.model.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { sendSuccess, sendError } from "../utils/response.js";

interface ProductQuery {
  page?: string;
  limit?: string;
  search?: string | undefined;
  category?: string | undefined;
  subcategory?: string | undefined;
  fabric?: string | undefined;
  color?: string | undefined;
  minPrice?: string | undefined;
  maxPrice?: string | undefined;
  sort?: string | undefined;
  isFeatured?: string | undefined;
}

const isValidQueryValue = (val?: string): val is string => {
  return (
    typeof val === "string" &&
    val.trim().length > 0 &&
    val !== "undefined" &&
    val !== "null" &&
    val !== "all"
  );
};

const buildSort = (sort?: string): Record<string, 1 | -1> | { score: { $meta: "textScore" } } => {
  console.log(sort, "line 33")
  switch (sort) {
    case "price_asc":
    case "price_low_high":
    case "price_low":
      return { price: 1 };
    case "price_desc":
    case "price_high_low":
    case "price_high":
      return { price: -1 };
    case "newest":
      return { createdAt: -1 };
    case "popular":
    case "best_selling":
      return { rating: -1, reviewCount: -1 };
    default:
      return { createdAt: -1 };
  }
};

export const getProductsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("hited")
  try {
    const {
      page = "1",
      limit = "12",
      search,
      category,
      subcategory,
      fabric,
      color,
      minPrice,
      maxPrice,
      sort,
      isFeatured,
    } = req.query as ProductQuery;
    console.log(sort, "line 70")
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = { isActive: true };

    if (isValidQueryValue(search)) {
      filter.$text = { $search: search.trim() };
    }

    if (isValidQueryValue(category)) {
      const cat = category.trim().toLowerCase();
      const base = cat.endsWith("s") && cat.length > 2 ? cat.slice(0, -1) : cat;
      const cleanPattern = base.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&").replace(/\\-/g, "[- ]?");
      filter.category = { $regex: new RegExp(`^${cleanPattern}s?$`, "i") };
    }

    if (isValidQueryValue(subcategory)) {
      filter.subcategory = { $regex: new RegExp(`^${subcategory.trim()}$`, "i") };
    }

    if (isValidQueryValue(fabric)) {
      filter.fabric = { $regex: new RegExp(fabric.trim(), "i") };
    }

    if (isValidQueryValue(color)) {
      filter.color = { $regex: new RegExp(color.trim(), "i") };
    }

    if (isValidQueryValue(minPrice) || isValidQueryValue(maxPrice)) {
      filter.price = {};
      if (isValidQueryValue(minPrice) && !isNaN(Number(minPrice))) {
        filter.price.$gte = Number(minPrice);
      }
      if (isValidQueryValue(maxPrice) && !isNaN(Number(maxPrice))) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    if (isFeatured === "true") {
      filter.isFeatured = true;
    }

    const sortOption = buildSort(sort);
    console.log(sortOption, "line 115")
    let products: any[] = [];
    let total = 0;

    try {
      [products, total] = await Promise.all([
        Product.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
        Product.countDocuments(filter),
      ]);
    } catch (queryErr) {
      console.error("Query failed, falling back to all active products:", queryErr);
      products = await Product.find({ isActive: true }).sort(sortOption).skip(skip).limit(limitNum).lean();
      total = products.length;
    }

    const totalPages = Math.ceil(total / limitNum) || 1;
    sendSuccess(res, 200, "Products retrieved successfully", {
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined" || id === "null") {
      sendError(res, 400, "Invalid ID", "Product ID is required");
      return;
    }

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id as any)) {
      product = await Product.findOne({ _id: id, isActive: true }).lean();
    }

    if (!product) {
      product = await Product.findOne({ sku: (id as any).toUpperCase(), isActive: true }).lean();
    }

    if (!product) {
      sendError(res, 404, "Product not found");
      return;
    }

    sendSuccess(res, 200, "Product retrieved successfully", { product });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProductsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    const products = await Product.find({ isActive: true, isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    sendSuccess(res, 200, "Featured products retrieved successfully", {
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getNewArrivalsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    sendSuccess(res, 200, "New arrivals retrieved successfully", {
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getBestSellersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));

    const products = await Product.find({ isActive: true })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit)
      .lean();

    sendSuccess(res, 200, "Best sellers retrieved successfully", {
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedProductsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 4));

    let currentProduct = null;
    if (mongoose.Types.ObjectId.isValid(id as any)) {
      currentProduct = await Product.findById(id).lean();
    } else {
      currentProduct = await Product.findOne({ sku: (id as any).toUpperCase() }).lean();
    }

    const query: Record<string, any> = { isActive: true };
    if (currentProduct) {
      query.category = currentProduct.category;
      query._id = { $ne: currentProduct._id };
    }

    const products = await Product.find(query)
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    sendSuccess(res, 200, "Related products retrieved successfully", {
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoriesController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          subcategories: { $addToSet: "$subcategory" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    sendSuccess(res, 200, "Categories retrieved successfully", { categories });
  } catch (error) {
    next(error);
  }
};

export const searchProductsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, limit = "10" } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      sendSuccess(res, 200, "Search query too short", { products: [] });
      return;
    }

    const limitNum = Math.min(20, Math.max(1, Number(limit) || 10));

    const products = await Product.find(
      {
        isActive: true,
        $text: { $search: q.trim() },
      },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limitNum)
      .lean();

    sendSuccess(res, 200, "Search results", { products });
  } catch (error) {
    next(error);
  }
};

export const addToCartController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const { productId, quantity = 1, size, color } = req.body;

    if (!productId) {
      sendError(res, 400, "Validation error", "Product ID is required");
      return;
    }

    const productQuery = mongoose.Types.ObjectId.isValid(productId)
      ? { _id: productId, isActive: true, stock: { $gt: 0 } }
      : { sku: String(productId).toUpperCase(), isActive: true, stock: { $gt: 0 } };

    const product = await Product.findOne(productQuery);

    if (!product) {
      sendError(res, 404, "Product not found or out of stock");
      return;
    }

    if (product.stock < quantity) {
      sendError(res, 400, "Insufficient stock", `Only ${product.stock} items available`);
      return;
    }

    if (size && product.size && product.size.length > 0 && !product.size.includes(size)) {
      sendError(res, 400, "Invalid size", "Selected size not available for this product");
      return;
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === product._id.toString() &&
        item.size === size &&
        item.color === color
    );

    if (existingItemIndex >= 0) {
      const existingItem = cart.items[existingItemIndex];
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          sendError(res, 400, "Insufficient stock", `Only ${product.stock} items available`);
          return;
        }
        existingItem.quantity = newQuantity;
      }
    } else {
      cart.items.push({
        product: product._id,
        quantity,
        size,
        color,
        price: product.price,
      } as any);
    }

    cart.calculateTotals();
    await cart.save();
    await cart.populate("items.product");

    sendSuccess(res, 200, "Product added to cart", { cart });
  } catch (error) {
    next(error);
  }
};

export const addToWishlistController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const { productId } = req.body;

    if (!productId) {
      sendError(res, 400, "Validation error", "Product ID is required");
      return;
    }

    const productQuery = mongoose.Types.ObjectId.isValid(productId)
      ? { _id: productId, isActive: true }
      : { sku: String(productId).toUpperCase(), isActive: true };

    const product = await Product.findOne(productQuery);

    if (!product) {
      sendError(res, 404, "Product not found");
      return;
    }

    const user = await req.user.populate("wishlist");
    const isInWishlist = user.wishlist.some(
      (p: any) => p._id.toString() === product._id.toString()
    );

    if (isInWishlist) {
      sendError(res, 400, "Already in wishlist");
      return;
    }

    user.wishlist.push(product._id);
    await user.save();

    sendSuccess(res, 200, "Added to wishlist");
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlistController = async (
  req: AuthRequest<{ productId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const { productId } = req.params;

    req.user.wishlist = req.user.wishlist.filter(
      (id: any) => id.toString() !== productId
    );
    await req.user.save();

    sendSuccess(res, 200, "Removed from wishlist");
  } catch (error) {
    next(error);
  }
};

export const getWishlistController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, "Authentication required");
      return;
    }

    const user = await req.user.populate({
      path: "wishlist",
      match: { isActive: true },
    });

    sendSuccess(res, 200, "Wishlist retrieved", { products: user.wishlist });
  } catch (error) {
    next(error);
  }
};

export const createProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      images,
      category,
      subcategory,
      fabric,
      color,
      size,
      stock = 0,
      sku,
      tags,
      isActive = true,
      isFeatured = false,
    } = req.body;

    if (!name || !description || price === undefined || !category) {
      sendError(res, 400, "Validation error", "Name, description, price, and category are required");
      return;
    }

    const generatedSku =
      sku?.trim() ||
      `${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    // Parse images
    const imageList = Array.isArray(images)
      ? images
      : typeof images === "string" && images.trim()
        ? images.split(",").map((s) => s.trim())
        : ["https://images.unsplash.com/photo-1610079716999-02d2e5f1c0a6?w=800&q=80"];

    // Parse sizes
    const sizeList = Array.isArray(size)
      ? size
      : typeof size === "string" && size.trim()
        ? size.split(",").map((s) => s.trim())
        : ["Free"];

    // Parse tags
    const tagList = Array.isArray(tags)
      ? tags
      : typeof tags === "string" && tags.trim()
        ? tags.split(",").map((s) => s.trim())
        : [];

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      images: imageList,
      category: category.trim().toLowerCase(),
      subcategory: subcategory?.trim()?.toLowerCase() || undefined,
      fabric: fabric?.trim() || undefined,
      color: color?.trim() || undefined,
      size: sizeList,
      stock: Number(stock) || 0,
      sku: generatedSku.toUpperCase(),
      tags: tagList,
      isActive: isActive !== false,
      isFeatured: !!isFeatured,
    });

    sendSuccess(res, 201, "Product created successfully", { product });
  } catch (error) {
    next(error);
  }
};

export const updateProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.originalPrice !== undefined) {
      updateData.originalPrice = updateData.originalPrice ? Number(updateData.originalPrice) : null;
    }
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);

    if (typeof updateData.images === "string") {
      updateData.images = updateData.images.split(",").map((s: string) => s.trim());
    }
    if (typeof updateData.size === "string") {
      updateData.size = updateData.size.split(",").map((s: string) => s.trim());
    }
    if (typeof updateData.tags === "string") {
      updateData.tags = updateData.tags.split(",").map((s: string) => s.trim());
    }
    if (updateData.category) {
      updateData.category = updateData.category.trim().toLowerCase();
    }
    if (updateData.subcategory) {
      updateData.subcategory = updateData.subcategory.trim().toLowerCase();
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      sendError(res, 404, "Product not found");
      return;
    }

    sendSuccess(res, 200, "Product updated successfully", { product });
  } catch (error) {
    next(error);
  }
};

export const deleteProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      sendError(res, 404, "Product not found");
      return;
    }

    sendSuccess(res, 200, "Product deleted successfully", { id });
  } catch (error) {
    next(error);
  }
};

export const updateStockController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (typeof stock !== "number" || stock < 0) {
      sendError(res, 400, "Validation error", "Stock must be a positive integer");
      return;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { stock: Math.max(0, stock) },
      { new: true }
    );

    if (!product) {
      sendError(res, 404, "Product not found");
      return;
    }

    sendSuccess(res, 200, "Stock updated", { id: product._id, stock: product.stock });
  } catch (error) {
    next(error);
  }
};

export const bulkCreateProductsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      sendError(res, 400, "Validation error", "Array of products is required");
      return;
    }

    const preparedProducts = products.map((p, idx) => {
      const category = (p.category || "saree").toString().trim().toLowerCase();
      const sku =
        p.sku?.toString().trim() ||
        `${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}${idx}`;

      const images = Array.isArray(p.images)
        ? p.images
        : typeof p.images === "string" && p.images.trim()
          ? p.images.split(";").map((s: string) => s.trim())
          : ["https://images.unsplash.com/photo-1610079716999-02d2e5f1c0a6?w=800&q=80"];

      const size = Array.isArray(p.size)
        ? p.size
        : typeof p.size === "string" && p.size.trim()
          ? p.size.split(";").map((s: string) => s.trim())
          : ["Free"];

      const tags = Array.isArray(p.tags)
        ? p.tags
        : typeof p.tags === "string" && p.tags.trim()
          ? p.tags.split(";").map((s: string) => s.trim())
          : [];

      return {
        name: (p.name || `Handloom ${category}`).toString().trim(),
        description: (p.description || p.name || "Authentic Santipur handloom weave").toString().trim(),
        price: Number(p.price) || 999,
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        images,
        category,
        subcategory: p.subcategory?.toString().trim().toLowerCase() || undefined,
        fabric: p.fabric?.toString().trim() || "Cotton",
        color: p.color?.toString().trim() || "Traditional",
        size,
        stock: Number(p.stock) >= 0 ? Number(p.stock) : 20,
        sku: sku.toUpperCase(),
        tags,
        isActive: p.isActive !== false && p.isActive !== "false",
        isFeatured: p.isFeatured === true || p.isFeatured === "true",
      };
    });

    const inserted = await Product.insertMany(preparedProducts, { ordered: false });

    sendSuccess(res, 201, `Successfully imported ${inserted.length} products`, {
      count: inserted.length,
      products: inserted,
    });
  } catch (error: any) {
    if (error.insertedDocs && error.insertedDocs.length > 0) {
      sendSuccess(res, 201, `Partially imported ${error.insertedDocs.length} products`, {
        count: error.insertedDocs.length,
        products: error.insertedDocs,
      });
      return;
    }
    next(error);
  }
};

export const getAdminProductsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, category, stockStatus, page = "1", limit = "50" } = req.query as any;

    const filter: Record<string, any> = {};

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { sku: { $regex: search.trim(), $options: "i" } },
        { fabric: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (category && category.trim() && category !== "all") {
      filter.category = category.trim().toLowerCase();
    }

    if (stockStatus === "out_of_stock") {
      filter.stock = { $lte: 0 };
    } else if (stockStatus === "low_stock") {
      filter.stock = { $gt: 0, $lte: 10 };
    } else if (stockStatus === "in_stock") {
      filter.stock = { $gt: 10 };
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [products, totalCount, allProducts] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
      Product.find({}, "stock price isActive"),
    ]);

    const totalStockUnits = allProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
    const outOfStockCount = allProducts.filter((p) => p.stock <= 0).length;
    const lowStockCount = allProducts.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const activeCount = allProducts.filter((p) => p.isActive).length;

    sendSuccess(res, 200, "Admin products retrieved", {
      products,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
      stats: {
        totalProducts: allProducts.length,
        activeProducts: activeCount,
        totalStockUnits,
        totalInventoryValue,
        outOfStockCount,
        lowStockCount,
      },
    });
  } catch (error) {
    next(error);
  }
};