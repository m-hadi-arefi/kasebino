"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function InviteStaffDialog({ onInviteSuccess }: { onInviteSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("store_employee");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          role,
          storeIds: [], // MVP: full merchant access or handled server side by default if empty
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در دعوت کارمند");

      toast({
        title: "عملیات موفق",
        description: "کارمند جدید با موفقیت دعوت شد.",
      });
      setOpen(false);
      onInviteSuccess();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: err instanceof Error ? err.message : "خطای غیرمنتظره",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">+ دعوت کارمند جدید</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>دعوت کارمند جدید</DialogTitle>
            <DialogDescription>
              برای افزودن کارمند به کاسبینو، شماره موبایل و نقش او را وارد کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                شماره موبایل
              </Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                placeholder="09123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3 text-left"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                نقش
              </Label>
              <div className="col-span-3">
                <Select value={role} onValueChange={setRole} dir="rtl">
                  <SelectTrigger id="role">
                    <SelectValue placeholder="انتخاب نقش" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_manager">مدیر فروشگاه</SelectItem>
                    <SelectItem value="store_employee">صندوقدار / کارمند</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "در حال ارسال..." : "ارسال دعوت‌نامه"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
