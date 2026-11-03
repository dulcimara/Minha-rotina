import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Lista de opções do próprio celular: mais fácil de usar com o dedo. */
export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base md:text-sm shadow-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
NativeSelect.displayName = "NativeSelect";
