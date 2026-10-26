import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

/**
 * The one button in the app.
 *
 * The solid variant is the front page's "Skapa konto": an indigo-to-violet
 * gradient with a hairline of light along the top and a coloured shadow under
 * it, so every call to action in the app reads as the same physical key.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold tracking-tight",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-gradient-to-b from-indigo-500 to-violet-600 text-white shadow-[0_10px_26px_-12px_rgba(99,102,241,0.9)] ring-1 ring-inset ring-white/15 hover:from-indigo-400 hover:to-violet-500 hover:shadow-[0_14px_32px_-12px_rgba(99,102,241,1)]",
          variant === "secondary" &&
            "border border-white/10 bg-white/[0.06] text-slate-100 backdrop-blur hover:border-white/20 hover:bg-white/[0.1]",
          variant === "outline" &&
            "border border-white/15 bg-transparent text-slate-200 hover:border-indigo-300/50 hover:bg-white/[0.06]",
          variant === "ghost" && "text-slate-300 hover:bg-white/5 hover:text-white",
          size === "default" && "h-10 px-5",
          size === "sm" && "h-9 px-3.5 text-sm",
          size === "lg" && "h-12 px-7 text-base",
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
