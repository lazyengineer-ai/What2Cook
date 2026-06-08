import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          default: "bg-primary text-primary-foreground",
          secondary: "bg-secondary text-secondary-foreground",
          success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
          destructive: "bg-destructive/10 text-destructive",
          outline: "border border-input text-foreground",
        }[variant],
        className
      )}
      {...props}
    />
  );
}
