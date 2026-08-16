"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { RoleItem } from "./role-builder-dialog";
import { UserPlus, Store } from "lucide-react";

type StoreItem = {
  id: string;
  name: string;
};

export function InviteStaffDialog({ onInviteSuccess }: { onInviteSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
  const [availableStores, setAvailableStores] = useState<StoreItem[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setPhone("");
      setSelectedStoreIds([]);

      // Load roles
      fetch("/api/v1/roles")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setAvailableRoles(json.data);
            // Default to first employee role
            const defaultRole = json.data.find(
              (r: RoleItem) => r.code === "store_employee" || r.name.includes("کارمند") || r.name.includes("صندوق"),
            ) ?? json.data[0];
            if (defaultRole) {
              setSelectedRoleIds([defaultRole.code || defaultRole.id]);
            }
          }
        })
        .catch(console.error);

      // Load stores
      fetch("/api/v1/stores")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) setAvailableStores(json.data);
        })
        .catch(console.error);
    }
  }, [open]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleIds.length === 0) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً حداقل یک نقش برای کارمند انتخاب کنید.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          role: selectedRoleIds[0],
          roleIds: selectedRoleIds,
          storeIds: selectedStoreIds,
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
        <Button variant="default" className="gap-2">
          <UserPlus className="size-4" />
          + دعوت کارمند جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <UserPlus className="size-5 text-primary" />
              دعوت کارمند جدید
            </DialogTitle>
            <DialogDescription>
              شماره موبایل و نقش‌های سازمانی کارمند جدید را وارد نمایید.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone" className="text-right">
                شماره موبایل کارمند *
              </Label>
              <Input
                id="staff-phone"
                type="tel"
                dir="ltr"
                placeholder="09123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-left font-mono"
                required
              />
            </div>

            {/* Roles Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span>انتخاب نقش‌ها *</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedRoleIds.length} نقش انتخاب شده
                </span>
              </Label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto rounded-lg border p-2 bg-muted/20">
                {availableRoles.map((r) => {
                  const isChecked =
                    selectedRoleIds.includes(r.id) ||
                    (r.code !== null && r.code !== undefined && selectedRoleIds.includes(r.code));
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRole(r.code || r.id)}
                      className={`flex items-center justify-between rounded-md border p-2 transition-colors cursor-pointer ${
                        isChecked
                          ? "border-primary/40 bg-primary/5 shadow-xs"
                          : "bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id={`invite-role-${r.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleRole(r.code || r.id)}
                        />
                        <div>
                          <p className="text-xs font-semibold">{r.name}</p>
                          {r.description && (
                            <p className="text-[11px] text-muted-foreground">{r.description}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={r.isSystem ? "secondary" : "outline"} className="text-[10px]">
                        {r.isSystem ? "سیستمی" : "سفارشی"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Store Scopes Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Store className="size-4 text-muted-foreground" />
                  محدوده دسترسی شعب و فروشگاه‌ها
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedStoreIds.length === 0
                    ? "همه فروشگاه‌ها"
                    : `${selectedStoreIds.length} فروشگاه انتخاب شده`}
                </span>
              </Label>
              {availableStores.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  فروشگاهی تعریف نشده یا کارمند به تمام شعب دسترسی خواهد داشت.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto rounded-lg border p-2 bg-muted/20">
                  <div
                    onClick={() => setSelectedStoreIds([])}
                    className={`flex items-center gap-2.5 rounded-md border p-2 transition-colors cursor-pointer ${
                      selectedStoreIds.length === 0
                        ? "border-primary/40 bg-primary/5"
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id="invite-store-all"
                      checked={selectedStoreIds.length === 0}
                      onCheckedChange={() => setSelectedStoreIds([])}
                    />
                    <label
                      htmlFor="invite-store-all"
                      className="text-xs font-semibold cursor-pointer"
                    >
                      تمام فروشگاه‌ها (بدون محدودیت شعبه)
                    </label>
                  </div>
                  {availableStores.map((st) => {
                    const isChecked = selectedStoreIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleStore(st.id)}
                        className={`flex items-center gap-2.5 rounded-md border p-2 transition-colors cursor-pointer ${
                          isChecked
                            ? "border-primary/40 bg-primary/5"
                            : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          id={`invite-store-${st.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleStore(st.id)}
                        />
                        <label
                          htmlFor={`invite-store-${st.id}`}
                          className="text-xs font-semibold cursor-pointer"
                        >
                          {st.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "در حال ارسال..." : "ارسال دعوت‌نامه"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

