import * as React from "react"

import { cn } from "@/lib/utils"

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  dark?: boolean;
  glass?: boolean;
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, dark, glass, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        dark
          ? "bg-slate-800/50"
          : glass
            ? "bg-white/50 backdrop-blur-sm"
            : "bg-muted",
        className
      )}
      {...props}
    />
  )
);
Panel.displayName = "Panel";

export { Panel };
export type { PanelProps };
