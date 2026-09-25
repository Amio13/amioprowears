"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Slide-in panel (menu, cart drawer, mobile order summary). Built on the native
 * <dialog>, which gives us focus trapping, Esc to close and a backdrop for free.
 */
export function Sheet({
  open,
  onClose,
  title,
  side = "right",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right" | "bottom";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const position = {
    left: "mr-auto h-full max-h-none w-[85vw] max-w-sm",
    right: "ml-auto h-full max-h-none w-[85vw] max-w-sm",
    bottom: "mt-auto w-full max-w-none rounded-t-2xl max-h-[85vh]",
  }[side];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className={cn("m-0 bg-transparent p-0", position)}
    >
      <div className="flex h-full flex-col overflow-y-auto bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="text-base font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-strong"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 p-4">{children}</div>
      </div>
    </dialog>
  );
}
