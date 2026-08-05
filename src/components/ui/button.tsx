import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
          variant === "default" && "bg-indigo-600 text-white hover:bg-indigo-500",
          variant === "secondary" && "bg-slate-800 text-white hover:bg-slate-700",
          variant === "outline" && "border border-slate-700 text-slate-200 hover:bg-slate-800",
          variant === "ghost" && "text-slate-200 hover:bg-slate-800",
          size === "default" && "h-10 px-5",
          size === "sm" && "h-8 px-3 text-sm",
          size === "lg" && "h-12 px-8 text-lg",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };