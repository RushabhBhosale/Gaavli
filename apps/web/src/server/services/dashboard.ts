import "server-only";
import { connectDb } from "../db/connect";
import { User, Listing } from "../models";
import { activeStockFilter } from "../repositories/listing-mutations";
import type { Stats, Growth } from "@/lib/contracts";
export function monthStart(offset = 0) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
  );
}
export async function dashboardStats(): Promise<Stats> {
  await connectDb();
  const current = monthStart(),
    previous = monthStart(-1),
    now = new Date();
  const userFilters = [{}, { roles: "seller" }, { roles: "buyer" }];
  const cards = await Promise.all(
    userFilters.map(async (filter, i) => {
      const [count, thisMonth, lastMonth] = await Promise.all([
        User.countDocuments(filter),
        User.countDocuments({ ...filter, createdAt: { $gte: current } }),
        User.countDocuments({
          ...filter,
          createdAt: { $gte: previous, $lt: current },
        }),
      ]);
      return {
        label: ["Total Users", "Farmers", "Buyers"][i],
        count,
        change: lastMonth
          ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
          : null,
      };
    }),
  );
  const effectiveStatus = {
    $cond: [
      {
        $and: [
          { $eq: ["$status", "active"] },
          { $eq: [{ $type: "$expiresAt" }, "date"] },
          { $lte: ["$expiresAt", now] },
        ],
      },
      "expired",
      "$status",
    ],
  };
  const groups = await Listing.aggregate<{ _id: string; count: number }>([
    { $group: { _id: effectiveStatus, count: { $sum: 1 } } },
  ]);
  const listings = [
    "active",
    "expired",
    "reported",
    "pending",
    "sold_out",
    "deactivated",
  ].map((status) => ({
    name: (status[0].toUpperCase() + status.slice(1)).replace("_", " "),
    value: groups.find((g) => g._id === status)?.count || 0,
  }));
  const [thisMonth, lastMonth] = await Promise.all([
    Listing.countDocuments({
      ...activeStockFilter(now),
      createdAt: { $gte: current },
    }),
    Listing.countDocuments({
      ...activeStockFilter(now),
      createdAt: { $gte: previous, $lt: current },
    }),
  ]);
  cards.push({
    label: "Active Listings",
    count: listings[0].value,
    change: lastMonth
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : null,
  });
  return { cards, listings };
}
export async function userGrowth(): Promise<Growth> {
  await connectDb();
  const groups = await User.aggregate<{
    _id: string;
    farmers: number;
    buyers: number;
  }>([
    { $match: { createdAt: { $gte: monthStart(-5) } } },
    {
      $group: {
        _id: { $dateToString: { date: "$createdAt", format: "%Y-%m" } },
        farmers: { $sum: { $cond: [{ $in: ["seller", "$roles"] }, 1, 0] } },
        buyers: { $sum: { $cond: [{ $in: ["buyer", "$roles"] }, 1, 0] } },
      },
    },
  ]);
  return Array.from({ length: 6 }, (_, i) => {
    const date = monthStart(i - 5),
      key = date.toISOString().slice(0, 7),
      row = groups.find((g) => g._id === key);
    return {
      month: date.toLocaleDateString("en-IN", {
        month: "short",
        timeZone: "UTC",
      }),
      Farmers: row?.farmers || 0,
      Buyers: row?.buyers || 0,
    };
  });
}
