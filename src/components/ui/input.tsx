import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-slate-500",
          "transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
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
