"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FormSection } from "@/components/composites/form-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{AUTH_UX_COPY_FA.merchantTitle}</CardTitle>
          <CardDescription>{AUTH_UX_COPY_FA.merchantHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === "phone" ? (
            <form className="flex flex-col gap-4" onSubmit={onRequestOtp}>
              <FormSection title={AUTH_UX_COPY_FA.phoneLabel} contentClassName="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="merchant-phone">{AUTH_UX_COPY_FA.phoneLabel}</Label>
                  <Input
                    id="merchant-phone"
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={AUTH_UX_COPY_FA.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </FormSection>
              <Button type="submit" disabled={loading} className="min-h-11 w-full">
                {loading ? AUTH_UX_COPY_FA.loading : AUTH_UX_COPY_FA.requestOtp}
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onVerifyOtp}>
              <FormSection title={AUTH_UX_COPY_FA.otpLabel} contentClassName="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="merchant-otp">{AUTH_UX_COPY_FA.otpLabel}</Label>
                  <Input
                    id="merchant-otp"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={AUTH_UX_COPY_FA.otpPlaceholder}
                    className="tracking-widest"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
                {devOtp ? (
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    devOtp: {devOtp}
                  </p>
                ) : null}
              </FormSection>
              <Button type="submit" disabled={loading} className="min-h-11 w-full">
                {loading ? AUTH_UX_COPY_FA.loading : AUTH_UX_COPY_FA.verifyOtp}
              </Button>
            </form>
          )}

          {message ? (
            <Alert>
              <AlertDescription role="status">{message}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription role="alert">{error}</AlertDescription>
            </Alert>
          ) : null}

          <p className="text-sm text-muted-foreground">
            {AUTH_UX_COPY_FA.pickupOnlyNote}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
