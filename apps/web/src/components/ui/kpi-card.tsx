import { cn, fmtCurrency, fmtNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "./card";

interface KpiCardProps {
  title: string;
  value: number | string;
  format?: "currency" | "number" | "text";
  delta?: number; // percentage change
  className?: string;
}

export function KpiCard({ title, value, format = "number", delta, className }: KpiCardProps) {
  const displayValue =
    typeof value === "string"
      ? value
      : format === "currency"
      ? fmtCurrency(value as number)
      : fmtNumber(value as number);

  const deltaAbs = delta !== undefined ? Math.abs(delta) : undefined;
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;

  return (
    <Card variant="elevated" className={cn("p-5", className)}>
      <p className="text-xs font-medium text-grey uppercase tracking-wide">{title}</p>
      <p
        className="mt-2 text-3xl font-bold text-black leading-none"
        style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
      >
        {displayValue}
      </p>
      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : isNegative ? (
            <TrendingDown className="h-3.5 w-3.5 text-danger" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-grey" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isPositive && "text-success",
              isNegative && "text-danger",
              !isPositive && !isNegative && "text-grey"
            )}
          >
            {deltaAbs?.toFixed(1)}% vs prev period
          </span>
        </div>
      )}
    </Card>
  );
}
