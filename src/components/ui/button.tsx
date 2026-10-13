import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold tracking-tight",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-glow-sm hover:from-indigo-400 hover:to-indigo-500 hover:shadow-glow",
          variant === "secondary" &&
            "bg-white/5 text-white ring-1 ring-inset ring-white/10 hover:bg-white/10",
          variant === "outline" &&
            "border border-slate-700 bg-transparent text-slate-200 hover:border-slate-500 hover:bg-white/5",
          variant === "ghost" && "text-slate-300 hover:bg-white/5 hover:text-white",
          size === "default" && "h-10 px-5",
          size === "sm" && "h-9 px-3.5 text-sm",
          size === "lg" && "h-12 px-8 text-base",
          size === "icon" && "h-10 w-10",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
