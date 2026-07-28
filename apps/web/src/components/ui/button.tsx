import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[4px] text-sm font-medium leading-none transition-all duration-150 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-black text-white hover:bg-charcoal active:bg-graphite",
        secondary:
          "bg-white text-black border border-black hover:bg-pearl active:bg-offwhite",
        tertiary:
          "bg-transparent text-black hover:bg-pearl active:bg-offwhite",
        destructive:
          "bg-white text-danger border border-danger hover:bg-red-50 active:bg-red-100",
        ghost:
          "bg-transparent text-steel hover:bg-pearl active:bg-offwhite hover:text-black",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
