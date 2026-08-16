"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, KeyRound } from "lucide-react";
import type { Permission } from "@/rbac";

type RoleSummary = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isSystem: boolean;
  permissions: Permission[];
};

type StaffSummary = {
  id: string;
  authUserId: string;
  role: string;
  roleIds?: string[];
  status: string;
  storeScopes: string[];
};

export function AdminMerchantAccessDialog({
  merchantId,
  merchantName,
}: {
  merchantId: string;
  merchantName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [staff, setStaff] = useState<StaffSummary[]>([]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([
        fetch(`/api/v1/admin/merchants/${merchantId}/roles`).then((r) => r.json()),
        fetch(`/api/v1/admin/merchants/${merchantId}/staff`).then((r) => r.json()),
      ])
        .then(([rolesRes, staffRes]) => {
          if (rolesRes.data) setRoles(rolesRes.data);
          if (staffRes.data) setStaff(staffRes.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, merchantId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 gap-1.5">
          <KeyRound className="size-4" />
          دسترسی‌ها و نقش‌ها
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Shield className="size-5 text-primary" />
            مدیریت دسترسی‌های فروشگاه: {merchantName}
          </DialogTitle>
          <DialogDescription>
            مشاهده نقش‌های سفارشی، سیستمی و کارکنان عضو این فروشنده در سطح پلتفرم
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            در حال بارگذاری اطلاعات دسترسی‌ها...
          </div>
        ) : (
          <Tabs defaultValue="roles" className="space-y-4 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="size-4" />
                نقش‌ها و دسترسی‌ها ({roles.length})
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-2">
                <Users className="size-4" />
                کارکنان ({staff.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roles.map((r) => (
                  <div key={r.id} className="rounded-xl border p-3 bg-card space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{r.name}</span>
                      <Badge variant={r.isSystem ? "secondary" : "outline"} className="text-[10px]">
                        {r.isSystem ? "سیستمی" : "سفارشی"}
                      </Badge>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    )}
                    <div className="pt-1.5 border-t">
                      <p className="text-[11px] text-muted-foreground mb-1">
                        دسترسی‌ها ({r.permissions.length}):
                      </p>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {r.permissions.map((p) => (
                          <Badge key={p} variant="outline" className="text-[9px] font-mono">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="staff" className="space-y-3">
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-right">شناسه کاربر</TableHead>
                      <TableHead className="text-right">نقش‌ها</TableHead>
                      <TableHead className="text-right">وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                          کارمندی برای این فروشگاه ثبت نشده است.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staff.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.authUserId}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(s.roleIds || [s.role]).map((rId) => (
                                <Badge key={rId} variant="outline" className="text-xs">
                                  {rId}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.status === "active" ? "default" : "secondary"}>
                              {s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
