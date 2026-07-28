import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { HTMLAttributes } from "react";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 px-8 text-center",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-offwhite flex items-center justify-center">
          <Icon className="h-5 w-5 text-grey" strokeWidth={1.5} />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-charcoal">{title}</p>
        {description && (
          <p className="text-sm text-grey max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
