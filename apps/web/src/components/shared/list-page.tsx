"use client";
import type { ReactNode, RefObject } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreVertical,
  Search,
  X,
} from "lucide-react";
import { flexRender, type Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterChip } from "./filter-chip";
import { Skeleton } from "./states";

// Shared shell for the Admin list pages: toolbar, filters, table and cards.
// A page supplies its columns, its filter state and its row renderer; the
// spacing, borders, sticky header and mobile layout come from here so every
// list keeps the same structure.

export function ListPageToolbar({
  search,
  actions,
}: {
  search: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="w-full sm:max-w-md">{search}</div>
      {actions}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  inputRef,
  maxLength = 100,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  maxLength?: number;
}) {
  return (
    <div className="relative w-full">
      <Search
        size={15}
        className="absolute left-3 top-3 text-slate-400"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        aria-label={label}
        aria-keyshortcuts="/"
        placeholder={placeholder}
        maxLength={maxLength}
        style={{ paddingLeft: 34, paddingRight: value ? 32 : undefined }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2 top-2.5 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          onClick={() => onChange("")}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function ListCard({
  toolbar,
  filters,
  footer,
  children,
}: {
  toolbar?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          {toolbar}
        </div>
      )}
      {filters}
      {children}
      {footer}
    </div>
  );
}

export function ListFilterBar({
  items,
  onClearAll,
}: {
  items: { label: string; onRemove: () => void }[];
  onClearAll: () => void;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
      <span className="text-xs font-semibold text-slate-500">Filters</span>
      {items.map((item) => (
        <FilterChip
          key={item.label}
          label={item.label}
          onRemove={item.onRemove}
        />
      ))}
      <button
        type="button"
        className="ml-auto text-xs font-semibold text-[#A84E0D] hover:underline"
        onClick={onClearAll}
      >
        Clear all
      </button>
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </div>
  );
}

export function RowActions({
  label,
  items,
}: {
  label: string;
  items: { label: string; onSelect: () => void; disabled?: boolean }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={label}>
          <MoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            disabled={item.disabled}
            onSelect={item.onSelect}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DataTable<T>({
  table,
  caption,
  mobileRow,
}: {
  table: Table<T>;
  caption: string;
  mobileRow: (row: T) => ReactNode;
}) {
  const rows = table.getRowModel().rows;
  return (
    <>
      <div className="hidden max-h-[70vh] overflow-auto overscroll-contain md:block">
        <table className="w-full min-w-[880px] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                    className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-100 bg-slate-50 px-4 py-3 font-semibold ${header.column.id === "actions" ? "w-24 min-w-24 text-center" : ""}`}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1.5 text-left transition-colors hover:text-slate-800"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp size={13} />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown size={13} />
                        ) : (
                          <ArrowUpDown size={13} className="text-slate-300" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="text-slate-600">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50 ${
                  row.getIsSelected() ? "bg-[#FEF3EA]" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 align-middle ${cell.column.id === "actions" ? "w-24 min-w-24 text-center" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>{mobileRow(row.original)}</li>
        ))}
      </ul>
    </>
  );
}
