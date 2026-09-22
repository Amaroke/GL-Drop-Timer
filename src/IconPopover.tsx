import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type IconPopoverProps = {
  label: string;
  align: "left" | "right";
  icon: ReactNode;
  children: ReactNode;
};

export function IconPopover({ label, align, icon, children }: IconPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
      >
        {icon}
      </button>
      {isOpen && (
        <div
          id={panelId}
          ref={panelRef}
          className={`absolute top-full left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0a0716] p-3 text-left shadow-xl sm:left-auto sm:translate-x-0 ${
            align === "right" ? "sm:right-0" : "sm:left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
