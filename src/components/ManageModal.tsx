"use client";

import { useEffect, type ReactNode } from "react";

interface ManageModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Shared overlay for “create new” forms on Hantera tabs. */
export function ManageModal({
  title,
  description,
  onClose,
  children,
}: ManageModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Stäng"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-modal-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id="manage-modal-title"
              className="font-display text-xl font-bold"
            >
              {title}
            </h3>
            {description ? (
              <p className="text-sm text-[var(--ink-muted)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-target rounded-full px-3 py-1.5 text-sm font-bold text-[var(--ink-muted)]"
          >
            Stäng
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
