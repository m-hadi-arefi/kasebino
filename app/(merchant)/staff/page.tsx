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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteStaffDialog } from "./components/invite-staff-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Staff = {
  id: string;
  authUserId: string;
  role: string;
  status: string;
  storeScopes: string[];
};

const roleMap: Record<string, string> = {
  merchant_owner: "صاحب کسب‌وکار",
  store_manager: "مدیر فروشگاه",
  store_employee: "صندوقدار",
};

const statusMap: Record<string, string> = {
  active: "فعال",
  pending: "در انتظار",
  deactivated: "غیرفعال",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff");
      const json = await res.json();
      if (json.data) {
        setStaff(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/staff/${id}/deactivate`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "خطا در غیرفعال‌سازی");
      }
      toast({
        title: "عملیات موفق",
        description: "کارمند با موفقیت غیرفعال شد.",
      });
      loadStaff();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: err.message,
      });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" dir="rtl">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">مدیریت کارمندان</h2>
        <div className="flex items-center space-x-2 space-x-reverse">
          <InviteStaffDialog onInviteSuccess={loadStaff} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست کارمندان شما</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">در حال بارگذاری...</p>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground mb-4">هنوز کارمندی اضافه نکرده‌اید.</p>
              <InviteStaffDialog onInviteSuccess={loadStaff} />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">شناسه کاربر</TableHead>
                    <TableHead className="text-right">نقش</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-left dir-ltr">
                        {s.authUserId}
                      </TableCell>
                      <TableCell>{roleMap[s.role] || s.role}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "active" ? "default" : "secondary"}>
                          {statusMap[s.status] || s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.status !== "deactivated" && s.role !== "merchant_owner" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeactivate(s.id)}
                          >
                            غیرفعال‌سازی
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
