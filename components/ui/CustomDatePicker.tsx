"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronDownIcon, TrashIcon } from "@/components/icons";

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
  allowClear?: boolean;
  clearFallback?: string;
}

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function getLocalTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function parseISODate(iso: string): { year: number; month0: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(year) || month0 < 0 || month0 > 11 || day < 1 || day > 31) return null;
  return { year, month0, day };
}

function toISODate(year: number, month0: number, day: number): string {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

function formatDisplayDate(iso: string): string {
  const parsed = parseISODate(iso);
  if (!parsed) return "";
  return `${MONTH_SHORT[parsed.month0]} ${parsed.day}, ${parsed.year}`;
}

interface CalendarCell {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
}

function buildCalendarGrid(year: number, month0: number): CalendarCell[] {
  const firstDayOfWeek = new Date(year, month0, 1).getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month0, 0).getDate();

  const prevYear = month0 === 0 ? year - 1 : year;
  const prevMonth0 = month0 === 0 ? 11 : month0 - 1;
  const nextYear = month0 === 11 ? year + 1 : year;
  const nextMonth0 = month0 === 11 ? 0 : month0 + 1;

  const cells: CalendarCell[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      iso: toISODate(prevYear, prevMonth0, d),
      day: d,
      inCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      iso: toISODate(year, month0, d),
      day: d,
      inCurrentMonth: true,
    });
  }

  const totalCells = cells.length <= 35 ? 35 : 42;
  let nextDay = 1;
  while (cells.length < totalCells) {
    cells.push({
      iso: toISODate(nextYear, nextMonth0, nextDay),
      day: nextDay,
      inCurrentMonth: false,
    });
    nextDay++;
  }

  return cells;
}

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  ariaLabel,
  disabled = false,
  size = "sm",
  className = "",
  allowClear = true,
  clearFallback = "",
}: CustomDatePickerProps) {
  const todayISO = useMemo(() => getLocalTodayString(), []);
  const initialParsed = parseISODate(value) ?? parseISODate(todayISO)!;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialParsed.year);
  const [viewMonth0, setViewMonth0] = useState(initialParsed.month0);
  const [pickingMonthYear, setPickingMonthYear] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const popWidth = Math.min(296, Math.max(256, viewportW - 16));
    const estHeight = 342;

    const spaceBelow = viewportH - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const openUpward = spaceBelow < estHeight && spaceAbove > spaceBelow;

    const top = openUpward
      ? Math.max(8, rect.top - estHeight - 8)
      : Math.min(Math.max(8, rect.bottom + 8), Math.max(8, viewportH - estHeight - 8));

    // Align right edge with trigger if trigger is near the right side of the screen (e.g. sidebar)
    let left = rect.left;
    if (left + popWidth > viewportW - 8) {
      left = rect.right - popWidth;
    }
    left = Math.min(Math.max(8, left), Math.max(8, viewportW - popWidth - 8));

    setPos({ top, left, width: popWidth });
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setPickingMonthYear(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setPickingMonthYear(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const cells = useMemo(() => buildCalendarGrid(viewYear, viewMonth0), [viewYear, viewMonth0]);
  const displayText = formatDisplayDate(value);

  function handleToggle() {
    if (disabled) return;
    if (!open) {
      const parsed = parseISODate(value) ?? parseISODate(todayISO)!;
      setViewYear(parsed.year);
      setViewMonth0(parsed.month0);
      setPickingMonthYear(false);
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
      setPickingMonthYear(false);
    }
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth0 + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth0(next.getMonth());
  }

  function handleSelectDate(iso: string) {
    onChange(iso);
    setOpen(false);
    setPickingMonthYear(false);
  }

  function handleToday() {
    const t = getLocalTodayString();
    const parsed = parseISODate(t)!;
    setViewYear(parsed.year);
    setViewMonth0(parsed.month0);
    onChange(t);
    setOpen(false);
    setPickingMonthYear(false);
  }

  function handleClear() {
    onChange(clearFallback);
    setOpen(false);
    setPickingMonthYear(false);
  }

  const sizeClass =
    size === "xs"
      ? "rounded-lg px-2.5 py-1.5 text-xs"
      : size === "sm"
      ? "rounded-xl px-3 py-2 text-xs"
      : "rounded-xl px-3.5 py-2.5 text-sm";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || "Select date"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleToggle}
        className={`group inline-flex w-full items-center justify-between gap-2 border text-left font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-55 ${sizeClass} ${
          open
            ? "border-sky-400 bg-gradient-to-r from-[#091f5c] via-[#07194c] to-[#0a2368] text-white shadow-[0_0_20px_rgba(56,189,248,0.45)] ring-1 ring-sky-300/40"
            : "border-blue-400/30 bg-[#041034]/95 text-blue-50 hover:border-sky-400/60 hover:bg-[#07194c]"
        } ${className}`}
      >
        <span className={`truncate ${displayText ? "text-white" : "text-blue-300/55"}`}>
          {displayText || placeholder}
        </span>
        <CalendarIcon
          className={`h-4 w-4 shrink-0 transition ${
            open ? "text-sky-200" : "text-sky-300/85 group-hover:text-white"
          }`}
        />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel || "Calendar date picker"}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="relative overflow-hidden rounded-2xl border border-sky-400/65 bg-gradient-to-b from-[#0b2a82] via-[#071b58] to-[#041038] p-3.5 shadow-[0_22px_54px_rgba(2,8,28,0.92),0_0_32px_rgba(56,189,248,0.38)] backdrop-blur-xl"
          >
            {/* Top & bottom cyan light accents */}
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/90 to-transparent" />
            <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/75 to-transparent" />

            {/* Header: <  November 2026 v  > */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  pickingMonthYear ? setViewYear((y) => y - 1) : shiftMonth(-1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/30 bg-[#06184c]/90 text-sm font-bold text-sky-100 transition hover:border-sky-300 hover:bg-blue-600/45 hover:text-white"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={() => setPickingMonthYear((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-extrabold tracking-tight text-white transition hover:bg-blue-500/25"
              >
                <span>
                  {pickingMonthYear ? viewYear : `${MONTH_NAMES[viewMonth0]} ${viewYear}`}
                </span>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 text-sky-200 transition-transform duration-150 ${
                    pickingMonthYear ? "rotate-180" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  pickingMonthYear ? setViewYear((y) => y + 1) : shiftMonth(1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/30 bg-[#06184c]/90 text-sm font-bold text-sky-100 transition hover:border-sky-300 hover:bg-blue-600/45 hover:text-white"
              >
                ›
              </button>
            </div>

            {pickingMonthYear ? (
              /* Quick Month & Year Selector */
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {MONTH_SHORT.map((label, idx) => {
                  const active = idx === viewMonth0;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setViewMonth0(idx);
                        setPickingMonthYear(false);
                      }}
                      className={`rounded-lg py-2 text-xs font-bold transition ${
                        active
                          ? "border border-sky-200/80 bg-gradient-to-b from-sky-400 via-blue-500 to-blue-600 text-white shadow-[0_0_16px_rgba(56,189,248,0.65)]"
                          : "border border-blue-400/20 bg-[#051440]/80 text-blue-100 hover:border-sky-400/50 hover:bg-blue-500/30 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Weekday headers */}
                <div className="mb-1.5 grid grid-cols-7 text-center">
                  {WEEKDAYS.map((wd) => (
                    <span
                      key={wd}
                      className="py-1 text-[10px] font-bold tracking-wider text-sky-200/85"
                    >
                      {wd}
                    </span>
                  ))}
                </div>

                {/* Days grid */}
                <div className="mb-3 grid grid-cols-7 gap-1 text-center">
                  {cells.map((cell) => {
                    const isSelected = cell.iso === value;
                    const isToday = cell.iso === todayISO;
                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        onClick={() => handleSelectDate(cell.iso)}
                        className={`flex h-8 w-full items-center justify-center rounded-lg text-xs transition ${
                          isSelected
                            ? "border border-sky-200/85 bg-gradient-to-b from-sky-400 via-blue-500 to-blue-600 font-extrabold text-white shadow-[0_0_18px_rgba(56,189,248,0.8)]"
                            : isToday
                            ? "border border-sky-400/65 bg-sky-500/20 font-bold text-sky-100 hover:bg-sky-500/35"
                            : cell.inCurrentMonth
                            ? "font-semibold text-white hover:bg-blue-500/30"
                            : "font-medium text-blue-300/40 hover:bg-blue-500/20 hover:text-blue-200/80"
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Footer: Clear + Today */}
            <div className="flex items-center justify-between gap-2 border-t border-sky-400/20 pt-2.5">
              {allowClear ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/30 bg-[#051440]/90 px-3 py-1.5 text-xs font-bold text-blue-100 transition hover:border-sky-300/60 hover:bg-blue-900/60 hover:text-white"
                >
                  <TrashIcon className="h-3.5 w-3.5 text-sky-300" />
                  Clear
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={handleToday}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300/80 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.6)] transition hover:brightness-110"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
