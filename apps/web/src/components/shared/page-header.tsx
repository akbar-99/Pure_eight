import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 mb-6", className)}
      {...props}
    >
      <div>
        <h1 className="text-2xl font-bold text-black leading-none">{title}</h1>
        {subtitle && (
          <p className="text-sm text-grey mt-1.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
