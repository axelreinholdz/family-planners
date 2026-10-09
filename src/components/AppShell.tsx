"use client";

import { useRef, useState } from "react";
import { IdagView } from "@/components/IdagView";
import { ManagePinGate } from "@/components/ManagePinGate";
import { ManageView } from "@/components/ManageView";
import { SwipePager } from "@/components/SwipePager";
import { TodoView } from "@/components/TodoView";
import { WeekView } from "@/components/WeekView";
import { FamilyStoreProvider } from "@/hooks/useFamilyStore";

const PAGE_LABELS = ["Vecka", "Idag", "Att göra"] as const;

function KitchenApp() {
  const [pageIndex, setPageIndex] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [idagEditing, setIdagEditing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          {PAGE_LABELS[pageIndex] ?? "Vecka"}
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
        activeIndex={pageIndex}
        onIndexChange={setPageIndex}
        swipeEnabled={!idagEditing}
        pages={[
          { id: "week", label: "Veckans schema", content: <WeekView /> },
          {
            id: "idag",
            label: "Idag",
            content: <IdagView onEditingChange={setIdagEditing} />,
          },
          { id: "todos", label: "Att göra", content: <TodoView /> },
        ]}
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
