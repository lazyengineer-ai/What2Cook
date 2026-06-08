"use client";

import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategoryFilterProps {
  categories: Category[];
  value: string;
  onChange: (slug: string) => void;
  counts?: Record<string, number>;
  extraFilters?: Array<{
    slug: string;
    emoji: string;
    label: string;
    count?: number;
  }>;
}

export function CategoryFilter({
  categories,
  value,
  onChange,
  counts = {},
  extraFilters = [],
}: CategoryFilterProps) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="relative -mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip
          active={value === "all"}
          onClick={() => onChange("all")}
          emoji="🗂️"
          label="All"
          count={total}
        />
        {extraFilters.map((filter) => (
          <FilterChip
            key={filter.slug}
            active={value === filter.slug}
            onClick={() => onChange(filter.slug)}
            emoji={filter.emoji}
            label={filter.label}
            count={filter.count ?? 0}
            dimmed={(filter.count ?? 0) === 0}
          />
        ))}
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            active={value === category.slug}
            onClick={() => onChange(category.slug)}
            emoji={category.icon ?? "📦"}
            label={category.name}
            count={counts[category.slug] ?? 0}
            dimmed={(counts[category.slug] ?? 0) === 0}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  emoji,
  label,
  count,
  dimmed = false,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  count: number;
  dimmed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}${count > 0 ? `, ${count} items` : ""}`}
      aria-pressed={active}
      className={cn(
        "relative flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2.5 transition-all touch-target",
        active
          ? "bg-primary/15 ring-2 ring-primary shadow-sm"
          : "bg-muted/60 hover:bg-muted",
        dimmed && !active && "opacity-45"
      )}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <span
        className={cn(
          "max-w-[4.5rem] truncate text-[10px] font-medium leading-tight",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
            active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground ring-1 ring-border"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
