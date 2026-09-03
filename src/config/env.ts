import "dotenv/config";
import { z } from "zod";
console.log(process.env.CLIENT_URL)
const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    PORT: z.coerce.number().default(5000),

    MONGODB_URI: z.string().min(1),

    JWT_SECRET: z.string().min(32),

    JWT_EXPIRES_IN: z.string().default("7d"),

    CLIENT_URL: z.string().url(),

    RAZORPAY_KEY_ID: z.string().default("rzp_test_santipur_demo"),

    RAZORPAY_KEY_SECRET: z.string().default("santipur_secret_demo"),
});

export const env = envSchema.parse(process.env);
