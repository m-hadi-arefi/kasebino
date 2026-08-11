"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/composites/loading-state";
import Link from "next/link";

type CrmTag = {
  id: string;
  name: string;
  color: string;
};

export default function CustomerTagsPage() {
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("blue");
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ["crm", "tags"],
    queryFn: async (): Promise<CrmTag[]> => {
      const res = await fetch("/api/v1/crm/tags");
      if (!res.ok) return [];
      const data = await res.json();
      return data.tags ?? [];
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (payload: { name: string; color: string }) => {
      const res = await fetch("/api/v1/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("خطا در ایجاد برچسب");
      return res.json();
    },
    onSuccess: () => {
      setTagName("");
      queryClient.invalidateQueries({ queryKey: ["crm", "tags"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    createTagMutation.mutate({ name: tagName.trim(), color: tagColor });
  };

  return (
    <div className="flex flex-col gap-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مدیریت برچسب‌های مشتریان</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ایجاد و دسته‌بندی برچسب‌های سفارشی (مانند VIP، خرید عمده، بدحساب)
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/customers">بازگشت به لیست مشتریان</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">تعریف برچسب جدید</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">عنوان برچسب</Label>
                <Input
                  id="tag-name"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="مثلاً: مشتری VIP، عمده‌فروش"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag-color">رنگ نمایش</Label>
                <select
                  id="tag-color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md bg-background text-foreground"
                >
                  <option value="blue">آبی</option>
                  <option value="green">سبز</option>
                  <option value="amber">نارنجی / طلایی</option>
                  <option value="rose">قرمز</option>
                  <option value="purple">بنفش</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={createTagMutation.isPending || !tagName.trim()}
                className="mt-2"
              >
                {createTagMutation.isPending ? "در حال ثبت..." : "ثبت برچسب جدید"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">لیست برچسب‌های تعریف‌شده</CardTitle>
          </CardHeader>
          <CardContent>
            {tagsQuery.isLoading ? (
              <LoadingState rows={3} label="در حال دریافت برچسب‌ها..." />
            ) : null}

            {!tagsQuery.isLoading && (tagsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                هنوز برچسبی تعریف نشده است.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {(tagsQuery.data ?? []).map((t) => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className="text-base px-4 py-2 flex items-center gap-2 border"
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-${t.color}-500 inline-block`}
                  />
                  {t.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
