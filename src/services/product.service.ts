import { Product, IProduct } from "../models/product.model.js";

interface ProductFilters {
  category?: string;
  subcategory?: string;
  fabric?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface PaginationOptions {
  page: number;
  limit: number;
}

export const createProduct = async (data: Partial<IProduct>): Promise<IProduct> => {
  const product = await Product.create(data);
  return product;
};

export const getProducts = async (
  filters: ProductFilters,
  pagination: PaginationOptions
): Promise<{ products: IProduct[]; total: number; page: number; totalPages: number }> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const query: any = { isActive: true };

  if (filters.category) query.category = filters.category;
  if (filters.subcategory) query.subcategory = filters.subcategory;
  if (filters.fabric) query.fabric = filters.fabric;
  if (filters.color) query.color = filters.color;
  if (filters.size) query.size = { $in: [filters.size] };
  if (filters.isFeatured !== undefined) query.isFeatured = filters.isFeatured;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {};
    if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
  const sort: any = { [sortBy]: sortOrder };

  if (filters.search) {
    sort.score = { $meta: "textScore" };
  }

  const [products, total] = await Promise.all([
    Product.find(query).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(query),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getProductById = async (id: string): Promise<IProduct | null> => {
  return Product.findById(id);
};

export const getProductBySku = async (sku: string): Promise<IProduct | null> => {
  return Product.findOne({ sku: sku.toUpperCase() });
};

export const updateProduct = async (
  id: string,
  data: Partial<IProduct>
): Promise<IProduct | null> => {
  return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  const result = await Product.findByIdAndDelete(id);
  return !!result;
};

export const getFeaturedProducts = async (limit = 8): Promise<IProduct[]> => {
  return Product.find({ isActive: true, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getProductsByCategory = async (
  category: string,
  limit = 10
): Promise<IProduct[]> => {
  return Product.find({ category, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getRelatedProducts = async (
  productId: string,
  category: string,
  limit = 4
): Promise<IProduct[]> => {
  return Product.find({
    _id: { $ne: productId },
    category,
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const updateStock = async (
  id: string,
  quantity: number
): Promise<IProduct | null> => {
  return Product.findByIdAndUpdate(
    id,
    { $inc: { stock: quantity } },
    { new: true, runValidators: true }
  );
};

export const decrementStock = async (
  id: string,
  quantity: number
): Promise<IProduct | null> => {
  return Product.findOneAndUpdate(
    { _id: id, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
};