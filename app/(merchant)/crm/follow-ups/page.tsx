"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/composites/loading-state";
import { ErrorState } from "@/components/composites/error-state";
import { MerchantCrmProviders } from "../../customers/crm-providers";
import Link from "next/link";

export const dynamic = "force-dynamic";

type FollowUp = {
  id: string;
  customerId: string;
  assigneeName: string;
  description: string;
  dueDate: string;
  status: "OPEN" | "DONE" | "CANCELLED";
};

function FollowUpsContent() {
  const queryClient = useQueryClient();

  const followUpsQuery = useQuery({
    queryKey: ["crm", "follow-ups"],
    queryFn: async (): Promise<FollowUp[]> => {
      const res = await fetch("/api/v1/crm/follow-ups");
      if (!res.ok) return [];
      const data = await res.json();
      return data.followUps ?? [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "OPEN" | "DONE" | "CANCELLED";
    }) => {
      const res = await fetch(`/api/v1/crm/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("خطا در تغییر وضعیت پیگیری");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مدیریت پیگیری‌های مشتریان</h1>
          <p className="text-sm text-muted-foreground mt-1">
            لیست وظایف، تماس‌های پیگیری و یادآوری‌های تخصیص داده شده به همکاران
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/crm">بازگشت به داشبورد CRM</Link>
        </Button>
      </div>

      {followUpsQuery.isLoading ? (
        <LoadingState rows={3} label="در حال دریافت لیست پیگیری‌ها..." />
      ) : null}

      {followUpsQuery.isError ? (
        <ErrorState title="خطا در دریافت اطلاعات پیگیری‌ها" />
      ) : null}

      {!followUpsQuery.isLoading && (followUpsQuery.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            هیچ پیگیری فعالی ثبت نشده است.
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {(followUpsQuery.data ?? []).map((f) => (
          <Card key={f.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      f.status === "DONE"
                        ? "default"
                        : f.status === "CANCELLED"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {f.status === "DONE"
                      ? "تکمیل شده"
                      : f.status === "CANCELLED"
                        ? "لغو شده"
                        : "در انتظار اقدام"}
                  </Badge>
                  <span className="font-medium">{f.description}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  مسئول: {f.assigneeName} · مهلت:{" "}
                  {new Date(f.dueDate).toLocaleDateString("fa-IR")}
                </p>
              </div>

              {f.status === "OPEN" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatusMutation.mutate({ id: f.id, status: "DONE" })
                    }
                  >
                    علامت‌گذاری به‌عنوان انجام‌شده
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function FollowUpsPage() {
  return (
    <MerchantCrmProviders>
      <FollowUpsContent />
    </MerchantCrmProviders>
  );
}
