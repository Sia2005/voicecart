import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { ItemModel } from "@/lib/db/models/Item";
import { PurchaseModel } from "@/lib/db/models/Purchase";
import { getSessionId } from "@/lib/db/session";
import { replenishmentSuggestions, seasonalSuggestions } from "@/lib/suggestions/engine";

export async function GET(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 401 });
  }

  try {
    await connectDB();

    const [items, purchases] = await Promise.all([
      ItemModel.find({ sessionId, checked: false }).select("canonicalItem").lean(),
      PurchaseModel.find({ sessionId }).lean(),
    ]);

    const onList = new Set(
      items.map((item) => item.canonicalItem).filter((value): value is string => Boolean(value))
    );

    const suggestions = [
      ...replenishmentSuggestions(purchases as never, onList),
      ...seasonalSuggestions(onList, new Date().getMonth() + 1),
    ];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("GET /api/suggestions failed", error);
    return NextResponse.json({ suggestions: [] });
  }
}