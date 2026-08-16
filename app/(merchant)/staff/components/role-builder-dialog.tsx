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
import type { Permission } from "@/rbac";
import { Shield, CheckSquare, Square } from "lucide-react";

export type RoleItem = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isSystem: boolean;
  permissions: Permission[];
};

type PermissionMeta = {
  key: Permission;
  domain: string;
  domainLabelFa: string;
  labelFa: string;
  descriptionFa: string;
};

type DomainMeta = {
  key: string;
  labelFa: string;
  descriptionFa: string;
};

export function RoleBuilderDialog({
  initialRole,
  trigger,
  onSaved,
}: {
  initialRole?: RoleItem | null;
  trigger?: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState(initialRole?.name ?? "");
  const [description, setDescription] = useState(initialRole?.description ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    initialRole?.permissions ?? [],
  );

  const [domains, setDomains] = useState<Record<string, DomainMeta>>({});
  const [permissions, setPermissions] = useState<PermissionMeta[]>([]);

  useEffect(() => {
    if (open) {
      setName(initialRole?.name ?? "");
      setDescription(initialRole?.description ?? "");
      setSelectedPermissions(initialRole?.permissions ?? []);

      fetch("/api/v1/permissions")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setDomains(json.data.domains || {});
            setPermissions(json.data.permissions || []);
          }
        })
        .catch(console.error);
    }
  }, [open, initialRole]);

  const togglePermission = (key: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const toggleDomain = (domainKey: string) => {
    const domainPerms = permissions.filter((p) => p.domain === domainKey).map((p) => p.key);
    const allSelected = domainPerms.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !domainPerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...domainPerms])));
    }
  };

  const selectAll = () => {
    setSelectedPermissions(permissions.map((p) => p.key));
  };

  const deselectAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً نام نقش را وارد کنید.",
      });
      return;
    }
    if (selectedPermissions.length === 0) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً حداقل یک دسترسی انتخاب کنید.",
      });
      return;
    }

    setLoading(true);
    try {
      const isEdit = !!initialRole?.id;
      const url = isEdit ? `/api/v1/roles/${initialRole.id}` : "/api/v1/roles";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در ذخیره نقش");
      }

      toast({
        title: "عملیات موفق",
        description: isEdit ? "نقش با موفقیت ویرایش شد." : "نقش جدید با موفقیت ایجاد شد.",
      });
      setOpen(false);
      onSaved();
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

  // Group permissions by domain
  const permissionsByDomain = Object.keys(domains).map((domKey) => {
    const domainMeta = domains[domKey];
    const items = permissions.filter((p) => p.domain === domKey);
    const domainSelectedCount = items.filter((p) => selectedPermissions.includes(p.key)).length;
    return {
      domainMeta,
      items,
      domainSelectedCount,
      allSelected: items.length > 0 && domainSelectedCount === items.length,
    };
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default" className="gap-2">
            <Shield className="size-4" />
            + تعریف نقش جدید
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Shield className="size-5 text-primary" />
              {initialRole ? `ویرایش نقش: ${initialRole.name}` : "ایجاد نقش سفارشی جدید"}
            </DialogTitle>
            <DialogDescription>
              دسترسی‌های مورد نظر را برای این نقش انتخاب کنید. می‌توانید کارمندان را به این نقش اختصاص دهید.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">نام نقش *</Label>
                <Input
                  id="role-name"
                  placeholder="مثال: اپراتور فروش، حسابدار ارشد، بازاریاب"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-desc">توضیحات (اختیاری)</Label>
                <Input
                  id="role-desc"
                  placeholder="توضیح مختصر درباره وظایف این نقش"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">مجموع دسترسی‌ها:</span>
                <Badge variant="secondary">{selectedPermissions.length} دسترسی انتخاب شده</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  انتخاب همه
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                  لغو انتخاب همه
                </Button>
              </div>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {permissionsByDomain.map(({ domainMeta, items, domainSelectedCount, allSelected }) => {
                if (items.length === 0) return null;
                return (
                  <div key={domainMeta.key} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {domainMeta.labelFa}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({domainSelectedCount} از {items.length})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => toggleDomain(domainMeta.key)}
                      >
                        {allSelected ? (
                          <>
                            <CheckSquare className="size-3.5 text-primary" />
                            لغو انتخاب دسته
                          </>
                        ) : (
                          <>
                            <Square className="size-3.5" />
                            انتخاب همه این دسته
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item) => {
                        const isChecked = selectedPermissions.includes(item.key);
                        return (
                          <div
                            key={item.key}
                            onClick={() => togglePermission(item.key)}
                            className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors cursor-pointer ${
                              isChecked
                                ? "border-primary/40 bg-primary/5 shadow-xs"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              id={`perm-${item.key}`}
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(item.key)}
                              className="mt-0.5"
                            />
                            <div className="space-y-0.5 text-right">
                              <label
                                htmlFor={`perm-${item.key}`}
                                className="text-xs font-semibold leading-none cursor-pointer"
                              >
                                {item.labelFa}
                              </label>
                              <p className="text-[11px] text-muted-foreground">
                                {item.descriptionFa}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "در حال ذخیره..." : initialRole ? "ذخیره تغییرات" : "ایجاد نقش"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
