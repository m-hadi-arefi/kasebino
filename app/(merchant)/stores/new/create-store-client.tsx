"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { FormSection } from "@/components/composites/form-section";
import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STORE_CREATE_UI_COPY_FA,
  createMerchantStore,
  setActiveStore,
} from "@/modules/merchant/ui";

const fa = STORE_CREATE_UI_COPY_FA;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function CreateStoreClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("کرمان");
  const [province, setProvince] = useState("کرمان");
  const [latitude, setLatitude] = useState("30.2839");
  const [longitude, setLongitude] = useState("57.0834");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!SLUG_RE.test(slug.trim().toLowerCase())) {
      setError("شناسه آدرس معتبر نیست.");
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("مختصات جغرافیایی معتبر نیست.");
      return;
    }
    startTransition(async () => {
      try {
        const store = await createMerchantStore({
          slug: slug.trim().toLowerCase(),
          displayName,
          address: {
            line1,
            city,
            province,
            latitude: lat,
            longitude: lng,
          },
        });
        await setActiveStore(store.id);
        router.replace(`/stores/${encodeURIComponent(store.id)}/location`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطا در ایجاد فروشگاه.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fa.title}
        description={fa.subtitle}
        breadcrumbs={[
          { label: "فروشگاه‌ها", href: "/stores" },
          { label: fa.title },
        ]}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription aria-live="polite">{error}</AlertDescription>
        </Alert>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <FormSection title={fa.title}>
          <div className="space-y-2">
            <Label>نام فروشگاه</Label>
            <Input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>شناسه آدرس ویترین</Label>
            <Input
              dir="ltr"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>آدرس (خیابان و پلاک)</Label>
            <Input
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>شهر</Label>
              <Input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>استان</Label>
              <Input
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>عرض جغرافیایی</Label>
              <Input
                dir="ltr"
                inputMode="decimal"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>طول جغرافیایی</Label>
              <Input
                dir="ltr"
                inputMode="decimal"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? fa.submitting : fa.submit}
          </Button>
        </FormSection>
      </form>
    </div>
  );
}
