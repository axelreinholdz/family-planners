"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { mondayWeekdayIndex } from "@/lib/dates";

const DISH_MAX_PX = 72;
const DISH_MIN_PX = 14;
const MEASURE_AT = 100;

/** One-line dish text: grow to fill container width, shrink only when needed. */
function FitOneLine({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(DISH_MAX_PX);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const fit = () => {
      const width = box.clientWidth;
      if (width <= 0) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Match rendered weight/family so short names (e.g. Pizza) fill the row.
      const style = getComputedStyle(box);
      const family = style.fontFamily || "serif";
      ctx.font = `700 ${MEASURE_AT}px ${family}`;
      const textWidth = Math.max(1, ctx.measureText(text).width);
      // Fill width; only shrink when the line would overflow.
      const byWidth = (width / textWidth) * MEASURE_AT;
      const next = Math.max(DISH_MIN_PX, Math.min(DISH_MAX_PX, byWidth));
      setFontSize(next);
    };

    fit();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(fit);
    });
    ro.observe(box);

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [text]);

  return (
    <div
      ref={boxRef}
      className="flex h-full min-h-0 w-full min-w-0 flex-1 items-center overflow-hidden font-display"
    >
      <p
        title={text}
        style={{ fontSize: `${fontSize}px` }}
        className={`w-full overflow-hidden whitespace-nowrap leading-none ${className ?? ""}`}
      >
        {text}
      </p>
    </div>
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
      <FitOneLine
        text={dish}
        className="font-display font-bold text-[var(--ink)]"
      />
    </div>
  );
}
