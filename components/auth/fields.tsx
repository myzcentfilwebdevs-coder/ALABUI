"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ClipboardEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, EyeIcon, EyeOffIcon } from "@/components/icons";

const emptySubscribe = () => () => {};
function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  error?: string;
};

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  icon?: ReactNode;
  error?: string;
  placeholder?: string;
  options: readonly string[];
};

function inputClass(error: string | undefined, hasIcon: boolean, extra = "") {
  return [
    "block w-full rounded-lg border bg-[#eef2fb] py-1.5 text-xs text-slate-900 xl:py-2 xl:text-sm",
    "placeholder:text-slate-500 transition focus:bg-white focus:outline-none focus:ring-4",
    hasIcon ? "pl-8 xl:pl-10" : "pl-3 xl:pl-3.5",
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-transparent focus:border-blue-500 focus:ring-blue-100",
    extra || "pr-2.5 xl:pr-3.5",
  ].join(" ");
}

function FieldIcon({ icon }: { icon?: ReactNode }) {
  if (!icon) return null;
  return (
    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-[#0b2a6b] xl:w-10">
      {icon}
    </span>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-0.5 pl-1 text-[10px] leading-tight text-red-600 sm:text-xs">{error}</p> : null;
}

export function TextField({ label, icon, error, id, name, placeholder, className, ...props }: FieldProps) {
  const inputId = id ?? name ?? label;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <FieldIcon icon={icon} />
        <input
          id={inputId}
          name={name}
          placeholder={placeholder ?? label}
          aria-invalid={!!error}
          suppressHydrationWarning
          className={inputClass(error, !!icon)}
          {...props}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function SelectField({
  label,
  icon,
  error,
  id,
  name,
  placeholder,
  options,
  value,
  onChange,
  disabled,
  className,
}: SelectFieldProps) {
  const selectId = id ?? name ?? label;
  const currentVal = typeof value === "string" ? value : "";
  const isEmpty = !currentVal;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <div className={className}>
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <FieldIcon icon={icon} />
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              updatePosition();
              setOpen(true);
            } else {
              setOpen(false);
            }
          }}
          className={inputClass(
            error,
            !!icon,
            `flex items-center justify-between pr-7 text-left sm:pr-9 ${
              open ? "border-blue-500 bg-white ring-4 ring-blue-100" : ""
            } ${isEmpty ? "text-slate-500" : "font-medium text-slate-900"}`
          )}
        >
          <span className="truncate">{currentVal || placeholder || label}</span>
        </button>
        <span
          className={`pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 transition-transform duration-150 ${
            open ? "rotate-180 text-blue-600" : "text-slate-500"
          }`}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      </div>

      {open &&
        menuStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
              zIndex: 9999,
            }}
            className="rounded-xl border border-blue-200 bg-white p-1.5 shadow-[0_14px_34px_rgba(11,42,107,0.22)] ring-1 ring-blue-500/10"
          >
            {options.map((opt) => {
              const isSelected = opt === currentVal;
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange?.({
                      target: { name: name ?? "", value: opt },
                    } as unknown as ChangeEvent<HTMLSelectElement>);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)]"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-900"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-white" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
      <FieldError error={error} />
    </div>
  );
}

export function PasswordField({ label, icon, error, id, name, placeholder, className, ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? name ?? label;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <FieldIcon icon={icon} />
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder ?? label}
          aria-invalid={!!error}
          suppressHydrationWarning
          className={inputClass(error, !!icon, "pr-8 sm:pr-11")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 hover:text-slate-700 sm:px-3"
        >
          {visible ? <EyeOffIcon className="h-4 w-4 sm:h-5 sm:w-5" /> : <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
        </button>
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 sm:gap-3 sm:text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded-full border-slate-400 accent-blue-600 sm:h-5 sm:w-5"
        />
        <span>{children}</span>
      </label>
      <FieldError error={error} />
    </div>
  );
}

export function SubmitButton({
  loading,
  loadingText,
  icon,
  children,
}: {
  loading: boolean;
  loadingText: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const hydrated = useIsHydrated();
  return (
    <button
      type="submit"
      disabled={loading || !hydrated}
      suppressHydrationWarning
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.8)] transition hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 xl:py-2.5 xl:text-base"
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      ) : (
        icon
      )}
      {loading ? loadingText : children}
    </button>
  );
}

export function Alert({ type, children }: { type: "success" | "error"; children: ReactNode }) {
  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <div role="alert" className={`mb-4 rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setAt(index: number, char: string) {
    const clean = char.replace(/\D/g, "");
    if (!clean) {
      const next = digits.slice();
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    const next = digits.slice();
    for (let offset = 0; offset < clean.length && index + offset < length; offset++) {
      next[index + offset] = clean[offset];
    }
    onChange(next.join(""));

    const nextFocus = Math.min(index + clean.length, length - 1);
    inputsRef.current[nextFocus]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setAt(index, "");
      } else if (index > 0) {
        const next = digits.slice();
        next[index - 1] = "";
        onChange(next.join(""));
        inputsRef.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
      e.preventDefault();
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    if (pasted.length === length) {
      onChange(pasted);
      inputsRef.current[length - 1]?.focus();
    } else {
      setAt(index, pasted);
    }
  }

  return (
    <div>
      <div className="flex justify-center gap-2 sm:gap-2.5">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={digit}
            disabled={disabled}
            suppressHydrationWarning
            aria-label={`OTP digit ${i + 1}`}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            className={`h-10 w-10 rounded-lg border bg-[#eef2fb] text-center text-base font-bold text-slate-900 transition focus:bg-white focus:outline-none focus:ring-4 sm:h-11 sm:w-11 sm:text-lg ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
            }`}
          />
        ))}
      </div>
      <FieldError error={error} />
    </div>
  );
}
