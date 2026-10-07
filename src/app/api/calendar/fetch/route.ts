import { NextResponse } from "next/server";
import { isValidDateKey, parseIcsWindow } from "@/lib/calendarIcs";

const MAX_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 15_000;

type RequestBody = {
  url?: string;
  from?: string;
  to?: string;
};

function isAllowedUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  return parsed;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const from = typeof body.from === "string" ? body.from.trim() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";

  const parsedUrl = isAllowedUrl(url);
  if (!parsedUrl) {
    return NextResponse.json(
      { error: "URL måste vara http eller https" },
      { status: 400 },
    );
  }
  if (!isValidDateKey(from) || !isValidDateKey(to) || from > to) {
    return NextResponse.json(
      { error: "Ogiltigt datumintervall (from/to)" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/calendar, text/plain, */*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Kunde inte hämta kalender (${response.status})` },
        { status: 502 },
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "Kalenderfilen är för stor" },
        { status: 413 },
      );
    }

    const text = new TextDecoder("utf-8").decode(buffer);
    if (!text.includes("BEGIN:VCALENDAR") && !text.includes("BEGIN:VEVENT")) {
      return NextResponse.json(
        { error: "Svaret ser inte ut som en ICS-kalender" },
        { status: 422 },
      );
    }

    const events = parseIcsWindow(text, from, to);
    return NextResponse.json({ events });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout vid hämtning av kalender"
        : err instanceof Error
          ? err.message
          : "Kunde inte hämta kalender";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
