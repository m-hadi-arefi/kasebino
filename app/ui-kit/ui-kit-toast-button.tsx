"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function UiKitToastButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => toast.success("عملیات با موفقیت انجام شد")}
    >
      نمایش اعلان
    </Button>
  );
}
