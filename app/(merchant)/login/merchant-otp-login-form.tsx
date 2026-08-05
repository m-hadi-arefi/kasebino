"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AUTH_UX_COPY_FA } from "@/infrastructure/auth/auth-ux-copy";
import { csrfHeadersForBrowserFetch } from "@/infrastructure/security";

export function MerchantOtpLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRequestOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeadersForBrowserFetch(),
        },
        body: JSON.stringify({ phone }),
      });
      const body = (await res.json()) as {
        data?: { devOtp?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(body.error?.message ?? AUTH_UX_COPY_FA.errorGeneric);
        return;
      }
      setDevOtp(body.data?.devOtp ?? null);
      setMessage(AUTH_UX_COPY_FA.successOtpSent);
      setStep("otp");
    } catch {
      setError(AUTH_UX_COPY_FA.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeadersForBrowserFetch(),
        },
        body: JSON.stringify({ phone, code }),
      });
      const body = (await res.json()) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(body.error?.message ?? AUTH_UX_COPY_FA.errorGeneric);
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError(AUTH_UX_COPY_FA.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {AUTH_UX_COPY_FA.merchantTitle}
        </h1>
        <p className="text-[var(--color-muted)]">{AUTH_UX_COPY_FA.merchantHint}</p>
      </header>

      {step === "phone" ? (
        <form className="flex flex-col gap-4" onSubmit={onRequestOtp}>
          <label className="flex flex-col gap-2 text-sm">
            <span>{AUTH_UX_COPY_FA.phoneLabel}</span>
            <input
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder={AUTH_UX_COPY_FA.phonePlaceholder}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-fg,#fff)]"
          >
            {loading ? AUTH_UX_COPY_FA.loading : AUTH_UX_COPY_FA.requestOtp}
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onVerifyOtp}>
          <label className="flex flex-col gap-2 text-sm">
            <span>{AUTH_UX_COPY_FA.otpLabel}</span>
            <input
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={AUTH_UX_COPY_FA.otpPlaceholder}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
            />
          </label>
          {devOtp ? (
            <p className="text-sm text-[var(--color-muted)]" dir="ltr">
              devOtp: {devOtp}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-fg,#fff)]"
          >
            {loading ? AUTH_UX_COPY_FA.loading : AUTH_UX_COPY_FA.verifyOtp}
          </button>
        </form>
      )}

      {message ? (
        <p className="text-sm text-[var(--color-fg)]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">
        {AUTH_UX_COPY_FA.pickupOnlyNote}
      </p>
    </main>
  );
}
