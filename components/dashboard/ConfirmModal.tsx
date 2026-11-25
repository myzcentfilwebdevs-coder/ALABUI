"use client";

import { CloseIcon, TrashIcon } from "@/components/icons";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="dash-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-rose-400/40 shadow-[0_20px_50px_-12px_rgba(244,63,94,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-rose-400/20 bg-gradient-to-r from-[#2c0a1d] via-[#1b0c2e] to-[#081540] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/45 shadow-[0_0_16px_rgba(244,63,94,0.35)]">
              <TrashIcon className="h-5 w-5" />
            </span>
            <h3 id="confirm-modal-title" className="text-base font-bold text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Close confirmation"
            className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <p className="text-sm leading-relaxed text-blue-100/90">{message}</p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-blue-400/25 bg-blue-950/70 px-4 py-2 text-xs font-semibold text-blue-200 transition hover:bg-blue-900/70 hover:text-white disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] transition hover:from-rose-500 hover:to-red-400 disabled:opacity-60"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {busy ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
