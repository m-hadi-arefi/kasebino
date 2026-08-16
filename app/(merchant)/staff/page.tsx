"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { InviteStaffDialog } from "./components/invite-staff-dialog";
import { RoleBuilderDialog, type RoleItem } from "./components/role-builder-dialog";
import { EditStaffDialog } from "./components/edit-staff-dialog";
import { Users, Shield, Store, Trash2, Edit } from "lucide-react";

type Staff = {
  id: string;
  merchantId: string;
  authUserId: string;
  role: string;
  roleIds?: string[];
  status: string;
  storeScopes: string[];
};

type StoreItem = {
  id: string;
  name: string;
};

const SYSTEM_ROLE_MAP: Record<string, string> = {
  merchant_owner: "صاحب کسب‌وکار",
  store_manager: "مدیر فروشگاه",
  store_employee: "صندوقدار / کارمند",
  customer: "مشتری",
  platform_admin: "مدیر کل پلتفرم",
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "فعال", variant: "default" },
  pending: { label: "در انتظار تایید", variant: "secondary" },
  deactivated: { label: "غیرفعال", variant: "destructive" },
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const { toast } = useToast();

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch("/api/v1/staff");
      const json = await res.json();
      if (json.data) {
        setStaff(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch("/api/v1/roles");
      const json = await res.json();
      if (json.data) {
        setRoles(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadStores = async () => {
    try {
      const res = await fetch("/api/v1/stores");
      const json = await res.json();
      if (json.data) {
        setStores(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStaff();
    loadRoles();
    loadStores();
  }, []);

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeIds: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "خطا در بروزرسانی وضعیت کارمند");
      }
      loadStaff();
      toast({
        title: "عملیات موفق",
        description: "وضعیت کارمند بروزرسانی شد.",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: err instanceof Error ? err.message : "خطای غیرمنتظره",
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("آیا از حذف این نقش سفارشی اطمینان دارید؟")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/roles/${roleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "خطا در حذف نقش");
      }
      toast({
        title: "عملیات موفق",
        description: "نقش سفارشی با موفقیت حذف شد.",
      });
      loadRoles();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: err instanceof Error ? err.message : "خطای غیرمنتظره",
      });
    }
  };

  const getRoleName = (roleIdOrCode: string): string => {
    if (SYSTEM_ROLE_MAP[roleIdOrCode]) {
      return SYSTEM_ROLE_MAP[roleIdOrCode];
    }
    const found = roles.find((r) => r.id === roleIdOrCode || r.code === roleIdOrCode);
    return found ? found.name : roleIdOrCode;
  };

  const getStoreName = (storeId: string): string => {
    const found = stores.find((s) => s.id === storeId);
    return found ? found.name : storeId.slice(0, 8);
  };

  return (
    <div className="flex-1 space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            مدیریت دسترسی‌ها و کارکنان
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            تعریف نقش‌های سفارشی و تخصیص دسترسی‌های گرانولار برای کارکنان و شعب فروشگاه
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleBuilderDialog onSaved={loadRoles} />
          <InviteStaffDialog onInviteSuccess={loadStaff} />
        </div>
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="staff" className="gap-2">
            <Users className="size-4" />
            کارکنان ({staff.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="size-4" />
            نقش‌ها و دسترسی‌ها ({roles.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Staff Members */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">فهرست کارکنان</CardTitle>
                <CardDescription>
                  کاربرانی که به عنوان کارمند یا مدیر در فروشگاه شما عضویت دارند
                </CardDescription>
              </div>
              <InviteStaffDialog onInviteSuccess={loadStaff} />
            </CardHeader>
            <CardContent>
              {loadingStaff ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  در حال بارگذاری اطلاعات کارکنان...
                </div>
              ) : staff.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-muted-foreground mb-4">هنوز کارمندی اضافه نکرده‌اید.</p>
                  <InviteStaffDialog onInviteSuccess={loadStaff} />
                </div>
              ) : (
                <div className="rounded-xl border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-right font-bold">شناسه کاربری</TableHead>
                        <TableHead className="text-right font-bold">نقش‌های تخصیص‌یافته</TableHead>
                        <TableHead className="text-right font-bold">محدوده شعب</TableHead>
                        <TableHead className="text-right font-bold">وضعیت</TableHead>
                        <TableHead className="text-left font-bold">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((s) => {
                        const assignedRoles =
                          s.roleIds && s.roleIds.length > 0
                            ? s.roleIds
                            : s.role
                              ? [s.role]
                              : [];
                        const statusConfig = statusMap[s.status] || {
                          label: s.status,
                          variant: "secondary",
                        };

                        return (
                          <TableRow key={s.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {s.authUserId}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {assignedRoles.map((rId) => (
                                  <Badge key={rId} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                    <Shield className="size-3 ml-1" />
                                    {getRoleName(rId)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {s.storeScopes.length === 0 ? (
                                <Badge variant="secondary" className="text-xs">
                                  تمام فروشگاه‌ها
                                </Badge>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {s.storeScopes.map((stId) => (
                                    <Badge key={stId} variant="outline" className="text-xs gap-1">
                                      <Store className="size-3" />
                                      {getStoreName(stId)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig.variant}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex items-center justify-end gap-2">
                                <EditStaffDialog
                                  staffMember={{
                                    id: s.id,
                                    authUserId: s.authUserId,
                                    role: s.role,
                                    roleIds: s.roleIds,
                                    storeScopes: s.storeScopes,
                                  }}
                                  onUpdated={loadStaff}
                                />
                                {s.status !== "deactivated" && s.role !== "merchant_owner" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleDeactivate(s.id)}
                                  >
                                    غیرفعال‌سازی
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Roles and Permissions */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">نقش‌ها و سطوح دسترسی</CardTitle>
                <CardDescription>
                  نقش‌های پیش‌فرض سامانه و نقش‌های سفارشی تعریف‌شده برای این فروشگاه
                </CardDescription>
              </div>
              <RoleBuilderDialog onSaved={loadRoles} />
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  در حال بارگذاری نقش‌ها...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="rounded-xl border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">
                              {role.name}
                            </span>
                            <Badge variant={role.isSystem ? "secondary" : "default"} className="text-[10px]">
                              {role.isSystem ? "نقش سیستمی" : "نقش سفارشی"}
                            </Badge>
                          </div>
                          {role.description && (
                            <p className="text-xs text-muted-foreground">
                              {role.description}
                            </p>
                          )}
                        </div>
                        {!role.isSystem && (
                          <div className="flex items-center gap-1">
                            <RoleBuilderDialog
                              initialRole={role}
                              trigger={
                                <Button variant="ghost" size="icon" className="size-8">
                                  <Edit className="size-4" />
                                </Button>
                              }
                              onSaved={loadRoles}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                          <span>دسترسی‌های فعال ({role.permissions.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {role.permissions.map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="text-[10px] font-mono bg-muted/30"
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
