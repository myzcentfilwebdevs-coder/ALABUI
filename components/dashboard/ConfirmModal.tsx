"use client";

import type { ReactNode } from "react";
import { CloseIcon, TrashIcon } from "@/components/icons";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  variant?: "danger" | "security";
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busyLabel = "Processing...",
  busy = false,
  variant = "danger",
  icon,
  confirmIcon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const isSecurity = variant === "security";

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
        className={`dash-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl border ${
          isSecurity
            ? "border-sky-400/45 shadow-[0_20px_50px_-12px_rgba(56,189,248,0.35)]"
            : "border-rose-400/40 shadow-[0_20px_50px_-12px_rgba(244,63,94,0.35)]"
        }`}
      >
        <div
          className={`flex items-center justify-between border-b px-5 py-4 ${
            isSecurity
              ? "border-sky-400/20 bg-gradient-to-r from-[#071f66] via-[#0a2a80] to-[#061646]"
              : "border-rose-400/20 bg-gradient-to-r from-[#2c0a1d] via-[#1b0c2e] to-[#081540]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
                isSecurity
                  ? "bg-sky-500/20 text-sky-300 ring-sky-400/45 shadow-[0_0_16px_rgba(56,189,248,0.4)]"
                  : "bg-rose-500/20 text-rose-300 ring-rose-400/45 shadow-[0_0_16px_rgba(244,63,94,0.35)]"
              }`}
            >
              {icon ?? <TrashIcon className="h-5 w-5" />}
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
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                isSecurity
                  ? "border-sky-400/40 bg-gradient-to-r from-blue-600/80 to-sky-500/80 text-white shadow-[0_0_14px_rgba(56,189,248,0.35)] hover:from-blue-500 hover:to-sky-400"
                  : "border-blue-400/25 bg-blue-950/70 text-blue-200 hover:bg-blue-900/70 hover:text-white"
              }`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] transition hover:from-rose-500 hover:to-red-400 disabled:opacity-60"
            >
              {confirmIcon ?? <TrashIcon className="h-3.5 w-3.5" />}
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
