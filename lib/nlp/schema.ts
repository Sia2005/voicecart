import { z } from "zod";

export const parsedCommandSchema = z.object({
  intent: z.enum([
    "ADD",
    "REMOVE",
    "UPDATE_QTY",
    "CHECK_OFF",
    "SEARCH",
    "CLEAR",
    "UNDO",
    "UNKNOWN",
  ]),
  item: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  maxPrice: z.number().nullable(),
  minPrice: z.number().nullable(),
  brand: z.string().nullable(),
  organic: z.boolean().nullable(),
});

export type LlmParsedCommand = z.infer<typeof parsedCommandSchema>;

export const geminiResponseSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["ADD", "REMOVE", "UPDATE_QTY", "CHECK_OFF", "SEARCH", "CLEAR", "UNDO", "UNKNOWN"],
    },
    item: { type: "string", nullable: true },
    quantity: { type: "number", nullable: true },
    unit: { type: "string", nullable: true },
    maxPrice: { type: "number", nullable: true },
    minPrice: { type: "number", nullable: true },
    brand: { type: "string", nullable: true },
    organic: { type: "boolean", nullable: true },
  },
  required: ["intent", "item", "quantity", "unit", "maxPrice", "minPrice", "brand", "organic"],
};