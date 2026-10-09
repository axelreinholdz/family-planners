import { toDateKey } from "@/lib/dates";

export type ParsedSchoolLunchDay = {
  date: string;
  dishes: string[];
};

export type ParsedSchoolLunchFeed = {
  schoolName: string;
  weekKey?: string;
  days: ParsedSchoolLunchDay[];
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/**
 * Accept school page URL, RSS URL, or bare slug → school slug.
 */
export function normalizeSchoolSlug(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (SLUG_RE.test(raw) && !raw.includes("/") && !raw.includes(".")) {
    return raw.toLowerCase();
  }

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.hostname !== "skolmaten.se" && url.hostname !== "www.skolmaten.se") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  // /api/4/rss/week/{slug}
  const weekIdx = parts.indexOf("week");
  if (parts[0] === "api" && weekIdx >= 0 && parts[weekIdx + 1]) {
    const slug = parts[weekIdx + 1]!;
    return SLUG_RE.test(slug) ? slug.toLowerCase() : null;
  }
  // /{slug} or /{slug}/...
  const slug = parts[0];
  if (slug && SLUG_RE.test(slug) && slug !== "api" && slug !== "about") {
    return slug.toLowerCase();
  }
  return null;
}

export function schoolLunchRssUrl(schoolSlug: string): string {
  const slug = schoolSlug.trim().toLowerCase();
  return `https://skolmaten.se/api/4/rss/week/${encodeURIComponent(slug)}?locale=sv`;
}

export function schoolLunchDayId(personId: string, date: string): string {
  return `${personId}:${date}`;
}

/** ISO week key YYYY-Www from a local date. */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tagContent(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = re.exec(block);
  return match ? decodeXml(match[1]!.trim()) : "";
}

function parsePubDate(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
}

function weekKeyFromTitle(title: string): string | undefined {
  const match = /Vecka\s+(\d+)/i.exec(title);
  if (!match) return undefined;
  const week = Number(match[1]);
  if (!Number.isFinite(week) || week < 1 || week > 53) return undefined;
  const year = new Date().getFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function parseSchoolLunchRss(xml: string): ParsedSchoolLunchFeed {
  if (!/<rss[\s>]/i.test(xml) || !/<item[\s>]/i.test(xml)) {
    throw new Error("Svaret ser inte ut som en skolmats-RSS");
  }

  const channelTitle = tagContent(xml, "title");
  const schoolName = channelTitle.replace(/^Skolmaten\s*-\s*/i, "").trim()
    || "Skola";

  const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  const days: ParsedSchoolLunchDay[] = [];
  let weekKey: string | undefined;

  for (const item of xml.match(itemRe) ?? []) {
    const title = tagContent(item, "title");
    const description = tagContent(item, "description");
    const pubDate = tagContent(item, "pubDate");
    const date = parsePubDate(pubDate);
    if (!date) continue;

    if (!weekKey) weekKey = weekKeyFromTitle(title);

    const dishes = description
      .split(/<br\s*\/?>/i)
      .map((part) => stripHtml(part))
      .map((part) => part.replace(/,\s*$/, "").trim())
      .filter(Boolean);

    days.push({
      date,
      dishes: dishes.length > 0 ? dishes : [stripHtml(description) || title],
    });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  if (days.length === 0) {
    throw new Error("RSS-flödet innehöll inga skoldagar");
  }

  return {
    schoolName,
    weekKey: weekKey ?? isoWeekKey(new Date(`${days[0]!.date}T12:00:00`)),
    days,
  };
}
