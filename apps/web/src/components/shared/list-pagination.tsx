import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  label?: string;
  pageSizeOptions?: readonly number[];
};

function visiblePages(page: number, pages: number) {
  const length = Math.min(5, pages);
  const first = Math.max(1, Math.min(page - 2, pages - length + 1));
  return Array.from({ length }, (_, index) => first + index);
}

export function ListPagination({
  page,
  pageSize,
  total,
  disabled = false,
  onPageChange,
  onPageSizeChange,
  label = "Pagination",
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: ListPaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(current * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <div className="w-[4.5rem]">
          <select
            aria-label="Rows per page"
            value={pageSize}
            disabled={disabled}
            style={{ minHeight: 0, height: "2rem", padding: "0 0.4rem" }}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p role="status">
        {from}-{to} of {total.toLocaleString("en-IN")}
      </p>
      <nav aria-label={label} className="flex items-center gap-0.5">
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 disabled:opacity-40"
          disabled={disabled || current <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        {visiblePages(current, pages).map((number) => (
          <button
            key={number}
            type="button"
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs",
              number === current
                ? "bg-slate-400 font-semibold text-white"
                : "text-slate-600 hover:bg-slate-200/70",
            )}
            aria-label={`Page ${number}`}
            aria-current={number === current ? "page" : undefined}
            disabled={disabled}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 disabled:opacity-40"
          disabled={disabled || current >= pages}
          aria-label="Next page"
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
