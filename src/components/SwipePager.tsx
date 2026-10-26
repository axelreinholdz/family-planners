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
  /** When false, horizontal swipe between pages is disabled (e.g. while rearranging widgets). */
  swipeEnabled?: boolean;
}

export function SwipePager({
  pages,
  activeIndex,
  onIndexChange,
  swipeEnabled = true,
}: SwipePagerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticClearRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    programmaticScrollRef.current = true;
    if (programmaticClearRef.current) {
      clearTimeout(programmaticClearRef.current);
    }
    const width = el.clientWidth;
    el.scrollTo({ left: width * index, behavior: smooth ? "smooth" : "auto" });
    programmaticClearRef.current = setTimeout(
      () => {
        programmaticScrollRef.current = false;
        programmaticClearRef.current = null;
      },
      smooth ? 450 : 50,
    );
  }, []);

  useEffect(() => {
    scrollToIndex(activeIndex);
  }, [activeIndex, scrollToIndex]);

  useEffect(() => {
    const onResize = () => scrollToIndex(activeIndex, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex, scrollToIndex]);

  useEffect(() => {
    if (!swipeEnabled) {
      setDragging(false);
      scrollToIndex(activeIndex, false);
    }
  }, [swipeEnabled, activeIndex, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (programmaticClearRef.current) {
        clearTimeout(programmaticClearRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (
      !el ||
      dragging ||
      !swipeEnabled ||
      programmaticScrollRef.current
    ) {
      return;
    }
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== activeIndex && index >= 0 && index < pages.length) {
      onIndexChange(index);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className={`flex min-h-0 flex-1 overflow-y-hidden overscroll-x-contain ${
          swipeEnabled
            ? "snap-x snap-mandatory overflow-x-auto"
            : "overflow-x-hidden"
        }`}
        style={{
          WebkitOverflowScrolling: swipeEnabled ? "touch" : "auto",
          scrollbarWidth: "none",
          touchAction: swipeEnabled ? undefined : "pan-y",
        }}
        onScroll={handleScroll}
        onTouchStart={swipeEnabled ? () => setDragging(true) : undefined}
        onTouchEnd={
          swipeEnabled
            ? () => {
                setDragging(false);
                handleScroll();
              }
            : undefined
        }
        onMouseDown={swipeEnabled ? () => setDragging(true) : undefined}
        onMouseUp={
          swipeEnabled
            ? () => {
                setDragging(false);
                handleScroll();
              }
            : undefined
        }
      >
        {pages.map((page) => (
          <section
            key={page.id}
            className="flex h-full w-full min-w-full shrink-0 snap-center snap-always flex-col px-4 pb-20 pt-1 sm:px-6"
            aria-label={page.label}
          >
            {page.content}
          </section>
        ))}
      </div>

      <nav
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        aria-label="Köksvyer"
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/92 p-2 shadow-md ring-1 ring-black/5 backdrop-blur-sm">
          {pages.map((page, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={page.id}
                type="button"
                aria-label={page.label}
                aria-current={active ? "page" : undefined}
                onClick={() => onIndexChange(index)}
                className={`tap-target rounded-full px-4 py-2.5 text-sm font-bold transition ${
                  active
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-transparent text-[var(--ink)] hover:bg-black/5"
                }`}
              >
                {page.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
