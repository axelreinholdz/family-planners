"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { mondayWeekdayIndex } from "@/lib/dates";

const TITLE_MAX_PX = 48;
const TITLE_MIN_PX = 12;

/** One-line text that grows to fill width, shrinking only when needed. */
function FitOneLine({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      if (el.clientWidth <= 0) return;

      let lo = TITLE_MIN_PX;
      let hi = TITLE_MAX_PX;
      let best = TITLE_MIN_PX;

      while (hi - lo > 0.25) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (el.scrollWidth <= el.clientWidth + 0.5) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      el.style.fontSize = `${best}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <p
      ref={ref}
      title={text}
      className={`w-full overflow-hidden whitespace-nowrap leading-none ${className ?? ""}`}
    >
      {text}
    </p>
  );
}

export function DinnerWidget() {
  const { dinners } = useFamilyStore();
  const todayWeekday = mondayWeekdayIndex(new Date());
  const dinnerToday = useMemo(
    () => dinners.find((d) => d.weekday === todayWeekday),
    [dinners, todayWeekday],
  );
  const dish = dinnerToday?.title?.trim() || "Ingen planerad";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-[var(--ink)]">
          Middag
        </h3>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 items-center">
        <FitOneLine
          text={dish}
          className="min-w-0 font-display font-bold text-[var(--ink)]"
        />
      </div>
    </div>
  );
}
