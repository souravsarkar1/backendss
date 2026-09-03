import bcrypt from "bcrypt";
import mongoose, { Document, Model, Schema } from "mongoose";

export type UserRole = "customer" | "admin" | "staff";

export type UserStatus = "active" | "inactive" | "blocked";

export interface IUserAddress {
    _id?: mongoose.Types.ObjectId;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
}

export interface IUser extends Document {
    comparePassword(password: string): Promise<boolean>;
    name: string;
    email: string;
    phone?: string;
    password: string;

    role: UserRole;
    status: UserStatus;

    avatar?: string;

    addresses: IUserAddress[];

    wishlist: mongoose.Types.ObjectId[];

    isEmailVerified: boolean;
    isPhoneVerified: boolean;

    otp?: string;
    otpExpires?: Date;

    lastLoginAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const addressSchema = new Schema<IUserAddress>(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        addressLine1: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        addressLine2: {
            type: String,
            trim: true,
            maxlength: 200
        },

        landmark: {
            type: String,
            trim: true,
            maxlength: 100
        },

        city: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        state: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        postalCode: {
            type: String,
            required: true,
            trim: true
        },

        country: {
            type: String,
            required: true,
            trim: true,
            default: "India"
        },

        isDefault: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: true
    }
);

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        phone: {
            type: String,
            trim: true,
            unique: true,
            sparse: true
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false
        },

        role: {
            type: String,
            enum: ["customer", "admin", "staff"],
            default: "customer",
            index: true
        },

        status: {
            type: String,
            enum: ["active", "inactive", "blocked"],
            default: "active",
            index: true
        },

        avatar: {
            type: String,
            trim: true
        },

        addresses: {
            type: [addressSchema],
            default: []
        },

        wishlist: [
            {
                type: Schema.Types.ObjectId,
                ref: "Product"
            }
        ],

        isEmailVerified: {
            type: Boolean,
            default: false
        },

        isPhoneVerified: {
            type: Boolean,
            default: false
        },

        otp: {
            type: String,
        },

        otpExpires: {
            type: Date,
        },

        lastLoginAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    if (!this.password) return false;
    try {
        const isMatch = await bcrypt.compare(password, this.password);
        if (isMatch) return true;
    } catch {
        // Fallback in case password was stored in plain text
    }
    return this.password === password;
};

if (mongoose.models && mongoose.models.User) {
    delete mongoose.models.User;
}

export const User: Model<IUser> = mongoose.model<IUser>(
    "User",
    userSchema
);