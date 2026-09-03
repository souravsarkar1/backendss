import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  images: string[];
  category: string;
  subcategory?: string;
  fabric?: string;
  color?: string;
  size: string[];
  stock: number;
  sku: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      default: null,
      min: [0, "Original price cannot be negative"],
    },
    images: {
      type: [String],
      required: [true, "At least one product image is required"],
      default: [],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    fabric: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    size: {
      type: [String],
      default: ["Free"],
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({
  name: "text",
  description: "text",
  fabric: "text",
  color: "text",
  tags: "text",
});
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Ensure old model is completely removed from Mongoose cache
if (mongoose.models && mongoose.models.Product) {
  delete mongoose.models.Product;
}

export const Product: Model<IProduct> =
  mongoose.model<IProduct>("Product", productSchema);