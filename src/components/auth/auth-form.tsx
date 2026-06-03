"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Phone, KeyRound, ChevronLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { qk } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";

function normalizePhone(raw: string) {
  const t = raw.replace(/[^\d+]/g, "");
  if (!t) return "";
  return t.startsWith("+") ? t : `+1${t}`;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const qc = useQueryClient();
  const authPurpose = mode === "signup" ? "signup" : "login";

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const number = normalizePhone(phone);
    if (number.length < 8) {
      setError("Enter a valid phone number.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.sendPhoneCode(number, authPurpose);
      setStep("code");
      if (res.dev_code) {
        setDevCode(res.dev_code);
        setCode(res.dev_code); // autofill for local dev
      }
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyPhoneCode(normalizePhone(phone), code.trim(), authPurpose);
      await qc.invalidateQueries({ queryKey: qk.me });
      router.replace("/app/marketplace");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "That code didn't work.",
      );
      setBusy(false);
    }
  }

  const title = mode === "signup" ? "Create your account" : "Welcome back";
  const subtitle =
    mode === "signup"
      ? "Start making scroll-stopping videos in minutes."
      : "Sign in to your Lumi studio.";

  return (
    <div>
      <h2 className="font-display text-3xl font-bold text-ink">{title}</h2>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>

      <div className="mt-8">
        <GoogleButton />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <Field
            icon={<Phone className="h-4 w-4" />}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={setPhone}
            label="Phone number"
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send code
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setError(null);
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
            {phone}
          </button>
          <Field
            ref={codeRef}
            icon={<KeyRound className="h-4 w-4" />}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            label="Verification code"
            className="tracking-[0.4em]"
          />
          {devCode && (
            <p className="rounded-xl bg-accent px-3 py-2 text-xs text-accent-foreground">
              Dev mode — code <strong>{devCode}</strong> autofilled.
            </p>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-700">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Lumi?{" "}
            <Link href="/signup" className="font-semibold text-brand-700">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- subparts */

const Field = function Field({
  ref,
  icon,
  label,
  value,
  onChange,
  className,
  ...rest
}: {
  ref?: React.Ref<HTMLInputElement>;
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <span className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft focus-within:border-brand-300">
        <span className="text-muted-foreground">{icon}</span>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground ${className ?? ""}`}
          {...rest}
        />
      </span>
    </label>
  );
};

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-rose">{children}</p>;
}

/* ------------------------------------------------------------- Google SSO */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function GoogleButton() {
  const router = useRouter();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    const onLoad = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            await api.googleLogin(resp.credential);
            await qc.invalidateQueries({ queryKey: qk.me });
            router.replace("/app/marketplace");
          } catch {
            /* surfaced by phone path; keep silent */
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        shape: "pill",
      });
    };
    const existing = document.getElementById("gis-script");
    if (existing) {
      onLoad();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.id = "gis-script";
    s.onload = onLoad;
    document.body.appendChild(s);
  }, [clientId, qc, router]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        title="Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-muted-foreground"
      >
        <GoogleGlyph />
        Continue with Google
      </button>
    );
  }

  return <div ref={ref} className="flex justify-center" />;
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
