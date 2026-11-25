"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import crest from "@/app/logo/logoALAB.png";
import {
  fetchPlayerAttendanceHistory,
  getLocalTodayISO,
  type AttendanceStatus,
  type PlayerAttendanceHistoryResponse,
  type PlayerAttendanceRecord,
} from "@/lib/api";
import {
  BarChartIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  HomeIcon,
  PrinterIcon,
  ReceiptIcon,
  UsersIcon,
} from "@/components/icons";
import CustomSelect from "@/components/ui/CustomSelect";

export interface PlayerAttendanceSummaryItem {
  player_user_id: number;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  age_category: string;
  position: string;
}

interface PlayerAttendanceDetailProps {
  player: PlayerAttendanceSummaryItem;
  allPlayers: PlayerAttendanceSummaryItem[];
  canRecord: boolean;
  onSelectPlayer: (next: PlayerAttendanceSummaryItem) => void;
  onBack: () => void;
  onMarkForPlayer: (player: PlayerAttendanceSummaryItem, dateISO: string) => void;
  refreshTick: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(year: number, month0: number, day: number): string {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

function formatShortDate(iso: string): string {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function monthRangeLabel(year: number, month0: number): string {
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  return `${fmt(first)} – ${fmt(last)}`;
}

function statusCalendarCellClass(status: AttendanceStatus): string {
  if (status === "Present") {
    return "border-emerald-400/70 bg-emerald-500/25 text-emerald-50 shadow-[inset_0_0_12px_rgba(16,185,129,0.28)] hover:bg-emerald-500/35";
  }
  if (status === "Absent") {
    return "border-rose-400/70 bg-rose-500/25 text-rose-50 shadow-[inset_0_0_12px_rgba(244,63,94,0.28)] hover:bg-rose-500/35";
  }
  if (status === "Late") {
    return "border-amber-400/70 bg-amber-500/25 text-amber-50 shadow-[inset_0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/35";
  }
  if (status === "Excused") {
    return "border-sky-400/70 bg-sky-500/25 text-sky-50 shadow-[inset_0_0_12px_rgba(56,189,248,0.25)] hover:bg-sky-500/35";
  }
  return "";
}

function statusBadgeTextClass(status: AttendanceStatus): string {
  if (status === "Present") return "text-emerald-300";
  if (status === "Absent") return "text-rose-300";
  if (status === "Late") return "text-amber-300";
  if (status === "Excused") return "text-sky-300";
  return "text-blue-200/70";
}

function statusPillClass(status: AttendanceStatus): string {
  if (status === "Present") {
    return "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.28)]";
  }
  if (status === "Absent") {
    return "border-rose-400/50 bg-rose-500/20 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.28)]";
  }
  if (status === "Late") {
    return "border-amber-400/50 bg-amber-500/20 text-amber-300";
  }
  if (status === "Excused") {
    return "border-sky-400/50 bg-sky-500/20 text-sky-200";
  }
  return "border-slate-500/40 bg-slate-800/70 text-slate-300";
}

function statusSymbol(status: AttendanceStatus): string {
  if (status === "Present") return "✓";
  if (status === "Absent") return "✕";
  if (status === "Late") return "◔";
  if (status === "Excused") return "★";
  return "";
}

function getInitials(first: string, last: string): string {
  return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || "P";
}

export default function PlayerAttendanceDetail({
  player,
  allPlayers,
  canRecord,
  onSelectPlayer,
  onBack,
  onMarkForPlayer,
  refreshTick,
}: PlayerAttendanceDetailProps) {
  const todayISO = getLocalTodayISO();
  const [todayYear, todayMonth] = todayISO.split("-").map(Number);

  const [calYear, setCalYear] = useState<number>(todayYear);
  const [calMonth0, setCalMonth0] = useState<number>((todayMonth || 1) - 1);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [showAllSessions, setShowAllSessions] = useState<boolean>(false);

  const [history, setHistory] = useState<PlayerAttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchPlayerAttendanceHistory(player.player_user_id);
    setLoading(false);
    if (res.ok && res.data) {
      setHistory(res.data);
      // If current calendar month has no records, jump to the latest recorded date's month so statuses are immediately visible
      const recs = res.data.records;
      if (recs.length > 0) {
        const hasInTodayMonth = recs.some((r) => r.date.startsWith(todayISO.slice(0, 7)));
        if (!hasInTodayMonth) {
          const latest = recs[0].date.slice(0, 10);
          const parts = latest.split("-").map(Number);
          if (parts.length === 3 && !parts.some(Number.isNaN)) {
            setCalYear(parts[0]);
            setCalMonth0(parts[1] - 1);
            setSelectedDate(latest);
          }
        }
      }
    } else {
      setHistory(null);
      setError(res.message || "Failed to load player attendance history.");
    }
  }, [player.player_user_id, todayISO]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadHistory, refreshTick]);

  // Map records by YYYY-MM-DD for calendar dots
  const recordByDate = useMemo(() => {
    const map = new Map<string, PlayerAttendanceRecord>();
    for (const rec of history?.records ?? []) {
      const key = rec.date.slice(0, 10);
      if (key) map.set(key, rec);
    }
    return map;
  }, [history?.records]);

  // Build 42-cell (6-week) calendar grid for calYear / calMonth0
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(calYear, calMonth0, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth0 + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth0, 0).getDate();

    const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(calYear, calMonth0 - 1, d);
      cells.push({
        iso: toISODate(prevDate.getFullYear(), prevDate.getMonth(), d),
        day: d,
        inMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: toISODate(calYear, calMonth0, d),
        day: d,
        inMonth: true,
      });
    }

    const totalCells = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < totalCells) {
      const nextDate = new Date(calYear, calMonth0 + 1, nextDay);
      cells.push({
        iso: toISODate(nextDate.getFullYear(), nextDate.getMonth(), nextDay),
        day: nextDay,
        inMonth: false,
      });
      nextDay++;
    }

    return cells;
  }, [calYear, calMonth0]);

  function shiftMonth(delta: number) {
    const d = new Date(calYear, calMonth0 + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth0(d.getMonth());
  }

  function jumpToDate(iso: string) {
    const clean = iso.slice(0, 10);
    setSelectedDate(clean);
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && !parts.some(Number.isNaN)) {
      setCalYear(parts[0]);
      setCalMonth0(parts[1] - 1);
    }
  }

  const selectedRecord = recordByDate.get(selectedDate) ?? null;

  const summary = history?.summary ?? {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  const attendanceRate =
    summary.total > 0
      ? Math.round(((summary.present + summary.late) / summary.total) * 1000) / 10
      : 0;

  const displayName =
    player.last_name && player.first_name
      ? `${player.last_name}, ${player.first_name}`
      : `${player.first_name} ${player.last_name}`.trim() || `Player #${player.player_user_id}`;

  const playerCode = `ALAB-${String(player.player_user_id).padStart(3, "0")}`;

  const visibleSessions = useMemo(() => {
    const list = history?.records ?? [];
    return showAllSessions ? list : list.slice(0, 6);
  }, [history?.records, showAllSessions]);

  function handleDownloadReport() {
    const records = history?.records ?? [];
    const lines = [
      ["Date", "Session", "Status", "Notes"].join(","),
      ...records.map((r) =>
        [
          `"${r.date}"`,
          `"${r.session_title.replace(/"/g, '""')}"`,
          `"${r.status || "Unmarked"}"`,
          `"${(r.remarks || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${playerCode}-attendance-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-blue-200/75">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-semibold text-sky-300 transition hover:text-white"
        >
          <HomeIcon className="h-3.5 w-3.5" />
          Attendance
        </button>
        <span className="text-blue-400/60">›</span>
        <span className="font-semibold text-white">Player Attendance</span>
      </nav>

      {/* Page Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_0_18px_rgba(56,189,248,0.5)]">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Player Attendance
            </h2>
            <p className="text-xs text-blue-200/75">
              View and track attendance records for each player.
            </p>
          </div>
        </div>

        {/* Right Controls: Month Range + Player Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-blue-400/30 bg-[#051238]/85 px-2 py-1.5 text-xs font-semibold text-blue-100">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="rounded-md px-1.5 py-0.5 text-blue-300 hover:bg-white/10 hover:text-white"
            >
              ‹
            </button>
            <CalendarIcon className="h-3.5 w-3.5 text-sky-400" />
            <span className="px-1">{monthRangeLabel(calYear, calMonth0)}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-md px-1.5 py-0.5 text-blue-300 hover:bg-white/10 hover:text-white"
            >
              ›
            </button>
          </div>

          {allPlayers.length > 1 && (
            <CustomSelect
              ariaLabel="Switch player"
              size="sm"
              value={String(player.player_user_id)}
              onChange={(val) => {
                const target = allPlayers.find((p) => p.player_user_id === Number(val));
                if (target) onSelectPlayer(target);
              }}
              leadingIcon={<UsersIcon className="h-3.5 w-3.5" />}
              menuMinWidth={210}
              options={allPlayers.map((p) => ({
                value: String(p.player_user_id),
                label:
                  p.last_name && p.first_name
                    ? `${p.last_name}, ${p.first_name}`
                    : `${p.first_name} ${p.last_name}`,
                sublabel: [p.age_category, p.jersey_number !== null ? `#${p.jersey_number}` : ""]
                  .filter(Boolean)
                  .join(" • ") || undefined,
              }))}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* ==================== ROW 1: PLAYER PROFILE CARD + 4 COLORED STAT CARDS ==================== */}
      <section className="grid gap-4 xl:grid-cols-12">
        {/* Player Profile Card */}
        <div className="dash-card relative overflow-hidden rounded-2xl p-4 sm:p-5 xl:col-span-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
          <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
            {/* Avatar / Jersey Frame */}
            <div className="relative flex h-24 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-sky-400/40 bg-gradient-to-b from-blue-600/80 via-blue-800/80 to-[#040e2d] shadow-[0_0_24px_rgba(37,99,235,0.45)] sm:h-28 sm:w-24">
              <Image src={crest} alt="ALAB" className="mb-1 h-6 w-auto opacity-90 sm:h-7" />
              <span className="font-display text-2xl font-extrabold italic leading-none text-white sm:text-3xl">
                {player.jersey_number !== null
                  ? `#${player.jersey_number}`
                  : getInitials(player.first_name, player.last_name)}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-sky-200 sm:text-[10px]">
                ALAB FC
              </span>
            </div>

            {/* Player Details */}
            <div className="w-full min-w-0 flex-1">
              <h3 className="truncate text-lg font-extrabold text-white sm:text-xl">{displayName}</h3>
              <span className="mt-1 inline-block rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-0.5 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.45)]">
                {player.position || "Player"}
              </span>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-left text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200/65">Team</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-bold text-white">
                    <Image src={crest} alt="ALAB" className="h-4 w-auto" />
                    {player.age_category || "ALAB"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200/65">Player ID</p>
                  <p className="mt-0.5 font-mono font-bold text-white">{playerCode}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200/65">Jersey</p>
                  <p className="mt-0.5 font-bold text-white">
                    {player.jersey_number !== null ? `#${player.jersey_number}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-200/65">Today</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-bold">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        history?.today_status === "Present"
                          ? "bg-emerald-400"
                          : history?.today_status === "Absent"
                          ? "bg-rose-400"
                          : history?.today_status === "Late"
                          ? "bg-amber-400"
                          : history?.today_status === "Excused"
                          ? "bg-sky-400"
                          : "bg-slate-400"
                      }`}
                    />
                    <span className={statusBadgeTextClass(history?.today_status ?? "")}>
                      {history?.today_status || "Unmarked"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Colored Stat Cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 xl:col-span-7">
          <StatBox
            icon={<CalendarIcon className="h-5 w-5" />}
            iconBg="bg-sky-400/30 text-white"
            boxStyle="border-sky-400/55 bg-gradient-to-br from-blue-600/85 via-blue-800/75 to-[#06184a]"
            value={`${attendanceRate}%`}
            label="Attendance Rate"
            sub={`${summary.total} sessions`}
          />
          <StatBox
            icon={<CheckIcon className="h-5 w-5" />}
            iconBg="bg-emerald-400/30 text-white"
            boxStyle="border-emerald-400/55 bg-gradient-to-br from-emerald-600/80 via-green-800/70 to-[#042419]"
            value={String(summary.present)}
            label="Present"
            sub={`of ${summary.total} sessions`}
          />
          <StatBox
            icon={<CloseIcon className="h-5 w-5" />}
            iconBg="bg-rose-400/30 text-white"
            boxStyle="border-rose-400/55 bg-gradient-to-br from-rose-600/80 via-red-800/70 to-[#2c0714]"
            value={String(summary.absent)}
            label="Absent"
            sub={`of ${summary.total} sessions`}
          />
          <StatBox
            icon={<ClockIcon className="h-5 w-5" />}
            iconBg="bg-violet-400/30 text-white"
            boxStyle="border-violet-400/55 bg-gradient-to-br from-violet-600/80 via-purple-800/70 to-[#140a38]"
            value={String(summary.late)}
            label="Late"
            sub={`of ${summary.total} sessions`}
          />
        </div>
      </section>

      {/* ==================== ROW 2: ATTENDANCE CALENDAR + RECENT SESSIONS ==================== */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Left: Attendance Calendar */}
        <div className="dash-card rounded-2xl p-4 sm:p-5 lg:col-span-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white sm:text-base">Attendance Calendar</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                ✓ Present
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-rose-300">
                ✕ Absent
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-amber-300">
                ◔ Late
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-sky-300">
                ★ Excused
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-blue-200/70 sm:gap-1.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell) => {
              const rec = recordByDate.get(cell.iso);
              const status = rec?.status ?? "";
              const isSelected = selectedDate === cell.iso;
              const isToday = cell.iso === todayISO;
              const hasStatus = Boolean(status);

              const baseCellClass = hasStatus
                ? statusCalendarCellClass(status)
                : isToday
                ? "border-sky-400/60 bg-blue-800/45 text-white hover:bg-blue-800/65"
                : cell.inMonth
                ? "border-blue-400/15 bg-[#051136]/75 text-blue-100 hover:border-blue-400/40 hover:bg-blue-900/40"
                : "border-transparent bg-transparent text-blue-300/30 hover:bg-white/5";

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso)}
                  title={rec ? `${formatShortDate(cell.iso)} — ${rec.status}${rec.remarks ? ` (${rec.remarks})` : ""}` : formatShortDate(cell.iso)}
                  className={`relative flex h-12 flex-col items-center justify-center rounded-xl border text-xs font-bold transition ${baseCellClass} ${
                    isSelected
                      ? "ring-2 ring-sky-300 ring-offset-1 ring-offset-[#051238]"
                      : ""
                  }`}
                >
                  {isToday && (
                    <span
                      title="Today"
                      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_6px_rgba(125,211,252,1)]"
                    />
                  )}
                  <span className="leading-none">{cell.day}</span>
                  {hasStatus ? (
                    <span
                      className={`mt-1 text-[10px] font-extrabold leading-none ${statusBadgeTextClass(status)}`}
                    >
                      {statusSymbol(status)} {status === "Present" ? "P" : status === "Absent" ? "A" : status === "Late" ? "L" : "E"}
                    </span>
                  ) : (
                    <span className="mt-1 h-2.5 text-[9px] font-medium leading-none text-blue-300/30">
                      {isToday ? "Today" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Date Status Strip */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-blue-400/20 bg-[#040f30]/85 px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white">{formatShortDate(selectedDate)}</span>
                {selectedRecord?.status ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusPillClass(selectedRecord.status)}`}
                  >
                    <span>{statusSymbol(selectedRecord.status)}</span>
                    <span>{selectedRecord.status}</span>
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-500/40 bg-slate-800/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                    No Record
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-blue-200/70">
                {selectedRecord
                  ? [selectedRecord.session_title, selectedRecord.remarks].filter(Boolean).join(" • ")
                  : "Click any colored date to inspect or mark attendance for this day."}
              </p>
            </div>

            {canRecord && (
              <button
                type="button"
                onClick={() => onMarkForPlayer(player, selectedDate)}
                className="shrink-0 rounded-lg border border-sky-400/45 bg-blue-600/30 px-3 py-1.5 text-[11px] font-bold text-sky-100 transition hover:bg-blue-600/55 hover:text-white"
              >
                {selectedRecord?.status ? "Update Status" : "Mark Day"}
              </button>
            )}
          </div>
        </div>

        {/* Right: Recent Sessions Table */}
        <div className="dash-card flex flex-col rounded-2xl p-4 sm:p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ReceiptIcon className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white sm:text-base">Recent Sessions</h3>
            </div>
            {(history?.records.length ?? 0) > 6 && (
              <button
                type="button"
                onClick={() => setShowAllSessions((v) => !v)}
                className="text-xs font-semibold text-sky-300 transition hover:text-white"
              >
                {showAllSessions ? "Show Less" : "View All →"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-10 text-sm text-blue-200/70">
              Loading sessions...
            </div>
          ) : visibleSessions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-blue-400/20 bg-blue-950/40 py-10 text-center">
              <p className="text-sm font-semibold text-white">No attendance sessions recorded yet.</p>
              <p className="mt-1 text-xs text-blue-200/70">
                Use &ldquo;Mark Attendance&rdquo; below to log a session for this player.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Recent Sessions Cards (< sm) */}
              <div className="space-y-2 sm:hidden">
                {visibleSessions.map((rec) => {
                  const isSelectedRow = rec.date.slice(0, 10) === selectedDate;
                  return (
                    <button
                      key={`mob-sess-${rec.attendance_id}-${rec.date}`}
                      type="button"
                      onClick={() => jumpToDate(rec.date)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelectedRow
                          ? "border-sky-400/60 bg-blue-600/20"
                          : "border-blue-400/15 bg-[#040f30]/75 hover:border-blue-400/35"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">
                          {formatShortDate(rec.date)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPillClass(rec.status)}`}
                        >
                          {rec.status ? (
                            <>
                              <span>{statusSymbol(rec.status)}</span>
                              <span>{rec.status}</span>
                            </>
                          ) : (
                            "Unmarked"
                          )}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-blue-100">
                        {rec.session_title}
                      </p>
                      {rec.remarks && (
                        <p className="mt-0.5 truncate text-[11px] text-blue-200/70">
                          {rec.remarks}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Desktop Recent Sessions Table (>= sm) */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-blue-400/15 text-[11px] font-semibold uppercase tracking-wider text-blue-200/70">
                    <th className="pb-2.5 pr-3">Date</th>
                    <th className="pb-2.5 pr-3">Session</th>
                    <th className="pb-2.5 pr-3">Status</th>
                    <th className="pb-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-400/10">
                  {visibleSessions.map((rec) => {
                    const isSelectedRow = rec.date.slice(0, 10) === selectedDate;
                    return (
                      <tr
                        key={`${rec.attendance_id}-${rec.date}`}
                        onClick={() => jumpToDate(rec.date)}
                        className={`cursor-pointer transition hover:bg-blue-500/[0.08] ${
                          isSelectedRow ? "bg-blue-600/20" : ""
                        }`}
                      >
                        <td className="py-2.5 pr-3 whitespace-nowrap font-medium text-blue-100">
                          {formatShortDate(rec.date)}
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-white">{rec.session_title}</td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusPillClass(rec.status)}`}
                          >
                            {rec.status ? (
                              <>
                                <span>{statusSymbol(rec.status)}</span>
                                <span>{rec.status}</span>
                              </>
                            ) : (
                              "Unmarked"
                            )}
                          </span>
                        </td>
                        <td className="max-w-[140px] truncate py-2.5 text-xs text-blue-200/75">
                          {rec.remarks || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ==================== ROW 3: BOTTOM ATTENDANCE SUMMARY + ACTION BUTTONS ==================== */}
      <section className="dash-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <BarChartIcon className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Attendance Summary</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-blue-950/90 ring-1 ring-blue-400/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.8)] transition-all"
                style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
              />
            </div>
            <span className="text-sm font-extrabold text-white">{attendanceRate}%</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-blue-100/85">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Present <strong className="text-white">{summary.present}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Absent <strong className="text-white">{summary.absent}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Late <strong className="text-white">{summary.late}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Excused <strong className="text-white">{summary.excused}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-blue-400/15 pt-3 sm:gap-2.5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] transition hover:from-blue-500 hover:to-sky-400 sm:flex-none sm:px-4"
          >
            <DownloadIcon className="h-4 w-4" />
            Download Report
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-950/70 px-3.5 py-2.5 text-xs font-bold text-blue-100 transition hover:bg-blue-900/70 hover:text-white sm:flex-none sm:px-4"
          >
            <PrinterIcon className="h-4 w-4" />
            Print Report
          </button>

          {canRecord && (
            <button
              type="button"
              onClick={() => onMarkForPlayer(player, selectedDate)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-blue-600/25 px-4 py-2.5 text-xs font-bold text-sky-100 transition hover:bg-blue-600/45 hover:text-white sm:w-auto"
            >
              <CalendarIcon className="h-4 w-4" />
              Mark Attendance
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function StatBox({
  icon,
  iconBg,
  boxStyle,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  boxStyle: string;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-4 text-white shadow-lg ${boxStyle}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      <div className="mt-3">
        <p className="text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">{value}</p>
        <p className="mt-1.5 text-xs font-semibold text-white/95">{label}</p>
        <p className="mt-0.5 text-[11px] text-white/70">{sub}</p>
      </div>
    </div>
  );
}
