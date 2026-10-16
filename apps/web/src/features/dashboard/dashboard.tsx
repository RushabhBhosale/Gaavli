"use client";
import { useSyncExternalStore } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import type { Stats, Growth, AdminDto } from "@/lib/contracts";
import { ErrorState, Skeleton } from "@/components/shared/states";
const colors = ["#12a344", "#6ca7ea", "#f3b83c", "#ac95ef"];
const icons = [Users, Sprout, UserRound, ClipboardList];
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm font-medium text-emerald-800">
            {hydrated
              ? `Good ${hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"}, ${admin.name}!`
              : `Welcome, ${admin.name}!`}
          </p>
        </div>
        <p className="pt-1 text-xs text-slate-500">
          {hydrated &&
            now.toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
        </p>
      </div>
      {stats.error && (
        <ErrorState error={stats.error} retry={() => void stats.refetch()} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isPending
          ? icons.map((_, i) => <Skeleton key={i} className="h-28" />)
          : stats.data?.cards.map((card, i) => {
              const Icon = icons[i];
              return (
                <div
                  key={card.label}
                  className="card flex items-start gap-4 p-5"
                >
                  <div
                    className={`rounded-lg p-3 ${i === 2 ? "bg-blue-50 text-blue-500" : i === 3 ? "bg-amber-50 text-amber-500" : "bg-green-50 text-green-600"}`}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {card.count.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{card.label}</p>
                    <p
                      className={`mt-3 flex items-center gap-1 text-[10px] ${card.change === null ? "text-slate-400" : card.change < 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {card.change !== null &&
                        (card.change < 0 ? (
                          <ArrowDownRight size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        ))}
                      {card.change === null
                        ? "No previous month baseline"
                        : `${card.change >= 0 ? "+" : ""}${card.change}% this month`}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-bold">User Growth</h2>
            <div className="flex gap-4 text-[11px] text-slate-500">
              <span>
                <span className="mr-1 text-green-500">●</span>Farmers
              </span>
              <span>
                <span className="mr-1 text-amber-400">●</span>Buyers
              </span>
            </div>
          </div>
          {growth.error ? (
            <ErrorState
              error={growth.error}
              retry={() => void growth.refetch()}
            />
          ) : growth.isPending ? (
            <Skeleton className="h-64" />
          ) : (
            <div
              className="h-64"
              role="img"
              aria-label="New farmers and buyers during the last six months"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={growth.data}
                  margin={{ top: 5, right: 8, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#41bb50"
                        stopOpacity={0.22}
                      />
                      <stop offset="100%" stopColor="#41bb50" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eff3f1" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="Farmers"
                    stroke="#31b54b"
                    fill="url(#greenFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Buyers"
                    stroke="#efb537"
                    fill="#fef5d6"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-5 text-sm font-bold">Listings Overview</h2>
          {stats.isPending ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="relative h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        total
                          ? stats.data?.listings
                          : [{ name: "No listings", value: 1 }]
                      }
                      dataKey="value"
                      innerRadius={65}
                      outerRadius={90}
                      strokeWidth={3}
                    >
                      {(total
                        ? stats.data?.listings.map(
                            (_, i) => colors[i % colors.length],
                          ) || []
                        : ["#e8eeeb"]
                      ).map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <strong className="text-3xl">
                    {total.toLocaleString("en-IN")}
                  </strong>
                  <span className="text-xs text-slate-500">Total</span>
                </div>
              </div>
              <div className="space-y-4 text-xs text-slate-500">
                {stats.data?.listings.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: colors[i % colors.length] }}
                    />
                    <strong className="text-slate-700">{item.value}</strong>
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-bold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Manage Users",
              href: "/users",
              icon: Users,
              color: "text-blue-500 bg-blue-50",
            },
            {
              label: "Review Listings",
              href: "/listings",
              icon: ClipboardList,
              color: "text-amber-500 bg-amber-50",
            },
            {
              label: "Manage Villages",
              href: "/villages",
              icon: House,
              color: "text-green-600 bg-green-50",
            },
            {
              label: "View Reports",
              href: "/reports",
              icon: ChartNoAxesCombined,
              color: "text-violet-500 bg-violet-50",
            },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link
              href={href}
              key={href}
              className="card flex items-center gap-3 p-4 text-xs font-semibold text-slate-600 transition-shadow hover:shadow-md"
            >
              <span className={`rounded-md p-2 ${color}`}>
                <Icon size={19} />
              </span>
              {label}
              <ArrowUpRight className="ml-auto text-slate-300" size={15} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
