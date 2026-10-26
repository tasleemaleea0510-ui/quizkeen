import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white backdrop-blur placeholder:text-slate-500",
          "transition-colors focus:border-indigo-400/70 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
