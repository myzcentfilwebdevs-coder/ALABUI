"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import crest from "@/app/logo/logoALAB.png";
import stadiumBg from "@/app/logo/backgoundimage.png";
import {
  fetchAllAttendanceHistory,
  fetchDailyAttendance,
  getLocalTodayISO,
  markBulkDailyAttendance,
  markSingleDailyAttendance,
  type AllAttendanceHistoryResponse,
  type AttendanceStatus,
  type DailyAttendancePlayer,
  type DailyAttendanceResponse,
} from "@/lib/api";
import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  EditIcon,
  FilterIcon,
  HistoryIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/icons";
import AddPlayerModal from "./AddPlayerModal";
import PlayerAttendanceDetail, { type PlayerAttendanceSummaryItem } from "./PlayerAttendanceDetail";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

type ViewMode = "daily" | "history-month" | "history-all";
type StatusFilter = "all" | "Present" | "Absent" | "unmarked";

const STATUS_META: Record<
  Exclude<AttendanceStatus, "">,
  { pill: string; btnActive: string; symbol: string }
> = {
  Present: {
    pill: "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    btnActive: "border-emerald-400 bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.55)]",
    symbol: "✓",
  },
  Late: {
    pill: "border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
    btnActive: "border-amber-400 bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.5)]",
    symbol: "◔",
  },
  Absent: {
    pill: "border-rose-400/50 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
    btnActive: "border-rose-400 bg-rose-600 text-white shadow-[0_0_14px_rgba(244,63,94,0.55)]",
    symbol: "✕",
  },
  Excused: {
    pill: "border-sky-400/50 bg-sky-500/20 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.25)]",
    btnActive: "border-sky-400 bg-sky-500 text-slate-950 shadow-[0_0_14px_rgba(56,189,248,0.5)]",
    symbol: "★",
  },
};

const DEFAULT_DIVISIONS = ["U-8", "U-10", "U-12", "U-14", "U-16", "U-18", "Senior"];

function formatLongDate(iso: string): string {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(val: string | null): string {
  if (!val) return "-";
  const parsed = new Date(val);
  if (Number.isNaN(parsed.getTime())) return val;
  return parsed.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(first: string, last: string): string {
  const a = first.trim().charAt(0).toUpperCase();
  const b = last.trim().charAt(0).toUpperCase();
  return `${a}${b}` || "P";
}

function statusPillBadge(status: AttendanceStatus): string {
  if (!status) return "border-slate-500/40 bg-slate-800/70 text-slate-300";
  return STATUS_META[status].pill;
}

interface AttendanceManagerProps {
  canRecord: boolean;
  canAddPlayer: boolean;
  onAttendanceChanged?: () => void;
}

export default function AttendanceManager({
  canRecord,
  canAddPlayer,
  onAttendanceChanged,
}: AttendanceManagerProps) {
  const today = getLocalTodayISO();

  // Applied filter state
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [date, setDate] = useState<string>(today);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState<string>("");

  // Sidebar draft filter inputs (applied on "Apply" or immediately via table top bar)
  const [draftDate, setDraftDate] = useState<string>(today);
  const [draftViewMode, setDraftViewMode] = useState<ViewMode>("daily");
  const [draftTeam, setDraftTeam] = useState<string>("all");
  const [draftStatus, setDraftStatus] = useState<StatusFilter>("all");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Data
  const [daily, setDaily] = useState<DailyAttendanceResponse | null>(null);
  const [allHistory, setAllHistory] = useState<AllAttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<boolean>(false);

  // Modals & Player Detail View
  const [addPlayerOpen, setAddPlayerOpen] = useState<boolean>(false);
  const [markModalOpen, setMarkModalOpen] = useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<DailyAttendancePlayer | null>(null);
  const [modalDate, setModalDate] = useState<string>(today);
  const [modalStatus, setModalStatus] = useState<Exclude<AttendanceStatus, "">>("Present");
  const [modalRemarks, setModalRemarks] = useState<string>("");
  const [modalPlayerId, setModalPlayerId] = useState<number>(0);

  // Full-Page Player Attendance Detail (GET /api/attendance/player/:id)
  const [detailPlayer, setDetailPlayer] = useState<PlayerAttendanceSummaryItem | null>(null);
  const [detailRefreshTick, setDetailRefreshTick] = useState<number>(0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (viewMode === "daily") {
      const res = await fetchDailyAttendance({
        date,
        age_category: teamFilter !== "all" ? teamFilter : undefined,
      });
      setLoading(false);
      if (res.ok && res.data) {
        setDaily(res.data);
      } else {
        setError(res.message || "Failed to load daily attendance.");
      }
    } else {
      const month = viewMode === "history-month" ? date.slice(0, 7) : undefined;
      const res = await fetchAllAttendanceHistory({
        age_category: teamFilter !== "all" ? teamFilter : undefined,
        month,
      });
      setLoading(false);
      if (res.ok && res.data) {
        setAllHistory(res.data);
      } else {
        setError(res.message || "Failed to load attendance history.");
      }
    }
  }, [viewMode, date, teamFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  function openHistoryModal(player: PlayerAttendanceSummaryItem) {
    setDetailPlayer(player);
  }

  function openEditModal(player: DailyAttendancePlayer, targetDate?: string) {
    setEditingPlayer(player);
    setModalPlayerId(player.player_user_id);
    setModalDate(targetDate || date);
    setModalStatus(player.status === "Absent" ? "Absent" : "Present");
    setModalRemarks(player.remarks || "");
    setMarkModalOpen(true);
  }

  function openMarkNewModal() {
    setEditingPlayer(null);
    const firstUnmarked = daily?.players.find((p) => !p.status) ?? daily?.players[0];
    setModalPlayerId(firstUnmarked?.player_user_id ?? 0);
    setModalDate(date);
    setModalStatus("Present");
    setModalRemarks("");
    setMarkModalOpen(true);
  }

  // Normalized rows for the table (works smoothly for both Daily & All History!)
  const allRows = useMemo(() => {
    if (viewMode === "daily") {
      return (daily?.players ?? []).map((p) => ({
        player_user_id: p.player_user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        jersey_number: p.jersey_number,
        age_category: p.age_category,
        position: p.position,
        status: p.status,
        attended: p.attended,
        check_in_time: p.check_in_time,
        remarks: p.remarks,
        attendance_rate: null as number | null,
        total_sessions: null as number | null,
        rawDaily: p as DailyAttendancePlayer | null,
      }));
    }
    return (allHistory?.players ?? []).map((p) => ({
      player_user_id: p.player_user_id,
      first_name: p.first_name,
      last_name: p.last_name,
      jersey_number: p.jersey_number,
      age_category: p.age_category,
      position: p.position,
      status: p.today_status,
      attended: p.attended_today,
      check_in_time: p.history[0]?.check_in_time ?? null,
      remarks: `${p.summary.present}P / ${p.summary.absent}A`,
      attendance_rate: p.summary.attendance_rate,
      total_sessions: p.summary.total,
      rawDaily: null as DailyAttendancePlayer | null,
    }));
  }, [viewMode, daily?.players, allHistory?.players]);

  const divisionOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_DIVISIONS);
    for (const r of allRows) {
      if (r.age_category) set.add(r.age_category);
    }
    return Array.from(set);
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (teamFilter !== "all" && row.age_category !== teamFilter) return false;
      if (statusFilter === "unmarked" && row.status !== "") return false;
      if (statusFilter !== "all" && statusFilter !== "unmarked" && row.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const full = `${row.first_name} ${row.last_name} ${row.last_name}, ${row.first_name}`.toLowerCase();
      return (
        full.includes(q) ||
        row.position.toLowerCase().includes(q) ||
        row.age_category.toLowerCase().includes(q) ||
        String(row.player_user_id).includes(q) ||
        (row.jersey_number !== null && String(row.jersey_number).includes(q))
      );
    });
  }, [allRows, teamFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIdx, startIdx + pageSize);

  // Live summary numbers
  const stats = useMemo(() => {
    if (viewMode === "daily" && daily) {
      const total = daily.summary.total_players;
      const present = daily.summary.present;
      const absent = daily.summary.absent;
      const unmarked = daily.summary.unmarked;
      const presentRate = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
      const absentRate = total > 0 ? Math.round((absent / total) * 1000) / 10 : 0;
      return {
        total,
        present,
        absent,
        extraCount: 0,
        unmarked,
        presentRate,
        absentRate,
      };
    }
    const list = allHistory?.players ?? [];
    const total = list.length;
    const present = list.filter((p) => p.attended_today).length;
    const absent = list.filter((p) => p.today_status === "Absent").length;
    const avgRate =
      total > 0
        ? Math.round((list.reduce((acc, p) => acc + p.summary.attendance_rate, 0) / total) * 10) / 10
        : 0;
    const absentRate = total > 0 ? Math.round((absent / total) * 1000) / 10 : 0;
    return {
      total,
      present,
      absent,
      extraCount: list.reduce((acc, p) => acc + p.summary.total, 0),
      unmarked: Math.max(0, total - present - absent),
      presentRate: avgRate,
      absentRate,
    };
  }, [viewMode, daily, allHistory]);

  function handleApplySidebarFilters() {
    setDate(draftDate);
    setViewMode(draftViewMode);
    setTeamFilter(draftTeam);
    setStatusFilter(draftStatus);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleResetFilters() {
    setDate(today);
    setDraftDate(today);
    setViewMode("daily");
    setDraftViewMode("daily");
    setTeamFilter("all");
    setDraftTeam("all");
    setStatusFilter("all");
    setDraftStatus("all");
    setSearch("");
    setPage(1);
    setSelectedIds(new Set());
  }

  async function handleSaveModalAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!canRecord || !modalPlayerId || saving) return;

    setSaving(true);
    const res = await markSingleDailyAttendance({
      date: modalDate,
      player_user_id: modalPlayerId,
      status: modalStatus,
      remarks: modalRemarks,
    });
    setSaving(false);

    if (res.ok) {
      setMarkModalOpen(false);
      setToast({ type: "success", message: `Attendance saved as ${modalStatus} (${modalDate}).` });
      setDetailRefreshTick((t) => t + 1);
      await loadData();
      if (onAttendanceChanged) onAttendanceChanged();
    } else {
      setToast({ type: "error", message: res.message || "Failed to save attendance." });
    }
  }

  async function handleBulkMark(status: Exclude<AttendanceStatus, "">) {
    if (!canRecord || selectedIds.size === 0 || saving) return;
    const records = Array.from(selectedIds).map((id) => ({
      player_user_id: id,
      status,
      remarks: daily?.players.find((p) => p.player_user_id === id)?.remarks ?? "",
    }));

    setSaving(true);
    const res = await markBulkDailyAttendance({ date, records });
    setSaving(false);

    if (res.ok) {
      setSelectedIds(new Set());
      setToast({
        type: "success",
        message: `Updated ${records.length} player(s) to ${status}.`,
      });
      await loadData();
      if (onAttendanceChanged) onAttendanceChanged();
    } else {
      setToast({ type: "error", message: res.message || "Bulk attendance update failed." });
    }
  }

  function handleDownloadCsv() {
    const header = ["Jersey", "Last Name", "First Name", "Position", "Team", "Status", "Check In", "Notes"];
    const lines = [
      header.join(","),
      ...filteredRows.map((r) =>
        [
          r.jersey_number ?? r.player_user_id,
          `"${r.last_name.replace(/"/g, '""')}"`,
          `"${r.first_name.replace(/"/g, '""')}"`,
          `"${r.position.replace(/"/g, '""')}"`,
          `"${r.age_category.replace(/"/g, '""')}"`,
          `"${r.status || "Unmarked"}"`,
          `"${formatTime(r.check_in_time)}"`,
          `"${(r.remarks || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alabfc-attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allOnPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.player_user_id));

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const r of paginatedRows) next.delete(r.player_user_id);
      } else {
        for (const r of paginatedRows) next.add(r.player_user_id);
      }
      return next;
    });
  }

  function toggleSelectRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // SVG Donut Math
  const ringR = 38;
  const ringCirc = 2 * Math.PI * ringR;
  const ringPct = Math.min(100, Math.max(0, Math.round(stats.presentRate)));
  const ringOffset = ringCirc * (1 - ringPct / 100);

  return (
    <div className="space-y-5">
      {detailPlayer ? (
        <PlayerAttendanceDetail
          player={detailPlayer}
          allPlayers={allRows}
          canRecord={canRecord}
          onSelectPlayer={(next) => setDetailPlayer(next)}
          onBack={() => setDetailPlayer(null)}
          onMarkForPlayer={(target, dateISO) => {
            openEditModal(
              {
                player_user_id: target.player_user_id,
                first_name: target.first_name,
                last_name: target.last_name,
                jersey_number: target.jersey_number,
                age_category: target.age_category,
                position: target.position,
                status: "Present",
                attended: true,
                check_in_time: null,
                remarks: "",
              },
              dateISO
            );
          }}
          refreshTick={detailRefreshTick}
        />
      ) : (
        <>
          {/* ==================== TOP ATTENDANCE HERO BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#06184c] p-5 shadow-[0_16px_44px_-14px_rgba(37,99,235,0.55)]">
        <Image
          src={stadiumBg}
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="pointer-events-none object-cover object-right opacity-85"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041038]/92 via-[#072066]/65 to-[#040f33]/55" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700 text-white shadow-[0_0_24px_rgba(56,189,248,0.6)]">
              <CalendarIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                Attendance
              </h2>
              <p className="text-xs text-blue-100/80 sm:text-sm">
                Track and manage player attendance for training sessions, tournaments and events.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Badge */}
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-400/30 bg-[#051136]/80 px-3.5 py-2">
              <CalendarIcon className="h-4 w-4 text-sky-400" />
              <div className="leading-tight">
                <p className="text-xs font-bold text-white">{formatLongDate(date)}</p>
                <p className="text-[10px] text-blue-200/75">
                  {viewMode === "daily"
                    ? date === today
                      ? "Today"
                      : "Selected Date"
                    : viewMode === "history-month"
                    ? "Monthly History"
                    : "All-Time History"}
                </p>
              </div>
            </div>

            {canRecord && (
              <button
                type="button"
                onClick={openMarkNewModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-400 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.65)] transition hover:from-blue-500 hover:to-sky-300"
              >
                <PlusIcon className="h-4 w-4" />
                Mark Attendance
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {toast && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            toast.type === "success"
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
              : "border-rose-400/40 bg-rose-500/15 text-rose-200"
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ==================== 2-COLUMN WORKSPACE ==================== */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* LEFT COLUMN (9/12): 4 KPI Cards + Attendance Table */}
        <div className="space-y-5 xl:col-span-9">
          {/* 4 KPI Cards matching mockup */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <KpiCard
              icon={<UsersIcon className="h-5 w-5" />}
              iconClass="bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_0_16px_rgba(56,189,248,0.5)]"
              label="Total Players"
              value={String(stats.total)}
              valueClass="text-white"
              sub="Registered Players"
            />
            <KpiCard
              icon={<CheckIcon className="h-5 w-5" />}
              iconClass="bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.5)]"
              label="Present Today"
              value={String(stats.present)}
              valueClass="text-emerald-400"
              sub={`${stats.presentRate}% Attendance Rate`}
            />
            <KpiCard
              icon={<CloseIcon className="h-5 w-5" />}
              iconClass="bg-gradient-to-br from-rose-400 to-red-600 text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]"
              label="Absent Today"
              value={String(stats.absent)}
              valueClass="text-rose-400"
              sub={`${stats.absentRate}% Absent Rate`}
            />
            <KpiCard
              icon={<CalendarIcon className="h-5 w-5" />}
              iconClass="bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.5)]"
              label={viewMode === "daily" ? "Unmarked" : "Total Logs"}
              value={String(viewMode === "daily" ? stats.unmarked : stats.extraCount)}
              valueClass="text-white"
              sub={viewMode === "daily" ? "Not yet marked" : "Recorded Sessions"}
            />
          </div>

          {/* Attendance List Table Card */}
          <div className="dash-card overflow-hidden rounded-2xl">
            {/* Table Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-400/20 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-sky-400" />
                  <h3 className="text-base font-bold text-white">Attendance List</h3>
                </div>
                <p className="mt-0.5 text-xs text-blue-200/70">
                  {viewMode === "daily"
                    ? "Manage and update attendance records for today's session."
                    : "Viewing player attendance rates and history across sessions."}
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <div className="relative w-full sm:w-56">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/65" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search player name or ID..."
                    className="w-full rounded-lg border border-blue-400/25 bg-[#040f30]/90 py-2 pl-8 pr-3 text-xs text-white placeholder:text-blue-300/50 focus:border-sky-400 focus:outline-none sm:py-1.5"
                  />
                </div>

                <CustomSelect
                  ariaLabel="Team filter"
                  size="sm"
                  value={teamFilter}
                  onChange={(val) => {
                    setTeamFilter(val);
                    setDraftTeam(val);
                    setPage(1);
                  }}
                  leadingIcon={<UsersIcon className="h-3.5 w-3.5" />}
                  className="flex-1 sm:w-36 sm:flex-none"
                  menuMinWidth={155}
                  options={[
                    { value: "all", label: "All Teams" },
                    ...divisionOptions.map((div) => ({ value: div, label: div })),
                  ]}
                />

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={filteredRows.length === 0}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_14px_rgba(37,99,235,0.5)] transition hover:from-blue-500 hover:to-sky-500 disabled:opacity-50 sm:flex-none sm:py-1.5"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Bulk Selection Action Bar */}
            {canRecord && selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/25 bg-blue-600/20 px-5 py-2.5 text-xs">
                <span className="font-bold text-sky-200">
                  {selectedIds.size} player(s) selected
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["Present", "Absent"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={saving}
                      onClick={() => void handleBulkMark(st)}
                      className={`rounded-lg border px-2.5 py-1 font-bold transition hover:brightness-110 disabled:opacity-50 ${STATUS_META[st].pill}`}
                    >
                      Mark {st}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-lg px-2 py-1 text-blue-200/80 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="m-4 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            {/* Table Body */}
            {loading ? (
              <div className="py-16 text-center text-sm text-blue-200/70">
                Loading attendance records...
              </div>
            ) : paginatedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/30">
                  <CalendarIcon className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-bold text-white">No players found.</p>
                <p className="mt-1 text-xs text-blue-200/70">
                  {canAddPlayer
                    ? "Add players to your roster to start recording attendance."
                    : "Try adjusting your search or filter settings."}
                </p>
                {canAddPlayer && (
                  <button
                    type="button"
                    onClick={() => setAddPlayerOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)]"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Player
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Attendance Card View (< md) */}
                <div className="divide-y divide-blue-400/15 md:hidden">
                  {paginatedRows.map((row) => {
                    const checked = selectedIds.has(row.player_user_id);
                    const displayName =
                      row.last_name && row.first_name
                        ? `${row.last_name}, ${row.first_name}`
                        : `${row.first_name} ${row.last_name}`.trim() ||
                          `Player #${row.player_user_id}`;

                    return (
                      <div
                        key={`mob-att-${row.player_user_id}`}
                        className={`space-y-3 p-4 ${checked ? "bg-blue-600/15" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${displayName}`}
                              checked={checked}
                              onChange={() => toggleSelectRow(row.player_user_id)}
                              className="h-4 w-4 shrink-0 rounded border-blue-400/40 bg-transparent accent-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => openHistoryModal(row)}
                              className="flex min-w-0 items-center gap-2.5 text-left"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-400/35 bg-gradient-to-br from-blue-600/80 to-sky-500/70 text-[11px] font-bold text-white">
                                {getInitials(row.first_name, row.last_name)}
                              </span>
                              <div className="min-w-0 leading-tight">
                                <p className="truncate text-sm font-bold text-white">{displayName}</p>
                                <p className="mt-0.5 text-[11px] text-blue-200/70">
                                  {[row.age_category || "ALAB", row.position || "Player"]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              </div>
                            </button>
                          </div>

                          <span
                            className={`inline-flex shrink-0 select-none items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusPillBadge(row.status)}`}
                          >
                            {row.status ? (
                              <>
                                <span>{STATUS_META[row.status].symbol}</span>
                                <span>{row.status}</span>
                              </>
                            ) : (
                              <span>Unmarked</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-blue-200/75">
                          <span>
                            {viewMode === "daily"
                              ? `Check In: ${formatTime(row.check_in_time)}`
                              : `Rate: ${row.attendance_rate ?? 0}%`}
                          </span>
                          {row.remarks && <span className="truncate">{row.remarks}</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openHistoryModal(row)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2 text-xs font-bold text-white"
                          >
                            <HistoryIcon className="h-3.5 w-3.5" />
                            Calendar
                          </button>
                          {canRecord && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  row.rawDaily ?? {
                                    player_user_id: row.player_user_id,
                                    first_name: row.first_name,
                                    last_name: row.last_name,
                                    jersey_number: row.jersey_number,
                                    age_category: row.age_category,
                                    position: row.position,
                                    status: row.status,
                                    attended: row.attended,
                                    check_in_time: row.check_in_time,
                                    remarks: row.remarks,
                                  }
                                )
                              }
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-200"
                            >
                              <EditIcon className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-blue-400/15 bg-blue-950/60 text-[11px] font-semibold uppercase tracking-wider text-blue-200/75">
                      <th className="w-10 py-3 pl-5 pr-2">
                        <input
                          type="checkbox"
                          aria-label="Select all players on page"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAllPage}
                          className="h-4 w-4 rounded border-blue-400/40 bg-transparent accent-blue-500"
                        />
                      </th>
                      <th className="px-2 py-3">#</th>
                      <th className="px-3 py-3">Player</th>
                      <th className="px-3 py-3">Team</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">
                        {viewMode === "daily" ? "Check In" : "Rate"}
                      </th>
                      <th className="px-3 py-3">Notes</th>
                      <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-400/10">
                    {paginatedRows.map((row, idx) => {
                      const checked = selectedIds.has(row.player_user_id);
                      const displayName =
                        row.last_name && row.first_name
                          ? `${row.last_name}, ${row.first_name}`
                          : `${row.first_name} ${row.last_name}`.trim() ||
                            `Player #${row.player_user_id}`;

                      return (
                        <tr
                          key={row.player_user_id}
                          className={`transition hover:bg-blue-500/[0.07] ${
                            checked ? "bg-blue-600/15" : ""
                          }`}
                        >
                          <td className="py-3 pl-5 pr-2">
                            <input
                              type="checkbox"
                              aria-label={`Select ${displayName}`}
                              checked={checked}
                              onChange={() => toggleSelectRow(row.player_user_id)}
                              className="h-4 w-4 rounded border-blue-400/40 bg-transparent accent-blue-500"
                            />
                          </td>
                          <td className="px-2 py-3 font-mono text-xs text-blue-200/80">
                            {row.jersey_number ?? startIdx + idx + 1}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => openHistoryModal(row)}
                              className="flex items-center gap-3 text-left group"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-400/35 bg-gradient-to-br from-blue-600/80 to-sky-500/70 text-[11px] font-bold text-white">
                                {getInitials(row.first_name, row.last_name)}
                              </span>
                              <div className="leading-tight">
                                <p className="font-bold text-white group-hover:text-sky-300">
                                  {displayName}
                                </p>
                                <p className="text-[11px] text-blue-200/70">
                                  {row.position || "Player"}
                                </p>
                              </div>
                            </button>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-100">
                              <Image src={crest} alt="ALAB" className="h-4 w-auto" />
                              <span>{row.age_category || "ALAB"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex select-none items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusPillBadge(row.status)}`}
                            >
                              {row.status ? (
                                <>
                                  <span>{STATUS_META[row.status].symbol}</span>
                                  <span>{row.status}</span>
                                </>
                              ) : (
                                <span>Unmarked</span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-blue-100/85">
                            {viewMode === "daily" ? (
                              formatTime(row.check_in_time)
                            ) : (
                              <span className="font-bold text-emerald-300">
                                {row.attendance_rate ?? 0}%
                              </span>
                            )}
                          </td>
                          <td className="max-w-[160px] truncate px-3 py-3 text-xs text-blue-200/75">
                            {row.remarks || "-"}
                          </td>
                          <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {canRecord && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(
                                      row.rawDaily ?? {
                                        player_user_id: row.player_user_id,
                                        first_name: row.first_name,
                                        last_name: row.last_name,
                                        jersey_number: row.jersey_number,
                                        age_category: row.age_category,
                                        position: row.position,
                                        status: row.status,
                                        attended: row.attended,
                                        check_in_time: row.check_in_time,
                                        remarks: row.remarks,
                                      }
                                    )
                                  }
                                  title="Edit status & remarks"
                                  className="rounded-lg p-1.5 text-blue-200/80 transition hover:bg-blue-500/20 hover:text-white"
                                >
                                  <EditIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openHistoryModal(row)}
                                title="View player daily attendance history"
                                className="rounded-lg p-1.5 text-sky-300/85 transition hover:bg-sky-500/20 hover:text-white"
                              >
                                <HistoryIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}

            {/* Table Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-400/15 bg-blue-950/40 px-5 py-3 text-xs text-blue-200/80">
              <span>
                Showing{" "}
                <strong className="text-white">
                  {filteredRows.length === 0 ? 0 : startIdx + 1} -{" "}
                  {Math.min(startIdx + pageSize, filteredRows.length)}
                </strong>{" "}
                of <strong className="text-white">{filteredRows.length}</strong> players
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-950/70 text-blue-200 hover:bg-blue-800/60 disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                        p === safePage
                          ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                          : "border border-blue-400/20 bg-blue-950/60 text-blue-200 hover:bg-blue-800/50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-950/70 text-blue-200 hover:bg-blue-800/60 disabled:opacity-40"
                >
                  ›
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span>Items per page:</span>
                <CustomSelect
                  ariaLabel="Items per page"
                  size="xs"
                  value={String(pageSize)}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                  className="w-[70px]"
                  menuMinWidth={88}
                  options={[8, 15, 25, 50].map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR COLUMN (3/12): Filter & Search + Attendance Summary Donut */}
        <div className="space-y-5 xl:col-span-3">
          {/* Filter & Search Card */}
          <div className="dash-card rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-blue-400/15 pb-3">
              <FilterIcon className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Filter &amp; Search</h3>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-blue-200/85">
                <CalendarIcon className="h-3.5 w-3.5 text-sky-400" />
                Date
              </label>
              <CustomDatePicker
                ariaLabel="Filter date"
                size="sm"
                value={draftDate}
                onChange={(val) => setDraftDate(val || today)}
                clearFallback={today}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-blue-200/80">
                Session View
              </label>
              <CustomSelect
                ariaLabel="Session view"
                size="sm"
                value={draftViewMode}
                onChange={(val) => setDraftViewMode(val as ViewMode)}
                leadingIcon={<HistoryIcon className="h-3.5 w-3.5" />}
                className="w-full"
                options={[
                  { value: "daily", label: "Daily Session" },
                  { value: "history-month", label: "Monthly History" },
                  { value: "history-all", label: "All-Time History" },
                ]}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-blue-200/80">Team</label>
              <CustomSelect
                ariaLabel="Filter team"
                size="sm"
                value={draftTeam}
                onChange={setDraftTeam}
                leadingIcon={<UsersIcon className="h-3.5 w-3.5" />}
                className="w-full"
                options={[
                  { value: "all", label: "All Teams" },
                  ...divisionOptions.map((div) => ({ value: div, label: div })),
                ]}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-blue-200/80">Status</label>
              <CustomSelect
                ariaLabel="Filter status"
                size="sm"
                value={draftStatus}
                onChange={(val) => setDraftStatus(val as StatusFilter)}
                className="w-full"
                options={[
                  {
                    value: "all",
                    label: "All Status",
                    icon: <FilterIcon className="h-3.5 w-3.5" />,
                  },
                  {
                    value: "Present",
                    label: "Present",
                    icon: <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />,
                  },
                  {
                    value: "Absent",
                    label: "Absent",
                    icon: <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]" />,
                  },
                  {
                    value: "unmarked",
                    label: "Unmarked",
                    icon: <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />,
                  },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-xl border border-blue-400/25 bg-[#051136] py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-900/60 hover:text-white"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplySidebarFilters}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.5)] transition hover:from-blue-500 hover:to-sky-400"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Attendance Summary Donut Card */}
          <div className="dash-card rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-blue-400/15 pb-3">
              <CalendarIcon className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Attendance Summary</h3>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* Glowing Teal-Blue Donut Ring */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48"
                    cy="48"
                    r={ringR}
                    fill="none"
                    stroke="rgba(59,130,246,0.22)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={ringR}
                    fill="none"
                    stroke="url(#attSummaryGrad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringOffset}
                  />
                  <defs>
                    <linearGradient id="attSummaryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-center leading-tight">
                  <p className="text-lg font-extrabold text-white">{ringPct}%</p>
                  <p className="text-[10px] font-medium text-blue-200/80">Present</p>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-100/85">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Present
                  </span>
                  <span className="font-bold text-white">{stats.present}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-100/85">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    Absent
                  </span>
                  <span className="font-bold text-white">{stats.absent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-100/85">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Total
                  </span>
                  <span className="font-bold text-white">{stats.total}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-400/20 bg-blue-950/60 p-3 text-[11px] leading-relaxed text-blue-200/80">
              Attendance records are automatically saved. Use the pencil icon or Mark Attendance to
              update anytime.
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* ==================== MARK / EDIT ATTENDANCE MODAL ==================== */}
      {markModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setMarkModalOpen(false)}
          />
          <div className="dash-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2368] to-[#07184a] px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingPlayer
                    ? `Edit Attendance — ${editingPlayer.first_name} ${editingPlayer.last_name}`
                    : "Mark Player Attendance"}
                </h3>
                <p className="text-xs text-blue-200/75">{formatLongDate(modalDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setMarkModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form method="post" onSubmit={handleSaveModalAttendance} className="space-y-4 p-5">
              {!editingPlayer && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Select Player
                  </label>
                  <CustomSelect
                    ariaLabel="Select player"
                    value={String(modalPlayerId)}
                    onChange={(val) => setModalPlayerId(Number(val))}
                    leadingIcon={<UsersIcon className="h-4 w-4" />}
                    placeholder="No players available — add a player first"
                    disabled={(daily?.players ?? []).length === 0}
                    className="w-full"
                    options={(daily?.players ?? []).map((p) => ({
                      value: String(p.player_user_id),
                      label: `${p.jersey_number !== null ? `#${p.jersey_number} ` : ""}${p.first_name} ${p.last_name}`.trim(),
                      sublabel: p.age_category || "ALAB FC",
                    }))}
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold text-blue-200">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Present", "Absent"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setModalStatus(st)}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                        modalStatus === st
                          ? STATUS_META[st].btnActive
                          : "border-blue-400/25 bg-[#040f30] text-blue-200 hover:border-blue-400/50 hover:text-white"
                      }`}
                    >
                      {STATUS_META[st].symbol} {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-blue-200">
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  placeholder="e.g. On time, Injured, Family matter..."
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMarkModalOpen(false)}
                  className="rounded-xl border border-blue-400/25 bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !modalPlayerId}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD PLAYER MODAL ==================== */}
      <AddPlayerModal
        open={addPlayerOpen}
        onClose={() => setAddPlayerOpen(false)}
        onCreated={() => {
          setToast({ type: "success", message: "Player added successfully!" });
          void loadData();
          if (onAttendanceChanged) onAttendanceChanged();
        }}
      />
    </div>
  );
}

function KpiCard({
  icon,
  iconClass,
  label,
  value,
  valueClass,
  sub,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  valueClass: string;
  sub: string;
}) {
  return (
    <div className="dash-card flex items-center gap-3.5 rounded-2xl p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[11px] font-semibold text-blue-200/80">{label}</p>
        <p className={`mt-1 text-2xl font-extrabold leading-none ${valueClass}`}>{value}</p>
        <p className="mt-1 truncate text-[10px] text-blue-200/65">{sub}</p>
      </div>
    </div>
  );
}
