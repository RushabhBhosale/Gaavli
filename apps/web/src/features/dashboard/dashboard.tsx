"use client";
import { useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Sprout,
  UserRound,
  ClipboardList,
  House,
  ChartNoAxesCombined,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Stats, Growth, AdminDto } from "@/lib/contracts";
import { ErrorState, Skeleton } from "@/components/shared/states";

// Each KPI keeps a stable icon and tint so the same metric is recognisable
// across visits. Order follows the stats service: users, farmers, buyers,
// active listings.
const cardStyles = [
  {
    icon: Users,
    tile: "bg-emerald-50 text-emerald-700",
    accent: "bg-emerald-500",
  },
  {
    icon: Sprout,
    tile: "bg-emerald-50 text-emerald-700",
    accent: "bg-emerald-500",
  },
  { icon: UserRound, tile: "bg-sky-50 text-sky-700", accent: "bg-sky-500" },
  {
    icon: ClipboardList,
    tile: "bg-amber-50 text-amber-700",
    accent: "bg-amber-500",
  },
] as const;

// Listing statuses carry the same meaning as the shared Badge tones: green is
// active, amber needs attention, red is a problem, slate is inactive.
const listingColors: Record<string, string> = {
  Active: "#12a344",
  Expired: "#94a3b8",
  Reported: "#ef4444",
  Pending: "#f59e0b",
  "Sold out": "#3b82f6",
  Deactivated: "#a78bfa",
};
const fallbackColors = [
  "#12a344",
  "#94a3b8",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#a78bfa",
];

const tooltipStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid #e5eceb",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
  padding: "6px 10px",
};
const tooltipLabelStyle: CSSProperties = {
  color: "#334155",
  fontWeight: 600,
};

const quickActions = [
  {
    label: "Manage Users",
    href: "/users",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
    hint: "Buyers, sellers and coordinators",
  },
  {
    label: "Review Listings",
    href: "/listings",
    icon: ClipboardList,
    color: "bg-amber-50 text-amber-600",
    hint: "Marketplace listings and status",
  },
  {
    label: "Manage Villages",
    href: "/villages",
    icon: House,
    color: "bg-emerald-50 text-emerald-600",
    hint: "Villages, coordinators and mappings",
  },
  {
    label: "View Reports",
    href: "/reports",
    icon: ChartNoAxesCombined,
    color: "bg-violet-50 text-violet-600",
    hint: "Escalated reports for review",
  },
];

const subscribe = () => () => {};

export function Dashboard({ admin }: { admin: AdminDto }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const stats = useQuery({
      queryKey: ["stats"],
      queryFn: () => api<Stats>("/dashboard/stats"),
    }),
    growth = useQuery({
      queryKey: ["growth"],
      queryFn: () => api<Growth>("/dashboard/user-growth"),
    });
  const now = new Date(),
    hour = now.getHours();
  const total =
    stats.data?.listings.reduce((sum, item) => sum + item.value, 0) || 0;
  const listingRows = stats.data?.listings ?? [];
  const donutData = total ? listingRows : [{ name: "No listings", value: 1 }];
  const donutColors = total
    ? donutData.map(
        (item, i) => listingColors[item.name] ?? fallbackColors[i % 6],
      )
    : ["#e8eeeb"];
  const share = (value: number) =>
    total ? Math.round((value / total) * 100) : 0;
  const growthRows = growth.data ?? [];
  const farmersSixMonths = growthRows.reduce(
    (sum, row) => sum + row.Farmers,
    0,
  );
  const buyersSixMonths = growthRows.reduce((sum, row) => sum + row.Buyers, 0);
  const peak = growthRows.reduce<Growth[number] | null>((best, row) => {
    if (!best) return row;
    return row.Farmers + row.Buyers > best.Farmers + best.Buyers ? row : best;
  }, null);
  const peakCount = peak ? peak.Farmers + peak.Buyers : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold tracking-tight text-emerald-800">
          {hydrated
            ? `Good ${hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"}, ${admin.name}!`
            : `Welcome, ${admin.name}!`}
        </p>
        {hydrated && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
            <CalendarDays size={14} className="text-slate-400" aria-hidden />
            {now.toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>
      {stats.error && (
        <ErrorState error={stats.error} retry={() => void stats.refetch()} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isPending
          ? cardStyles.map((_, i) => <Skeleton key={i} className="h-32" />)
          : stats.data?.cards.map((card, i) => {
              const style = cardStyles[i] ?? cardStyles[0];
              const Icon = style.icon;
              return (
                <section
                  key={card.label}
                  className="card relative overflow-hidden p-5"
                  aria-label={card.label}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-0.5 ${style.accent}`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${style.tile}`}
                      >
                        <Icon size={20} />
                      </span>
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {card.label}
                      </p>
                    </div>
                    {card.change !== null && (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          card.change < 0
                            ? "border-red-600/20 bg-red-50 text-red-700"
                            : "border-emerald-600/20 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {card.change < 0 ? (
                          <ArrowDownRight size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}
                        {card.change >= 0 ? "+" : ""}
                        {card.change.toLocaleString("en-IN")}%
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                    {card.count.toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {card.change === null
                      ? "No previous month baseline"
                      : "vs last month"}
                  </p>
                </section>
              );
            })}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5" aria-labelledby="growth-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="growth-title"
                className="text-sm font-bold text-slate-900"
              >
                User Growth
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                New accounts, last six months
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                Farmers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" />
                Buyers
              </span>
            </div>
          </div>
          {growth.error ? (
            <ErrorState
              error={growth.error}
              retry={() => void growth.refetch()}
            />
          ) : growth.isPending ? (
            <Skeleton className="mt-5 h-64" />
          ) : (
            <>
              <div
                className="mt-4 h-64"
                role="img"
                aria-label="New farmers and buyers during the last six months"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={growth.data}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="dashboardFarmers"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#12a344"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#12a344"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="dashboardBuyers"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eef3f1" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      dy={6}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Farmers"
                      stroke="#12a344"
                      fill="url(#dashboardFarmers)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Buyers"
                      stroke="#f59e0b"
                      fill="url(#dashboardBuyers)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    New farmers
                  </dt>
                  <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {farmersSixMonths.toLocaleString("en-IN")}
                  </dd>
                  <dd className="text-[11px] text-slate-400">in 6 months</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    New buyers
                  </dt>
                  <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {buyersSixMonths.toLocaleString("en-IN")}
                  </dd>
                  <dd className="text-[11px] text-slate-400">in 6 months</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Peak month
                  </dt>
                  <dd className="mt-1 text-lg font-bold text-slate-900">
                    {peak && peakCount ? peak.month : "—"}
                  </dd>
                  <dd className="text-[11px] text-slate-400">
                    {peak && peakCount
                      ? `${peakCount.toLocaleString("en-IN")} new users`
                      : "no new users yet"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>
        <section
          className="card flex flex-col p-5"
          aria-labelledby="listings-title"
        >
          <div>
            <h2
              id="listings-title"
              className="text-sm font-bold text-slate-900"
            >
              Listings Overview
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Share of listings by status
            </p>
          </div>
          {stats.isPending ? (
            <Skeleton className="mt-5 h-56" />
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-4 pt-3">
              <div
                className="relative mx-auto size-48"
                role="img"
                aria-label={`Listings by status, ${total.toLocaleString("en-IN")} in total`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={total ? 2 : 0}
                      cornerRadius={3}
                      stroke="none"
                    >
                      {donutColors.map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                    {total.toLocaleString("en-IN")}
                  </strong>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Total
                  </span>
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {listingRows.map((item, i) => (
                  <li
                    key={item.name}
                    className="flex min-w-0 items-center gap-2 text-xs"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background:
                          listingColors[item.name] ?? fallbackColors[i % 6],
                      }}
                    />
                    <span className="truncate text-slate-500">{item.name}</span>
                    <span className="ml-auto font-semibold tabular-nums text-slate-700">
                      {item.value}
                    </span>
                    <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
                      {share(item.value)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      <section aria-labelledby="quick-actions-title">
        <h2
          id="quick-actions-title"
          className="mb-3 text-sm font-bold text-slate-900"
        >
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ label, href, icon: Icon, color, hint }) => (
            <Link
              key={href}
              href={href}
              className="card group flex items-center gap-3 p-4 transition-colors hover:border-[#B9520A]/30 hover:bg-[#FEF3EA]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9520A]"
            >
              <span className={`rounded-lg p-2.5 ${color}`}>
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {label}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {hint}
                </span>
              </span>
              <ArrowUpRight
                className="ml-auto shrink-0 text-slate-300 transition-colors group-hover:text-[#B9520A]"
                size={16}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
