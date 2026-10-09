"use client";

import { useState, type FormEvent } from "react";
import { MicButton } from "@/components/MicButton";
import { useFamilyStore } from "@/hooks/useFamilyStore";

export function TodoView() {
  const { todos, ready, createTodo, toggleTodo, removeTodo } = useFamilyStore();
  const [draft, setDraft] = useState("");

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await createTodo(draft);
    setDraft("");
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar listan…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <form
        onSubmit={onSubmit}
        className="flex gap-2 rounded-2xl bg-white/80 p-2 shadow-sm ring-1 ring-black/5"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Lägg till något att göra…"
          className="tap-target min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-base outline-none placeholder:text-[var(--ink-faint)]"
        />
        <MicButton
          value={draft}
          append
          onTranscript={setDraft}
          label="Tala in att-göra"
        />
        <button
          type="submit"
          className="tap-target rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-40"
          disabled={!draft.trim()}
        >
          Lägg till
        </button>
      </form>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Att göra ({open.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {open.length === 0 ? (
              <li className="rounded-2xl bg-[var(--surface-soft)] px-4 py-6 text-center text-sm text-[var(--ink-muted)]">
                Inget kvar — bra jobbat!
              </li>
            ) : (
              open.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] px-3 py-3"
                >
                  <button
                    type="button"
                    aria-label={`Markera klar: ${todo.title}`}
                    onClick={() => void toggleTodo(todo.id)}
                    className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white text-lg"
                  />
                  <span className="min-w-0 flex-1 text-base font-semibold text-[var(--ink)]">
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ta bort ${todo.title}`}
                    onClick={() => void removeTodo(todo.id)}
                    className="tap-target rounded-full px-3 text-sm font-semibold text-[var(--ink-muted)]"
                  >
                    Ta bort
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col rounded-3xl bg-white/50 p-4 ring-1 ring-black/5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            Klart ({done.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {done.length === 0 ? (
              <li className="px-2 py-4 text-sm text-[var(--ink-faint)]">
                Inga avklarade ännu.
              </li>
            ) : (
              done.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 opacity-70"
                >
                  <button
                    type="button"
                    aria-label={`Ångra: ${todo.title}`}
                    onClick={() => void toggleTodo(todo.id)}
                    className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg text-white"
                  >
                    ✓
                  </button>
                  <span className="min-w-0 flex-1 text-base font-medium line-through text-[var(--ink-muted)]">
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ta bort ${todo.title}`}
                    onClick={() => void removeTodo(todo.id)}
                    className="tap-target rounded-full px-3 text-sm font-semibold text-[var(--ink-muted)]"
                  >
                    Ta bort
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="mt-auto pt-6">
            <div className="rounded-2xl border border-dashed border-[var(--ink-faint)] px-4 py-5 text-center">
              <p className="font-display text-lg font-bold text-[var(--ink-muted)]">
                Mer kommer snart
              </p>
              <p className="mt-1 text-sm text-[var(--ink-faint)]">
                Plats för inköpslista och annat.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
