import { useEffect, useRef } from "react";
import { X, Droplets } from "lucide-react";

interface PrecipitateModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: string;
}

export default function PrecipitateModal({
  isOpen,
  onClose,
  info,
}: PrecipitateModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleFocusTrap = (e: FocusEvent) => {
      if (!modalRef.current) return;
      if (!modalRef.current.contains(e.target as Node)) {
        e.stopPropagation();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("focus", handleFocusTrap, true);

    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("focus", handleFocusTrap, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="precipitate-modal-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-400" />
            <h3 id="precipitate-modal-title" className="text-lg font-bold text-slate-100">
              沉淀信息
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="关闭沉淀信息"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm text-slate-200 leading-relaxed">{info}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
