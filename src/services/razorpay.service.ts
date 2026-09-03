import RazorpayPkg from "razorpay";
import crypto from "crypto";
import { env } from "../config/env.js";

const RazorpayClass: any = (RazorpayPkg as any).default || RazorpayPkg;

export const getRazorpayKeys = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || "";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET || "";
  return { key_id, key_secret };
};

export const getRazorpayInstance = (): any => {
  const { key_id, key_secret } = getRazorpayKeys();
  return new RazorpayClass({
    key_id,
    key_secret,
  });
};

export interface CreateRazorpayOrderOptions {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}

export const createRazorpayOrder = async ({
  amountInRupees,
  receipt,
  notes = {},
}: CreateRazorpayOrderOptions) => {
  const instance = getRazorpayInstance();
  const amountInPaise = Math.round(amountInRupees * 100);

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt,
    notes,
  };

  const razorpayOrder = await instance.orders.create(options);
  return razorpayOrder;
};

export const verifyRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const { key_secret } = getRazorpayKeys();

  // If running in development demo mock mode without live keys
  if (
    key_secret === "santipur_secret_demo" ||
    razorpayPaymentId.startsWith("pay_mock_") ||
    razorpayPaymentId.startsWith("pay_demo_")
  ) {
    return true;
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    return generatedSignature === razorpaySignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

export interface InitiateRefundOptions {
  paymentId: string;
  amountInRupees?: number;
  notes?: Record<string, string>;
}

export const initiateRazorpayRefund = async ({
  paymentId,
  amountInRupees,
  notes = {},
}: InitiateRefundOptions) => {
  const { key_secret } = getRazorpayKeys();

  // If running in dev/demo mode without real keys or with a mock payment
  if (
    key_secret === "santipur_secret_demo" ||
    paymentId.startsWith("pay_mock_") ||
    paymentId.startsWith("pay_demo_")
  ) {
    return {
      id: `rfnd_${Date.now().toString().slice(-8)}_${Math.floor(1000 + Math.random() * 9000)}`,
      payment_id: paymentId,
      amount: amountInRupees ? Math.round(amountInRupees * 100) : 0,
      currency: "INR",
      status: "processed",
      notes,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  const instance = getRazorpayInstance();
  const refundOptions: any = {
    notes,
  };

  if (amountInRupees && amountInRupees > 0) {
    refundOptions.amount = Math.round(amountInRupees * 100);
  }

  const refund = await instance.payments.refund(paymentId, refundOptions);
  return refund;
};

export const getRazorpayPublicKey = (): string => {
  return process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || "";
};
