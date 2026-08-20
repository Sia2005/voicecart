import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { ItemModel } from "@/lib/db/models/Item";
import { getSessionId } from "@/lib/db/session";

const updateSchema = z.object({
  quantity: z.number().positive().max(999).nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  checked: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  }

  try {
    await connectDB();
    const item = await ItemModel.findOneAndUpdate(
      { _id: id, sessionId },
      { $set: parsed.data },
      { new: true }
    ).lean();

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  try {
    await connectDB();
    const result = await ItemModel.findOneAndDelete({ _id: id, sessionId });

    if (!result) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: id });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}