import * as React from "react";

import { cn } from "~/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "aria-invalid:outline-destructive/60 aria-invalid:ring-destructive/20 dark:aria-invalid:outline-destructive dark:aria-invalid:ring-destructive/50 aria-invalid:outline-destructive/60 dark:aria-invalid:outline-destructive dark:aria-invalid:ring-destructive/40 aria-invalid:ring-destructive/20 aria-invalid:border-destructive/60 dark:aria-invalid:border-destructive shadow-xs aria-invalid:focus-visible:ring-[3px] aria-invalid:focus-visible:outline-none dark:aria-invalid:focus-visible:ring-4 flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base outline-ring/50 ring-ring/10 transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-1 focus-visible:ring-4 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:outline-ring/40 dark:ring-ring/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
