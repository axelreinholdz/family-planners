"use client";

import { useState } from "react";
import { getManagePin, verifyManagePin } from "@/lib/managePin";

interface ManagePinGateProps {
  onUnlock: () => void;
  onCancel: () => void;
}

export function ManagePinGate({ onUnlock, onCancel }: ManagePinGateProps) {
  const pinLength = getManagePin().length;
  const [digits, setDigits] = useState("");
  const [error, setError] = useState(false);

  const tryUnlock = (value: string) => {
    if (verifyManagePin(value)) {
      onUnlock();
      return;
    }
    setError(true);
    window.setTimeout(() => setDigits(""), 350);
  };

  const press = (digit: string) => {
    if (digits.length >= 6) return;
    const next = digits + digit;
    setDigits(next);
    setError(false);
    if (next.length === pinLength) {
      tryUnlock(next);
    }
  };

  const clear = () => {
    setDigits("");
    setError(false);
  };

  const backspace = () => {
    setDigits((d) => d.slice(0, -1));
    setError(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-white/85 p-6 shadow-lg ring-1 ring-black/5">
        <p className="text-center text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          Hantera
        </p>
        <h2 className="mt-1 text-center font-display text-2xl font-bold text-[var(--ink)]">
          Ange PIN-kod
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--ink-muted)]">
          Föräldraläge skyddas så barnen inte råkar ändra saker.
        </p>

        <div className="mt-6 flex justify-center gap-3" aria-live="polite">
          {Array.from({ length: pinLength }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full ring-2 ${
                error
                  ? "bg-red-500 ring-red-500/40"
                  : i < digits.length
                    ? "bg-[var(--accent)] ring-[var(--accent)]/30"
                    : "bg-transparent ring-black/15"
              }`}
            />
          ))}
        </div>
        {error ? (
          <p className="mt-3 text-center text-sm font-semibold text-red-700">
            Fel PIN-kod
          </p>
        ) : (
          <p className="mt-3 text-center text-sm text-[var(--ink-faint)]">
            Standard-PIN är 1234 (byt under Inställningar)
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
            (key, index) => {
              if (!key) {
                return <span key={`empty-${index}`} />;
              }
              const isBack = key === "⌫";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (isBack) backspace();
                    else press(key);
                  }}
                  className="tap-target flex h-14 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-xl font-bold text-[var(--ink)]"
                  aria-label={isBack ? "Radera" : `Siffra ${key}`}
                >
                  {key}
                </button>
              );
            },
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            clear();
            onCancel();
          }}
          className="tap-target mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold text-[var(--ink-muted)]"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
