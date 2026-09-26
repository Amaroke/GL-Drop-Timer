import { useContext, useId, type ReactNode } from "react";
import { TooltipsEnabledContext } from "../hooks/useTooltipsSetting";

type TooltipProps = {
  text: string;
  className?: string;
  align?: "left" | "right";
  children: (tooltipId: string | undefined) => ReactNode;
};

export function Tooltip({ text, className = "", align = "right", children }: TooltipProps) {
  const tooltipId = useId();
  const enabled = useContext(TooltipsEnabledContext);
  if (!enabled) return <span className={className}>{children(undefined)}</span>;
  return (
    <span className={`group relative ${className}`}>
      {children(tooltipId)}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none invisible absolute ${align === "left" ? "left-0" : "right-0"} top-full z-10 mt-1 w-max max-w-56 rounded-lg border border-white/15 bg-[#120c24] px-2 py-1 text-xs text-white group-focus-within:visible group-hover:visible`}
      >
        {text}
      </span>
    </span>
  );
}
