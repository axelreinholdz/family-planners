import { NextResponse } from "next/server";
import {
  normalizeSchoolSlug,
  parseSchoolLunchRss,
  schoolLunchRssUrl,
} from "@/lib/schoolLunchRss";

const MAX_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 15_000;

type RequestBody = {
  url?: string;
  schoolSlug?: string;
};

function resolveFetchUrl(body: RequestBody): URL | null {
  const slugFromBody =
    typeof body.schoolSlug === "string"
      ? normalizeSchoolSlug(body.schoolSlug)
      : null;
  if (slugFromBody) {
    return new URL(schoolLunchRssUrl(slugFromBody));
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw) return null;
  const slug = normalizeSchoolSlug(raw);
  if (!slug) return null;
  return new URL(schoolLunchRssUrl(slug));
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsedUrl = resolveFetchUrl(body);
  if (!parsedUrl) {
    return NextResponse.json(
      {
        error:
          "Ange en giltig skolmaten.se-adress eller slug (t.ex. kvibergsskolan-f-3)",
      },
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
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Kunde inte hämta skolmat (${response.status})` },
        { status: 502 },
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "RSS-flödet är för stort" },
        { status: 413 },
      );
    }

    const text = new TextDecoder("utf-8").decode(buffer);
    const parsed = parseSchoolLunchRss(text);
    return NextResponse.json({
      schoolName: parsed.schoolName,
      weekKey: parsed.weekKey,
      days: parsed.days,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout vid hämtning av skolmat"
        : err instanceof Error
          ? err.message
          : "Kunde inte hämta skolmat";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
