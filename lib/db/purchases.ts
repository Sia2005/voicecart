import { PurchaseModel } from "./models/Purchase";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MAX_INTERVALS = 10;

export async function recordPurchase(
  sessionId: string,
  canonicalItem: string,
  category: string
): Promise<void> {
  const existing = await PurchaseModel.findOne({ sessionId, canonicalItem });

  if (!existing) {
    await PurchaseModel.create({ sessionId, canonicalItem, category });
    return;
  }

  const daysSince = Math.round(
    (Date.now() - new Date(existing.lastPurchasedAt).getTime()) / MS_PER_DAY
  );

  const intervals = daysSince > 0
    ? [...existing.intervals, daysSince].slice(-MAX_INTERVALS)
    : existing.intervals;

  await PurchaseModel.updateOne(
    { sessionId, canonicalItem },
    {
      $set: { lastPurchasedAt: new Date(), intervals, category },
      $inc: { count: 1 },
    }
  );
}