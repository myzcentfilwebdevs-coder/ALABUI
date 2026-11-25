"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  leadingIcon?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  pill?: boolean;
  className?: string;
  menuMinWidth?: number;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  leadingIcon,
  ariaLabel,
  disabled = false,
  size = "md",
  pill = false,
  className = "",
  menuMinWidth,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const width = Math.max(rect.width, menuMinWidth ?? 0);

    const spaceBelow = viewportH - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const estHeight = Math.min(264, options.length * 42 + 12);

    const openUpward = spaceBelow < Math.min(estHeight, 180) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(264, openUpward ? spaceAbove : spaceBelow));
    const top = openUpward
      ? Math.max(8, rect.top - Math.min(estHeight, maxHeight) - 6)
      : rect.bottom + 6;
    const left = Math.min(Math.max(8, rect.left), Math.max(8, viewportW - width - 8));

    setMenuStyle({ top, left, width, maxHeight });
  }, [menuMinWidth, options.length]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePosition]);

  const radiusClass = pill ? "rounded-full" : size === "xs" ? "rounded-lg" : "rounded-xl";
  const sizeClass =
    size === "xs"
      ? `${radiusClass} px-2.5 py-1.5 text-xs`
      : size === "sm"
      ? `${radiusClass} px-3 py-2 text-xs`
      : `${radiusClass} px-3.5 py-2.5 text-sm`;

  const displayIcon = selectedOption?.icon ?? leadingIcon;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
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
        className={`group inline-flex items-center justify-between gap-2 border text-left font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-55 ${sizeClass} ${
          open
            ? "border-sky-400 bg-gradient-to-r from-[#091f5c] via-[#07194c] to-[#0a2368] text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] ring-1 ring-sky-300/35"
            : "border-blue-400/30 bg-[#041034]/95 text-blue-50 hover:border-sky-400/60 hover:bg-[#07194c]"
        } ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {displayIcon && (
            <span className="flex shrink-0 items-center justify-center text-sky-300">
              {displayIcon}
            </span>
          )}
          <span className={`truncate ${selectedOption ? "text-white" : "text-blue-300/55"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-sky-300/85 transition-transform duration-150 ${
            open ? "rotate-180 text-sky-200" : "group-hover:text-white"
          }`}
        />
      </button>

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
              maxHeight: menuStyle.maxHeight,
              zIndex: 9999,
            }}
            className="sidebar-scroll overflow-y-auto rounded-xl border border-sky-400/55 bg-gradient-to-b from-[#0b2675] via-[#071952] to-[#041038] p-1.5 shadow-[0_18px_46px_rgba(2,8,28,0.92),0_0_28px_rgba(56,189,248,0.3)] backdrop-blur-xl"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-center text-xs text-blue-200/70">No options</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-[13px] ${
                      isSelected
                        ? "bg-gradient-to-r from-sky-500 via-blue-500 to-blue-600 text-white shadow-[0_0_16px_rgba(56,189,248,0.5)]"
                        : "text-blue-100/90 hover:bg-blue-500/25 hover:text-white"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {opt.icon && (
                        <span
                          className={`flex shrink-0 items-center justify-center ${
                            isSelected ? "text-white" : "text-sky-300"
                          }`}
                        >
                          {opt.icon}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span
                            className={`block truncate text-[10px] font-normal ${
                              isSelected ? "text-blue-100" : "text-blue-300/70"
                            }`}
                          >
                            {opt.sublabel}
                          </span>
                        )}
                      </span>
                    </span>

                    {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-white" />}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </>
  );
}
