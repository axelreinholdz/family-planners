"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { defaultChildId, PersonTabs } from "@/components/PersonTabs";
import { useFamilyStore } from "@/hooks/useFamilyStore";
import { normalizeSchoolSlug } from "@/lib/schoolLunchRss";

function formatSyncMeta(feed: {
  lastSyncedAt?: string;
  lastError?: string;
  weekKey?: string;
}): string {
  if (feed.lastError) return `Fel: ${feed.lastError}`;
  if (feed.lastSyncedAt) {
    const when = new Date(feed.lastSyncedAt);
    const label = Number.isNaN(when.getTime())
      ? "synkad"
      : when.toLocaleString("sv-SE", {
          dateStyle: "short",
          timeStyle: "short",
        });
    return feed.weekKey ? `${feed.weekKey} · ${label}` : label;
  }
  return "Inte synkad ännu";
}

export function ManageSchoolLunch() {
  const {
    ready,
    people,
    schoolLunchDays,
    getSchoolLunchFeed,
    upsertSchoolLunchFeed,
    removeSchoolLunchFeed,
    syncSchoolLunch,
    saveSchoolLunchFeed,
  } = useFamilyStore();

  const children = people.filter((p) => p.role === "child");
  const [personId, setPersonId] = useState(() =>
    defaultChildId(people, children[0]?.id),
  );
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activePersonId = children.some((c) => c.id === personId)
    ? personId
    : (children[0]?.id ?? "");
  const feed = getSchoolLunchFeed(activePersonId);
  const child = children.find((c) => c.id === activePersonId);

  useEffect(() => {
    setUrlInput(feed?.schoolSlug ?? "");
    setMessage(null);
  }, [activePersonId, feed?.schoolSlug]);

  const weekPreview = useMemo(() => {
    if (!activePersonId) return [];
    return schoolLunchDays
      .filter((day) => day.personId === activePersonId)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schoolLunchDays, activePersonId]);

  const slug = normalizeSchoolSlug(urlInput);
  const canSave = Boolean(activePersonId && slug);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug || !activePersonId) return;
    setSaving(true);
    setMessage(null);
    try {
      await upsertSchoolLunchFeed({
        personId: activePersonId,
        schoolSlug: slug,
        enabled: feed?.enabled ?? true,
      });
      setSyncing(true);
      await syncSchoolLunch(activePersonId, { force: true });
      setMessage("Sparad och synkad.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Kunde inte spara skolmat",
      );
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  };

  if (!ready) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">Laddar skolmat…</p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div>
        <h3 className="font-display text-xl font-bold">Skolmat</h3>
        <p className="text-sm text-[var(--ink-muted)]">
          Klistra in skolans adress från{" "}
          <a
            href="https://skolmaten.se"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--accent-deep)] underline"
          >
            skolmaten.se
          </a>
          . Sparad en gång per barn — menyn hämtas automatiskt varje vecka.
        </p>
      </div>

      <PersonTabs
        people={people}
        selectedId={activePersonId}
        roles={["child"]}
        label="Välj barn"
        onSelect={setPersonId}
      />

      {children.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-4 py-8 text-center text-sm text-[var(--ink-muted)] ring-1 ring-black/5">
          Lägg till ett barn under Personer för att koppla skolmat.
        </div>
      ) : (
        <form
          onSubmit={(e) => void onSave(e)}
          className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 ring-1 ring-black/5"
        >
          <p className="text-sm font-semibold text-[var(--ink)]">
            Skola för {child?.name ?? "barn"}
          </p>

          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--ink-muted)]">
            Skolmaten-URL eller slug
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="t.ex. kvibergsskolan-f-3 eller https://skolmaten.se/…"
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base font-semibold text-[var(--ink)]"
            />
          </label>

          {urlInput.trim() && !slug ? (
            <p className="text-sm font-medium text-[#c45c4a]">
              Ogiltig adress. Använd en skolmaten.se-sida eller slug.
            </p>
          ) : null}

          {feed ? (
            <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-sm">
              <p className="font-bold text-[var(--ink)]">
                {feed.schoolName ?? feed.schoolSlug}
              </p>
              <p className="text-[var(--ink-muted)]">{formatSyncMeta(feed)}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!canSave || saving || syncing}
              className="tap-target rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {saving || syncing ? "Sparar…" : "Spara & synka"}
            </button>
            {feed ? (
              <>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => {
                    setSyncing(true);
                    void syncSchoolLunch(activePersonId, { force: true }).finally(
                      () => setSyncing(false),
                    );
                  }}
                  className="tap-target rounded-full bg-white px-4 py-2.5 text-sm font-bold shadow-sm ring-1 ring-black/10 disabled:opacity-40"
                >
                  Synka nu
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void saveSchoolLunchFeed({
                      ...feed,
                      enabled: !feed.enabled,
                    })
                  }
                  className="tap-target rounded-full bg-white px-4 py-2.5 text-sm font-bold shadow-sm ring-1 ring-black/10"
                >
                  {feed.enabled ? "Pausa" : "Aktivera"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Ta bort skolmat för ${child?.name ?? "barn"}?`,
                      )
                    ) {
                      void removeSchoolLunchFeed(feed.id);
                      setUrlInput("");
                    }
                  }}
                  className="tap-target rounded-full px-4 py-2.5 text-sm font-bold text-[#c45c4a]"
                >
                  Ta bort
                </button>
              </>
            ) : null}
          </div>

          {message ? (
            <p className="text-sm font-medium text-[var(--ink-muted)]">
              {message}
            </p>
          ) : null}

          {weekPreview.length > 0 ? (
            <div className="mt-1">
              <p className="mb-2 text-sm font-bold text-[var(--ink)]">
                Denna vecka
              </p>
              <ul className="flex flex-col gap-1.5">
                {weekPreview.map((day) => (
                  <li
                    key={day.id}
                    className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-sm"
                  >
                    <span className="font-bold text-[var(--ink)]">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                        "sv-SE",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </span>
                    <span className="text-[var(--ink-muted)]">
                      {" · "}
                      {day.dishes.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
