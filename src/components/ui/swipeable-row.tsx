"use client";

import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
  className?: string;
}

const SWIPE_THRESHOLD = 64;
const REVEAL_WIDTH = 80;

export function SwipeableRow({
  children,
  onDelete,
  deleteLabel = "Delete",
  className,
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const delta = e.touches[0].clientX - startX.current;
    setOffset(delta < 0 ? Math.max(-REVEAL_WIDTH, delta) : 0);
  }

  function onTouchEnd() {
    dragging.current = false;
    setOffset((current) =>
      current <= -SWIPE_THRESHOLD ? -REVEAL_WIDTH : 0
    );
  }

  function handleDelete() {
    setOffset(0);
    onDelete();
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground"
        onClick={handleDelete}
        aria-label={deleteLabel}
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <div
        className="relative bg-background transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
