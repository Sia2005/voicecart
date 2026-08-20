import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const itemSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    canonicalItem: { type: String, default: null },
    displayName: { type: String, required: true },
    quantity: { type: Number, default: null },
    unit: { type: String, default: null },
    category: { type: String, default: "pantry", index: true },
    checked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

itemSchema.index({ sessionId: 1, createdAt: -1 });

export type ItemDocument = InferSchemaType<typeof itemSchema>;

export const ItemModel: Model<ItemDocument> =
  (mongoose.models.Item as Model<ItemDocument>) ??
  mongoose.model<ItemDocument>("Item", itemSchema);