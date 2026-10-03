"use client";

import { useCallback, useState } from "react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { getIconEmoji } from "@/lib/icons";

interface MicButtonProps {
  /** Called with the final transcript (trimmed). */
  onTranscript: (text: string) => void;
  /** If true, append to existing value instead of replacing. */
  append?: boolean;
  /** Current field value when append is used. */
  value?: string;
  className?: string;
  label?: string;
}

export function MicButton({
  onTranscript,
  append = false,
  value = "",
  className = "",
  label = "Tala in text",
}: MicButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const handleResult = useCallback(
    (transcript: string) => {
      setError(null);
      if (append && value.trim()) {
        onTranscript(`${value.trim()} ${transcript}`);
      } else {
        onTranscript(transcript);
      }
    },
    [append, onTranscript, value],
  );

  const { supported, listening, toggle } = useSpeechToText({
    lang: "sv-SE",
    onResult: handleResult,
    onError: setError,
  });

  if (!supported) {
    return null;
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-label={listening ? "Stoppa mikrofon" : label}
        aria-pressed={listening}
        title={listening ? "Lyssnar… tryck för att stoppa" : label}
        className={`tap-target flex h-11 w-11 items-center justify-center rounded-xl text-lg transition ${
          listening
            ? "bg-[#c45c4a] text-white shadow-sm"
            : "bg-[var(--surface-soft)] text-[var(--ink)] ring-1 ring-black/10"
        } ${className}`}
      >
        {listening ? getIconEmoji("stop") : getIconEmoji("mic")}
      </button>
      {error ? (
        <p className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#c45c4a] shadow-md ring-1 ring-black/10">
          {error}
        </p>
      ) : null}
    </div>
  );
}
