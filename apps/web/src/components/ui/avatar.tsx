import { cn, initials } from "@/lib/utils";
import { HTMLAttributes } from "react";
import Image from "next/image";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ src, name, size = "md", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full bg-pearl border border-silver text-steel font-medium flex-shrink-0",
        sizeMap[size],
        className
      )}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? ""}
          fill
          className="rounded-full object-cover"
          sizes="48px"
        />
      ) : (
        <span>{name ? initials(name) : "?"}</span>
      )}
    </div>
  );
}
