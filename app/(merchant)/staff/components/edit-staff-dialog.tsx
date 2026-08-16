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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { RoleItem } from "./role-builder-dialog";
import { Edit2, Shield, Store } from "lucide-react";

type StoreItem = {
  id: string;
  name: string;
};

export function EditStaffDialog({
  staffMember,
  trigger,
  onUpdated,
}: {
  staffMember: {
    id: string;
    authUserId: string;
    role: string;
    roleIds?: string[];
    storeScopes: string[];
  };
  trigger?: React.ReactNode;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
  const [availableStores, setAvailableStores] = useState<StoreItem[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const initialRoles =
        staffMember.roleIds && staffMember.roleIds.length > 0
          ? staffMember.roleIds
          : staffMember.role
            ? [staffMember.role]
            : [];
      setSelectedRoleIds(initialRoles);
      setSelectedStoreIds(staffMember.storeScopes ?? []);

      // Load roles
      fetch("/api/v1/roles")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) setAvailableRoles(json.data);
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
  }, [open, staffMember]);

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
        description: "حداقل یک نقش باید برای کارمند انتخاب شود.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/staff/${staffMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRoleIds[0],
          roleIds: selectedRoleIds,
          storeIds: selectedStoreIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در ویرایش دسترسی کارمند");
      }

      toast({
        title: "عملیات موفق",
        description: "دسترسی‌های کارمند با موفقیت بروزرسانی شد.",
      });
      setOpen(false);
      onUpdated();
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
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1">
            <Edit2 className="size-3.5" />
            ویرایش دسترسی‌ها
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Shield className="size-5 text-primary" />
              ویرایش نقش و دسترسی‌های کارمند
            </DialogTitle>
            <DialogDescription>
              نقش‌ها و فروشگاه‌های مجاز برای این کارمند را مشخص کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Roles selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span>انتخاب نقش‌ها *</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedRoleIds.length} نقش انتخاب شده
                </span>
              </Label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto rounded-lg border p-2 bg-muted/20">
                {availableRoles.map((r) => {
                  const isChecked =
                    selectedRoleIds.includes(r.id) ||
                    (r.code !== null && r.code !== undefined && selectedRoleIds.includes(r.code));
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRole(r.code || r.id)}
                      className={`flex items-center justify-between rounded-md border p-2.5 transition-colors cursor-pointer ${
                        isChecked
                          ? "border-primary/40 bg-primary/5 shadow-xs"
                          : "bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id={`role-${r.id}`}
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

            {/* Store scope selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Store className="size-4 text-muted-foreground" />
                  محدوده شعب و فروشگاه‌ها
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedStoreIds.length === 0
                    ? "همه فروشگاه‌ها"
                    : `${selectedStoreIds.length} فروشگاه انتخاب شده`}
                </span>
              </Label>
              {availableStores.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  فروشگاهی تعریف نشده یا کارمند به تمام شعب دسترسی دارد.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto rounded-lg border p-2 bg-muted/20">
                  <div
                    onClick={() => setSelectedStoreIds([])}
                    className={`flex items-center gap-2.5 rounded-md border p-2 transition-colors cursor-pointer ${
                      selectedStoreIds.length === 0
                        ? "border-primary/40 bg-primary/5"
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id="store-all"
                      checked={selectedStoreIds.length === 0}
                      onCheckedChange={() => setSelectedStoreIds([])}
                    />
                    <label htmlFor="store-all" className="text-xs font-semibold cursor-pointer">
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
                          id={`store-${st.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleStore(st.id)}
                        />
                        <label
                          htmlFor={`store-${st.id}`}
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
              {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
