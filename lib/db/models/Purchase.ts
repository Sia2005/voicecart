import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const purchaseSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    canonicalItem: { type: String, required: true },
    category: { type: String, default: "pantry" },
    count: { type: Number, default: 1 },
    lastPurchasedAt: { type: Date, default: Date.now },
    intervals: { type: [Number], default: [] },
  },
  { timestamps: true }
);

purchaseSchema.index({ sessionId: 1, canonicalItem: 1 }, { unique: true });

export type PurchaseDocument = InferSchemaType<typeof purchaseSchema>;

export const PurchaseModel: Model<PurchaseDocument> =
  (mongoose.models.Purchase as Model<PurchaseDocument>) ??
  mongoose.model<PurchaseDocument>("Purchase", purchaseSchema);