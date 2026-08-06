"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ErrorState } from "@/components/composites/error-state";
import { FormSection } from "@/components/composites/form-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_UX_COPY_FA } from "@/infrastructure/auth/auth-ux-copy";
import { csrfHeadersForBrowserFetch } from "@/infrastructure/security";

type CustomerOtpLoginFormProps = {
  storeSlug: string;
};

export function CustomerOtpLoginForm({ storeSlug }: CustomerOtpLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") ??
    `/s/${encodeURIComponent(storeSlug)}/dashboard`;

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRequestOtp(event: FormEvent) {
    event.preventDefault();
    if (!consent) {
      setError(AUTH_UX_COPY_FA.consentLabel);
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/auth/customer/otp/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeadersForBrowserFetch(),
        },
        body: JSON.stringify({
          phone,
          consentCheckboxAccepted: consent,
        }),
      });
      const body = (await res.json()) as {
        data?: { devOtp?: string };
        error?: { message?: string; messageFa?: string };
      };
      if (!res.ok) {
        setError(
          body.error?.messageFa ??
            body.error?.message ??
            AUTH_UX_COPY_FA.errorGeneric,
        );
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
    if (!consent) {
      setError(
        "برای ورود، پذیرش ذخیره و استفاده از شماره الزامی است.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/customer/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeadersForBrowserFetch(),
        },
        body: JSON.stringify({
          phone,
          code,
          consentCheckboxAccepted: consent,
          storeId: storeSlug,
        }),
      });
      const body = (await res.json()) as {
        error?: { message?: string; messageFa?: string };
      };
      if (!res.ok) {
        setError(
          body.error?.messageFa ??
            body.error?.message ??
            AUTH_UX_COPY_FA.errorGeneric,
        );
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">
          {AUTH_UX_COPY_FA.customerTitle}
        </h1>
        <p className="text-muted-foreground">{AUTH_UX_COPY_FA.customerHint}</p>
      </header>

      {step === "phone" ? (
        <form className="flex flex-col gap-4" onSubmit={onRequestOtp}>
          <FormSection title={AUTH_UX_COPY_FA.phoneLabel}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customer-phone">{AUTH_UX_COPY_FA.phoneLabel}</Label>
              <Input
                id="customer-phone"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder={AUTH_UX_COPY_FA.phonePlaceholder}
                className="min-h-11 text-base"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </FormSection>
          <div className="flex items-start gap-3 text-sm leading-6">
            <Checkbox
              id="customer-consent-phone"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              required
            />
            <Label htmlFor="customer-consent-phone" className="leading-6">
              {AUTH_UX_COPY_FA.consentLabel}
            </Label>
          </div>
          <Button
            type="submit"
            disabled={loading || !consent}
            className="min-h-11"
          >
            {loading ? AUTH_UX_COPY_FA.loading : AUTH_UX_COPY_FA.requestOtp}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onVerifyOtp}>
          <div className="flex items-start gap-3 text-sm leading-6">
            <Checkbox
              id="customer-consent-otp"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              required
            />
            <Label htmlFor="customer-consent-otp" className="leading-6">
              {AUTH_UX_COPY_FA.consentLabel}
            </Label>
          </div>
          <FormSection title={AUTH_UX_COPY_FA.otpLabel}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customer-otp">{AUTH_UX_COPY_FA.otpLabel}</Label>
              <Input
                id="customer-otp"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={AUTH_UX_COPY_FA.otpPlaceholder}
                className="min-h-11 text-base tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
          </FormSection>
          {devOtp ? (
            <p className="text-sm text-muted-foreground" dir="ltr">
              devOtp: {devOtp}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading || !consent}
            className="min-h-11"
          >
            {loading ? AUTH_UX_COPY_FA.loading : AUTH_UX_COPY_FA.verifyOtp}
          </Button>
        </form>
      )}

      {message ? (
        <Alert>
          <AlertDescription role="status">{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? <ErrorState title="خطا" description={error} /> : null}

      <p className="text-sm text-muted-foreground">
        {AUTH_UX_COPY_FA.pickupOnlyNote}
      </p>
    </div>
  );
}
