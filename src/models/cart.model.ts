import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICartItem {
  _id: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  totalItems: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
  calculateTotals(): void;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    size: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
  },
  { _id: true }
);

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.methods.calculateTotals = function (this: mongoose.Document & ICart) {
  this.totalItems = this.items.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce(
    (sum: number, item: ICartItem) => sum + item.price * item.quantity,
    0
  );
};

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);