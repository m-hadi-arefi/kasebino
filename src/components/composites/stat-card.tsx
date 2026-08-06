import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StatCardProps = {
  title: string;
  value: ReactNode;
  description?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("shadow-sm transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon ? (
          <Icon className="size-4 text-primary" aria-hidden />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
        {trend ? (
          <p className="text-xs font-medium text-primary">{trend}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
