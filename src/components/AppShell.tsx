"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BeloningView } from "@/components/BeloningView";
import { IdagView } from "@/components/IdagView";
import { ManagePinGate } from "@/components/ManagePinGate";
import { ManageView } from "@/components/ManageView";
import { SwipePager } from "@/components/SwipePager";
import { TodoView } from "@/components/TodoView";
import { WeekView } from "@/components/WeekView";
import { FamilyStoreProvider, useFamilyStore } from "@/hooks/useFamilyStore";
import {
  DEFAULT_VISIBLE_KITCHEN_PAGES,
  KITCHEN_PAGE_OPTIONS,
} from "@/lib/kitchenPages";
import type { KitchenPageId } from "@/lib/types";

const PAGE_LABELS: Record<KitchenPageId, string> = {
  week: "Veckans Schema",
  idag: "Idag",
  beloning: "Belöning",
  todos: "Att göra",
};

/** Compact labels for the floating page pills. */
const PAGE_PILL_LABELS: Record<KitchenPageId, string> = {
  week: "Vecka",
  idag: "Idag",
  beloning: "Belöning",
  todos: "Att göra",
};

function KitchenApp() {
  const { ready, visibleKitchenPages } = useFamilyStore();
  const [pageIndex, setPageIndex] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [idagEditing, setIdagEditing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabledPages = useMemo(() => {
    const ids =
      visibleKitchenPages.length > 0
        ? visibleKitchenPages
        : DEFAULT_VISIBLE_KITCHEN_PAGES;
    return ids.map((id) => {
      let content: ReactNode;
      switch (id) {
        case "week":
          content = <WeekView />;
          break;
        case "idag":
          content = <IdagView onEditingChange={setIdagEditing} />;
          break;
        case "beloning":
          content = <BeloningView />;
          break;
        case "todos":
          content = <TodoView />;
          break;
      }
      return {
        id,
        label: PAGE_PILL_LABELS[id],
        content,
      };
    });
  }, [visibleKitchenPages]);

  useEffect(() => {
    if (pageIndex >= enabledPages.length) {
      setPageIndex(Math.max(0, enabledPages.length - 1));
    }
  }, [enabledPages.length, pageIndex]);

  const requestManage = () => setPinPrompt(true);

  const onTitlePointerDown = () => {
    pressTimer.current = setTimeout(() => {
      requestManage();
    }, 700);
  };

  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  if (manageOpen) {
    return <ManageView onBack={() => setManageOpen(false)} />;
  }

  if (pinPrompt) {
    return (
      <ManagePinGate
        onUnlock={() => {
          setPinPrompt(false);
          setManageOpen(true);
        }}
        onCancel={() => setPinPrompt(false)}
      />
    );
  }

  const activePageId = enabledPages[pageIndex]?.id;
  const activeLabel =
    (activePageId ? PAGE_LABELS[activePageId] : undefined) ??
    KITCHEN_PAGE_OPTIONS[0]?.label ??
    "Veckans Schema";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-3 sm:px-6">
        <button
          type="button"
          onPointerDown={onTitlePointerDown}
          onPointerUp={clearPress}
          onPointerLeave={clearPress}
          onPointerCancel={clearPress}
          className="justify-self-start text-left"
          aria-label="Family Planners. Håll inne för föräldraläge."
        >
          <p className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
            Family Planners
          </p>
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            Köks-iPad · svep mellan vyer
          </p>
        </button>

        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          {ready ? activeLabel : "…"}
        </h1>

        <button
          type="button"
          onClick={requestManage}
          aria-label="Öppna föräldraläge"
          className="tap-target justify-self-end flex h-10 w-10 items-center justify-center rounded-full bg-white/50 text-[var(--ink-faint)] ring-1 ring-black/5"
          title="Hantera"
        >
          ⚙
        </button>
      </header>

      <SwipePager
        activeIndex={Math.min(pageIndex, Math.max(0, enabledPages.length - 1))}
        onIndexChange={setPageIndex}
        swipeEnabled={!idagEditing}
        pages={enabledPages}
      />
    </div>
  );
}

export function AppShell() {
  return (
    <FamilyStoreProvider>
      <div className="app-frame flex h-[100dvh] flex-col overflow-hidden">
        <KitchenApp />
      </div>
    </FamilyStoreProvider>
  );
}
