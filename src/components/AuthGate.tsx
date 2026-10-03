"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createFamily,
  getMembership,
  joinFamily,
} from "@/lib/supabase/family";
import { clearCloudCache } from "@/lib/supabase/cloud-db";
import { setCloudMode } from "@/lib/repository";

type Phase =
  | "loading"
  | "local"
  | "login"
  | "check-email"
  | "onboarding"
  | "ready";

type AuthMode = "password" | "magic";

const supabaseConfigured = isSupabaseConfigured();

export function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() =>
    supabaseConfigured ? "loading" : "local",
  );
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [familyName, setFamilyName] = useState("Familjen");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setCloudMode(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setCloudMode(false);
          setPhase("login");
          return;
        }
        await finishAuth(supabase, cancelled, setPhase, setError);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Kunde inte logga in");
        setPhase("login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const afterPasswordAuth = async () => {
    const supabase = createClient();
    await finishAuth(supabase, false, setPhase, setError);
  };

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const trimmed = email.trim();
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmed,
          password,
        });
        if (signUpError) throw signUpError;
        // If email confirmation is required, there is no session yet.
        if (!data.session) {
          setPhase("check-email");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (signInError) throw signInError;
      }
      await afterPasswordAuth();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isSignUp
            ? "Kunde inte skapa konto"
            : "Kunde inte logga in",
      );
    } finally {
      setBusy(false);
    }
  };

  const sendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      setPhase("check-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skicka länk");
    } finally {
      setBusy(false);
    }
  };

  const onCreateFamily = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await createFamily(supabase, familyName.trim() || "Familjen");
      clearCloudCache();
      setCloudMode(true);
      setPhase("ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kunde inte skapa familj";
      setError(message);
      console.error("createFamily failed", err);
    } finally {
      setBusy(false);
    }
  };

  const onJoinFamily = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await joinFamily(supabase, inviteCode);
      clearCloudCache();
      setCloudMode(true);
      setPhase("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte gå med i familjen",
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearCloudCache();
    setCloudMode(false);
    setPhase("login");
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-[var(--ink-muted)]">
        Laddar…
      </div>
    );
  }

  if (phase === "local" || phase === "ready") {
    return <>{children}</>;
  }

  if (phase === "check-email") {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold">Kolla din e-post</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Vi skickade ett mejl till <strong>{email}</strong>. Bekräfta kontot
          eller öppna inloggningslänken, sedan kan du logga in här.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(false);
            setAuthMode("password");
            setPhase("login");
          }}
          className="tap-target mt-6 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold"
        >
          Tillbaka till inloggning
        </button>
      </Shell>
    );
  }

  if (phase === "onboarding") {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold">Din familj</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Skapa en ny familj (första enheten) eller gå med med en
          inbjudningskod från en annan enhet.
        </p>
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
        ) : null}

        <div className="mt-6 grid gap-6">
          <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-black/5">
            <h2 className="font-display text-xl font-bold">Skapa familj</h2>
            <label className="mt-3 grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Namn
              <input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCreateFamily()}
              className="tap-target mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Skapa och fortsätt
            </button>
          </div>

          <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-black/5">
            <h2 className="font-display text-xl font-bold">Gå med</h2>
            <label className="mt-3 grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
              Inbjudningskod
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base uppercase tracking-widest"
              />
            </label>
            <button
              type="button"
              disabled={busy || inviteCode.trim().length < 4}
              onClick={() => void onJoinFamily()}
              className="tap-target mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Gå med
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="tap-target mt-6 text-sm font-semibold text-[var(--ink-muted)]"
        >
          Logga ut
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-bold">
        {isSignUp && authMode === "password" ? "Skapa konto" : "Logga in"}
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Synka schemat mellan köks-iPad, telefon och dator.
      </p>

      <div className="mt-4 flex gap-2 rounded-2xl bg-[var(--surface-soft)] p-1">
        <button
          type="button"
          onClick={() => {
            setAuthMode("password");
            setError(null);
          }}
          className={`tap-target flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
            authMode === "password"
              ? "bg-white text-[var(--ink)] shadow-sm"
              : "text-[var(--ink-muted)]"
          }`}
        >
          Lösenord
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode("magic");
            setIsSignUp(false);
            setError(null);
          }}
          className={`tap-target flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
            authMode === "magic"
              ? "bg-white text-[var(--ink)] shadow-sm"
              : "text-[var(--ink-muted)]"
          }`}
        >
          Magisk länk
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      {authMode === "password" ? (
        <form
          onSubmit={(e) => void onPasswordSubmit(e)}
          className="mt-4 grid gap-3"
        >
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            E-post
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
              placeholder="du@exempel.se"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            Lösenord
            <input
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
              placeholder="Minst 6 tecken"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {isSignUp ? "Skapa konto" : "Logga in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp((v) => !v);
              setError(null);
            }}
            className="tap-target text-sm font-semibold text-[var(--accent-deep)]"
          >
            {isSignUp
              ? "Har du redan konto? Logga in"
              : "Nytt konto? Skapa här"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => void sendMagicLink(e)}
          className="mt-4 grid gap-3"
        >
          <label className="grid gap-1 text-sm font-semibold text-[var(--ink-muted)]">
            E-post
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tap-target rounded-xl border border-black/10 bg-white px-3 py-2 text-base"
              placeholder="du@exempel.se"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="tap-target rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Skicka inloggningslänk
          </button>
        </form>
      )}
    </Shell>
  );
}

async function finishAuth(
  supabase: ReturnType<typeof createClient>,
  cancelled: boolean,
  setPhase: (phase: Phase) => void,
  setError: (error: string | null) => void,
) {
  try {
    const membership = await getMembership(supabase);
    if (cancelled) return;
    if (!membership) {
      setCloudMode(false);
      setPhase("onboarding");
      return;
    }
    setCloudMode(true);
    setPhase("ready");
  } catch (err) {
    if (cancelled) return;
    setError(err instanceof Error ? err.message : "Kunde inte hämta familj");
    setPhase("onboarding");
  }
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--paper)] px-4 py-8">
      <div className="w-full max-w-md rounded-[2rem] bg-[linear-gradient(160deg,#fff9f0_0%,#e8f6f3_55%,#f7f1e8_100%)] p-6 shadow-lg ring-1 ring-black/5">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          Family Planners
        </p>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
