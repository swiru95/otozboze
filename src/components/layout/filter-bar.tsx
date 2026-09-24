"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Three stacked selects push the first result ~400px down a phone screen, so
 * on small screens the filters collapse behind a button. Always open on
 * desktop, where the row costs one line.
 */
export function FilterBar({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full lg:hidden"
      >
        <SlidersHorizontal className="size-4" />
        Filtry i sortowanie
        {activeCount > 0 && (
          <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      <div
        className={`${open ? "flex" : "hidden"} flex-col gap-3 lg:flex lg:flex-row lg:flex-wrap lg:items-end`}
      >
        {children}
      </div>
    </div>
  );
}
