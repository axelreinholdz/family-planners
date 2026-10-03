"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface SwipePagerProps {
  pages: { id: string; label: string; content: ReactNode }[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export function SwipePager({
  pages,
  activeIndex,
  onIndexChange,
}: SwipePagerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: width * index, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    scrollToIndex(activeIndex);
  }, [activeIndex, scrollToIndex]);

  useEffect(() => {
    const onResize = () => scrollToIndex(activeIndex, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex, scrollToIndex]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || dragging) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== activeIndex && index >= 0 && index < pages.length) {
      onIndexChange(index);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
        onScroll={handleScroll}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => {
          setDragging(false);
          handleScroll();
        }}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => {
          setDragging(false);
          handleScroll();
        }}
      >
        {pages.map((page) => (
          <section
            key={page.id}
            className="flex h-full w-full min-w-full shrink-0 snap-center snap-always flex-col px-4 pb-2 pt-1 sm:px-6"
            aria-label={page.label}
          >
            {page.content}
          </section>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 py-3">
        {pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            aria-label={page.label}
            aria-current={index === activeIndex}
            onClick={() => onIndexChange(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === activeIndex
                ? "w-8 bg-[var(--accent)]"
                : "w-2.5 bg-[var(--ink-faint)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
