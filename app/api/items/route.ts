import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { ItemModel } from "@/lib/db/models/Item";
import { recordPurchase } from "@/lib/db/purchases";
import { getSessionId } from "@/lib/db/session";

const createSchema = z.object({
  canonicalItem: z.string().nullable(),
  displayName: z.string().min(1).max(80),
  quantity: z.number().positive().max(999).nullable(),
  unit: z.string().max(20).nullable(),
  category: z.string().max(30).default("pantry"),
});

export async function GET(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 401 });
  }

  try {
    await connectDB();
    const items = await ItemModel.find({ sessionId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to load list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid item payload" }, { status: 400 });
  }

  try {
    await connectDB();

    const existing = parsed.data.canonicalItem
      ? await ItemModel.findOne({
          sessionId,
          canonicalItem: parsed.data.canonicalItem,
          checked: false,
        })
      : null;

    if (existing) {
      existing.quantity = (existing.quantity ?? 1) + (parsed.data.quantity ?? 1);
      await existing.save();
      return NextResponse.json({ item: existing, merged: true }, { status: 200 });
    }

    const item = await ItemModel.create({ sessionId, ...parsed.data });

    if (parsed.data.canonicalItem) {
      await recordPurchase(sessionId, parsed.data.canonicalItem, parsed.data.category);
    }

    return NextResponse.json({ item, merged: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 401 });
  }

  try {
    await connectDB();
    const result = await ItemModel.deleteMany({ sessionId });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch {
    return NextResponse.json({ error: "Failed to clear list" }, { status: 500 });
  }
}