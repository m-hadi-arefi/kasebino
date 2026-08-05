"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  applyPhoneKeypadInput,
  pasteIranianPhone,
  PHONE_LABEL_FA,
  PHONE_PLACEHOLDER_FA,
} from "./iranian-defaults";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "backspace"] as const;

export type PhoneKeypadProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (nationalDraft: string) => void;
  label?: string;
  className?: string;
  id?: string;
};

/**
 * Large-digit Iranian mobile keypad for POS / OTP capture.
 * Touch keys ≥44px; paste supports 09… / +98….
 */
export function PhoneKeypad({
  value,
  defaultValue = "",
  onChange,
  label = PHONE_LABEL_FA,
  className,
  id = "phone-keypad",
}: PhoneKeypadProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const draft = value ?? internal;

  function setDraft(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  function onKey(key: (typeof KEYS)[number]) {
    if (key === "clear") {
      setDraft(applyPhoneKeypadInput(draft, "clear"));
      return;
    }
    if (key === "backspace") {
      setDraft(applyPhoneKeypadInput(draft, "backspace"));
      return;
    }
    setDraft(applyPhoneKeypadInput(draft, key));
  }

  return (
    <div className={cn("flex w-full max-w-sm flex-col gap-3", className)} dir="rtl">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          inputMode="tel"
          autoComplete="tel"
          placeholder={PHONE_PLACEHOLDER_FA}
          value={draft}
          onChange={(event) => setDraft(pasteIranianPhone(event.target.value))}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (text) {
              event.preventDefault();
              setDraft(pasteIranianPhone(text));
            }
          }}
          aria-label={label}
        />
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={label}>
        {KEYS.map((key) => {
          const labelText =
            key === "backspace" ? "⌫" : key === "clear" ? "پاک" : key;
          return (
            <Button
              key={key}
              type="button"
              variant={key === "clear" ? "outline" : "secondary"}
              className="min-h-11 text-base tabular-nums"
              onClick={() => onKey(key)}
              aria-label={
                key === "backspace"
                  ? "پاک کردن رقم"
                  : key === "clear"
                    ? "پاک کردن همه"
                    : `رقم ${key}`
              }
            >
              {labelText}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
