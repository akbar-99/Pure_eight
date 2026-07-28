import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix"> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefix, suffix, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-charcoal"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-steel text-sm">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 rounded-[4px] border border-silver bg-white px-3 text-sm text-charcoal",
              "placeholder:text-grey",
              "focus:outline-none focus:border-black focus:ring-1 focus:ring-black",
              "disabled:bg-offwhite disabled:text-grey disabled:cursor-not-allowed",
              error && "border-danger focus:border-danger focus:ring-danger",
              prefix && "pl-9",
              suffix && "pr-9",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-steel text-sm">{suffix}</span>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-grey">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
