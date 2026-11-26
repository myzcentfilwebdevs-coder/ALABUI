"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import crest from "@/app/logo/logoALAB.png";
import alabBall from "@/app/logo/ball.png";
import stadiumBg from "@/app/logo/backgoundimage.png";
import {
  addPlayersToTournamentRoster,
  addTournamentMatches,
  createTournament,
  deleteTournament,
  deleteTournamentMatch,
  fetchAllPlayersRoster,
  fetchMyPlayers,
  fetchTournamentDetail,
  fetchTournaments,
  getLocalTodayISO,
  removeRosterPlayer,
  updateRosterParentConsent,
  updateTournament,
  updateTournamentMatch,
  type CreateMatchPayload,
  type LinkedPlayer,
  type TournamentDetail,
  type TournamentItem,
  type TournamentMatch,
} from "@/lib/api";
import {
  BarChartIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  EditIcon,
  FilterIcon,
  GridIcon,
  MapPinIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  TrashIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import ConfirmModal from "./ConfirmModal";

const ALL_CATEGORIES = ["U-8", "U-10", "U-12", "U-14", "U-16", "U-18", "Senior"] as const;
const TOURNAMENT_STATUSES = ["Upcoming", "Ongoing", "Completed", "Cancelled"] as const;
const MATCH_STATUSES = ["Scheduled", "Live", "Completed", "Cancelled"] as const;

type WorkspaceTab = "schedule" | "categories" | "standings" | "teams" | "results" | "settings";

interface TournamentsManagerProps {
  roleId: number;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageRoster: boolean;
  canApproveConsent: boolean;
  onDataChanged?: () => void;
}

interface DraftMatchRow {
  key: string;
  age_category: string;
  game_label: string;
  home_team: string;
  opponent: string;
  match_date: string;
  match_time: string;
  pitch: string;
  remarks: string;
}

function formatPeso(amount: number): string {
  if (!amount) return "Free";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(iso: string): string {
  if (!iso) return "TBA";
  const parts = iso.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatPeriodRange(start: string, end: string): string {
  if (!start) return "TBA";
  const sp = start.slice(0, 10).split("-").map(Number);
  const ep = (end || start).slice(0, 10).split("-").map(Number);
  if (sp.length !== 3 || sp.some(Number.isNaN)) return start;
  const sd = new Date(sp[0], sp[1] - 1, sp[2]);
  if (!end || end === start || ep.length !== 3 || ep.some(Number.isNaN)) {
    return sd.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }
  const ed = new Date(ep[0], ep[1] - 1, ep[2]);
  const sLabel = sd.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  const eLabel = ed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return `${sLabel} – ${eLabel}`;
}

function getDateParts(iso: string): { monthDay: string; weekday: string } {
  const parts = iso.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return { monthDay: iso || "TBA", weekday: "" };
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return {
    monthDay: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase(),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function formatMatchTime(raw: string): string {
  if (!raw) return "TBA";
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw;
  const h24 = Number(m[1]);
  const min = m[2];
  if (Number.isNaN(h24)) return raw;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${min} ${suffix}`;
}

function toTimeInputValue(raw: string): string {
  const m = raw.match(/^(\d{2}:\d{2})/);
  return m ? m[1] : "08:00";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function categoryFullLabel(cat: string): string {
  const m = cat.match(/^U-?(\d+)$/i);
  if (m) return `Category ${cat} (Under ${m[1]})`;
  if (/senior/i.test(cat)) return "Category Senior (Open)";
  return `Category ${cat}`;
}

function categoryBadgeStyle(cat: string): string {
  const c = cat.toUpperCase().replace("-", "");
  if (c === "U8") return "bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]";
  if (c === "U10") return "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-[0_0_12px_rgba(167,139,250,0.45)]";
  if (c === "U12") return "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-[0_0_12px_rgba(52,211,153,0.45)]";
  if (c === "U14") return "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_12px_rgba(251,146,60,0.45)]";
  if (c === "U16") return "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.45)]";
  if (c === "U18") return "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_0_12px_rgba(34,211,238,0.45)]";
  return "bg-gradient-to-r from-indigo-500 to-blue-600 text-white";
}

function matchStatusPill(status: string): { label: string; className: string } {
  const s = status.toLowerCase();
  if (/live/.test(s)) {
    return {
      label: "Live",
      className:
        "border-emerald-400/60 bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.55)]",
    };
  }
  if (/completed|finished/.test(s)) {
    return {
      label: "Finished",
      className:
        "border-violet-400/50 bg-gradient-to-r from-violet-600/80 to-purple-600/80 text-white",
    };
  }
  if (/cancel/.test(s)) {
    return {
      label: "Cancelled",
      className: "border-rose-400/45 bg-rose-500/20 text-rose-200",
    };
  }
  return {
    label: "Upcoming",
    className:
      "border-sky-400/55 bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_0_14px_rgba(56,189,248,0.45)]",
  };
}

function categoryRangePill(categories: string[]): string {
  if (categories.length === 0) return "All Categories";
  if (categories.length === 1) return `${categories[0]} Category`;
  return `${categories[0]} – ${categories[categories.length - 1]} Categories`;
}

function makeBlankMatchRow(category: string, date: string, index: number): DraftMatchRow {
  const cat = category || "U-8";
  return {
    key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    age_category: cat,
    game_label: `Game ${index + 1}`,
    home_team: `ALAB FC ${cat}`,
    opponent: "",
    match_date: date || getLocalTodayISO(),
    match_time: "08:00",
    pitch: "Pitch A",
    remarks: "",
  };
}

function SilverTrophyGraphic({ className = "h-20 w-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="silverCup" x1="28" y1="14" x2="92" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="30%" stopColor="#cbd5e1" />
          <stop offset="58%" stopColor="#ffffff" />
          <stop offset="85%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="silverBase" x1="36" y1="90" x2="84" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* Left handle */}
      <path
        d="M34 26H18C14 26 12 31 14 38C17 50 26 58 37 60"
        stroke="url(#silverCup)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Right handle */}
      <path
        d="M86 26H102C106 26 108 31 106 38C103 50 94 58 83 60"
        stroke="url(#silverCup)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Cup bowl */}
      <path
        d="M32 18H88L84 52C82 68 72 78 60 78C48 78 38 68 36 52L32 18Z"
        fill="url(#silverCup)"
        stroke="#e2e8f0"
        strokeWidth="1.5"
      />
      {/* Rim shine */}
      <ellipse cx="60" cy="18" rx="28" ry="5" fill="#e2e8f0" stroke="#ffffff" strokeWidth="1" />
      <ellipse cx="60" cy="18" rx="22" ry="3" fill="#0f172a" opacity="0.55" />
      {/* Stem */}
      <path d="M53 77H67L69 92H51L53 77Z" fill="url(#silverCup)" />
      <rect x="42" y="91" width="36" height="6" rx="3" fill="url(#silverCup)" />
      {/* Pedestal */}
      <path d="M36 97H84L88 110H32L36 97Z" fill="url(#silverBase)" stroke="#94a3b8" strokeWidth="1.2" />
      <rect x="48" y="101" width="24" height="5" rx="1.5" fill="#cbd5e1" opacity="0.85" />
    </svg>
  );
}

const OPPONENT_PALETTES = [
  { top: "#38bdf8", bot: "#1d4ed8", ring: "#7dd3fc" },
  { top: "#f43f5e", bot: "#9f1239", ring: "#fda4af" },
  { top: "#f59e0b", bot: "#b45309", ring: "#fcd34d" },
  { top: "#10b981", bot: "#065f46", ring: "#6ee7b7" },
  { top: "#a855f7", bot: "#581c87", ring: "#d8b4fe" },
] as const;

function TeamCrest({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const isAlab = /\balab\b/i.test(name);
  const dim = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  if (isAlab) {
    return (
      <Image
        src={crest}
        alt="ALAB FC"
        className={`${dim} shrink-0 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.55)]`}
      />
    );
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % OPPONENT_PALETTES.length;
  }
  const palette = OPPONENT_PALETTES[Math.abs(hash) % OPPONENT_PALETTES.length];
  const initials = getInitials(name);

  return (
    <svg viewBox="0 0 36 36" className={`${dim} shrink-0 drop-shadow-[0_0_6px_rgba(15,23,42,0.8)]`} aria-hidden="true">
      <path
        d="M18 2.5L31 7.2V17.4C31 25.1 25.4 30.8 18 33.5C10.6 30.8 5 25.1 5 17.4V7.2L18 2.5Z"
        fill={palette.bot}
        stroke={palette.ring}
        strokeWidth="1.8"
      />
      <path
        d="M18 4.6L29 8.5V16.8C29 18.2 28.8 19.6 28.4 20.8L7.6 12.6V8.5L18 4.6Z"
        fill={palette.top}
        opacity="0.55"
      />
      <text
        x="18"
        y="21.5"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="11"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
}

export default function TournamentsManager({
  roleId,
  canCreate,
  canEdit,
  canDelete,
  canManageRoster,
  canApproveConsent,
  onDataChanged,
}: TournamentsManagerProps) {
  const isParent = roleId === 7;
  const todayISO = getLocalTodayISO();

  // Data
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Navigation & Filter state
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("schedule");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [matchSearch, setMatchSearch] = useState<string>("");
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>("all");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["U-8", "U-10"]));

  // Club players & parent's children IDs
  const [clubPlayers, setClubPlayers] = useState<LinkedPlayer[]>([]);
  const [myChildIds, setMyChildIds] = useState<Set<number>>(new Set());

  // Modals: Create / Edit Tournament
  const [tourModalOpen, setTourModalOpen] = useState<boolean>(false);
  const [editingTournamentId, setEditingTournamentId] = useState<number | null>(null);
  const [tTitle, setTTitle] = useState<string>("");
  const [tDescription, setTDescription] = useState<string>("");
  const [tVenue, setTVenue] = useState<string>("");
  const [tStartDate, setTStartDate] = useState<string>(todayISO);
  const [tEndDate, setTEndDate] = useState<string>(todayISO);
  const [tStatus, setTStatus] = useState<string>("Upcoming");
  const [tFee, setTFee] = useState<string>("0");
  const [tCategories, setTCategories] = useState<string[]>(["U-8", "U-10", "U-12", "U-14"]);
  const [tInitialMatches, setTInitialMatches] = useState<DraftMatchRow[]>([]);
  const [tSaving, setTSaving] = useState<boolean>(false);
  const [tModalError, setTModalError] = useState<string | null>(null);

  // Add Matches Modal
  const [addMatchesOpen, setAddMatchesOpen] = useState<boolean>(false);
  const [draftMatches, setDraftMatches] = useState<DraftMatchRow[]>([]);
  const [savingMatches, setSavingMatches] = useState<boolean>(false);
  const [matchModalError, setMatchModalError] = useState<string | null>(null);

  // Edit Match / Score Modal
  const [editingMatch, setEditingMatch] = useState<TournamentMatch | null>(null);
  const [mCategory, setMCategory] = useState<string>("U-8");
  const [mLabel, setMLabel] = useState<string>("");
  const [mHomeTeam, setMHomeTeam] = useState<string>("ALAB FC U-8");
  const [mOpponent, setMOpponent] = useState<string>("");
  const [mDate, setMDate] = useState<string>(todayISO);
  const [mTime, setMTime] = useState<string>("08:00");
  const [mPitch, setMPitch] = useState<string>("");
  const [mAlabScore, setMAlabScore] = useState<string>("");
  const [mOppScore, setMOppScore] = useState<string>("");
  const [mStatus, setMStatus] = useState<string>("Scheduled");
  const [mRemarks, setMRemarks] = useState<string>("");
  const [savingEditMatch, setSavingEditMatch] = useState<boolean>(false);
  const [editMatchError, setEditMatchError] = useState<string | null>(null);

  // Add Roster Modal
  const [addRosterOpen, setAddRosterOpen] = useState<boolean>(false);
  const [rosterPickIds, setRosterPickIds] = useState<Set<number>>(new Set());
  const [rosterPickSearch, setRosterPickSearch] = useState<string>("");
  const [rosterPickCat, setRosterPickCat] = useState<string>("all");
  const [rosterPickRemarks, setRosterPickRemarks] = useState<string>("Confirmed lineup");
  const [savingRoster, setSavingRoster] = useState<boolean>(false);
  const [rosterModalError, setRosterModalError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState<boolean>(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setError(null);
    const res = await fetchTournamentDetail(id);
    setDetailLoading(false);
    if (res.ok && res.data) {
      setDetail(res.data);
      const cats = res.data.age_categories;
      setExpandedCats(new Set(cats.slice(0, 2)));
    } else {
      setError(res.message || "Failed to load tournament details.");
    }
  }, []);

  const loadAll = useCallback(
    async (preferId?: number) => {
      setLoading(true);
      setError(null);
      const [listRes, mineRes] = await Promise.all([
        fetchTournaments(),
        isParent ? fetchMyPlayers() : Promise.resolve(null),
      ]);
      setLoading(false);

      if (mineRes && mineRes.ok) {
        setMyChildIds(new Set(mineRes.data.map((c) => c.player_user_id)));
      }

      if (listRes.ok) {
        setTournaments(listRes.data);
        if (listRes.data.length === 0) {
          setSelectedId(null);
          setDetail(null);
          return;
        }
        const targetId =
          preferId && listRes.data.some((t) => t.id === preferId)
            ? preferId
            : selectedId && listRes.data.some((t) => t.id === selectedId)
            ? selectedId
            : listRes.data.find((t) => /ongoing|upcoming/i.test(t.status))?.id ??
              listRes.data[0].id;
        setSelectedId(targetId);
        await loadDetail(targetId);
      } else {
        setError(listRes.message || "Failed to load tournaments.");
      }
    },
    [isParent, selectedId, loadDetail]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAll();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParent]);

  async function handleSwitchTournament(nextId: number) {
    setSelectedId(nextId);
    setSelectedCat("all");
    setMatchSearch("");
    setMatchStatusFilter("all");
    await loadDetail(nextId);
  }

  function openCreateTournamentModal() {
    setEditingTournamentId(null);
    setTTitle("");
    setTDescription("Play Hard. Dream Big.");
    setTVenue("");
    setTStartDate(todayISO);
    setTEndDate(todayISO);
    setTStatus("Upcoming");
    setTFee("0");
    setTCategories(["U-8", "U-10", "U-12", "U-14"]);
    setTInitialMatches([]);
    setTModalError(null);
    setTourModalOpen(true);
  }

  function openEditTournamentModal(item: TournamentItem) {
    setEditingTournamentId(item.id);
    setTTitle(item.title);
    setTDescription(item.description);
    setTVenue(item.venue === "TBA" ? "" : item.venue);
    setTStartDate(item.start_date || todayISO);
    setTEndDate(item.end_date || item.start_date || todayISO);
    setTStatus(item.status || "Upcoming");
    setTFee(String(item.registration_fee ?? 0));
    setTCategories(item.age_categories.length > 0 ? item.age_categories : ["U-8"]);
    setTInitialMatches([]);
    setTModalError(null);
    setTourModalOpen(true);
  }

  function toggleCategoryChip(cat: string) {
    setTCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSaveTournament(e: FormEvent) {
    e.preventDefault();
    setTModalError(null);

    if (!tTitle.trim()) {
      setTModalError("Please enter a tournament title (e.g. Maximo Cup 2026).");
      return;
    }
    if (!tVenue.trim()) {
      setTModalError("Please enter a venue.");
      return;
    }
    if (tCategories.length === 0) {
      setTModalError("Select at least one age category.");
      return;
    }

    const validInitialMatches: CreateMatchPayload[] = [];
    for (const row of tInitialMatches) {
      if (!row.opponent.trim() && !row.game_label.trim()) continue;
      if (!row.opponent.trim()) {
        setTModalError(`Enter an opponent for ${row.age_category} ${row.game_label || "match"}.`);
        return;
      }
      validInitialMatches.push({
        age_category: row.age_category,
        game_label: row.game_label.trim() || "Game 1",
        home_team: row.home_team.trim() || `ALAB FC ${row.age_category}`,
        opponent: row.opponent.trim(),
        match_date: row.match_date || tStartDate,
        match_time: row.match_time || "08:00",
        pitch: row.pitch.trim(),
        remarks: row.remarks.trim(),
      });
    }

    setTSaving(true);
    const res = editingTournamentId
      ? await updateTournament(editingTournamentId, {
          title: tTitle,
          description: tDescription,
          venue: tVenue,
          start_date: tStartDate,
          end_date: tEndDate || tStartDate,
          age_categories: tCategories,
          status: tStatus,
          registration_fee: Number(tFee) || 0,
        })
      : await createTournament({
          title: tTitle,
          description: tDescription,
          venue: tVenue,
          start_date: tStartDate,
          end_date: tEndDate || tStartDate,
          age_categories: tCategories,
          status: tStatus,
          registration_fee: Number(tFee) || 0,
          matches: validInitialMatches,
        });
    setTSaving(false);

    if (res.ok) {
      setTourModalOpen(false);
      const createdId = Number(
        (res.data as Record<string, unknown> | null)?.id ??
          ((res.data as Record<string, unknown> | null)?.data as Record<string, unknown> | undefined)
            ?.id ??
          editingTournamentId ??
          0
      );
      setToast({
        type: "success",
        message: editingTournamentId
          ? "Tournament updated!"
          : `Created "${tTitle.trim()}"! ALAB FC crest is ready on all matches.`,
      });
      await loadAll(createdId > 0 ? createdId : undefined);
      if (onDataChanged) onDataChanged();
    } else {
      setTModalError(res.message || "Failed to save tournament.");
    }
  }

  function handleDeleteTournament(item: TournamentItem) {
    if (busyId) return;
    setConfirmAction({
      title: "Delete Tournament?",
      message: `Are you sure you want to delete "${item.title}" and all of its match schedules and roster entries? This action cannot be undone.`,
      confirmLabel: "Delete Tournament",
      onConfirm: async () => {
        setBusyId(`del-tour-${item.id}`);
        const res = await deleteTournament(item.id);
        setBusyId(null);

        if (res.ok || res.status === 404) {
          setToast({
            type: "success",
            message:
              res.status === 404
                ? `"${item.title}" was already removed from the database. List refreshed.`
                : `Permanently deleted "${item.title}".`,
          });
          setTournaments((prev) => prev.filter((t) => t.id !== item.id));
          if (selectedId === item.id) {
            setSelectedId(null);
            setDetail(null);
          }
          await loadAll();
          if (onDataChanged) onDataChanged();
        } else {
          setToast({ type: "error", message: res.message || "Failed to delete tournament." });
        }
      },
    });
  }

  function openAddMatchesModal(defaultCategory?: string) {
    if (!detail) return;
    const cat =
      defaultCategory && defaultCategory !== "all"
        ? defaultCategory
        : selectedCat !== "all"
        ? selectedCat
        : detail.age_categories[0] || "U-8";
    const existingCount = detail.matches.filter((m) => m.age_category === cat).length;
    setDraftMatches([makeBlankMatchRow(cat, detail.start_date || todayISO, existingCount)]);
    setMatchModalError(null);
    setAddMatchesOpen(true);
  }

  async function handleSaveNewMatches(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setMatchModalError(null);

    const payload: CreateMatchPayload[] = [];
    for (const row of draftMatches) {
      if (!row.home_team.trim() || !row.opponent.trim()) {
        setMatchModalError("Please enter both Team A and Team B names for each match.");
        return;
      }
      payload.push({
        age_category: row.age_category,
        game_label: row.game_label.trim() || "Game 1",
        home_team: row.home_team.trim(),
        opponent: row.opponent.trim(),
        match_date: row.match_date || detail.start_date || todayISO,
        match_time: row.match_time || "08:00",
        pitch: row.pitch.trim(),
        remarks: row.remarks.trim(),
      });
    }

    setSavingMatches(true);
    const res = await addTournamentMatches(detail.id, payload);
    setSavingMatches(false);

    if (res.ok) {
      setAddMatchesOpen(false);
      setToast({
        type: "success",
        message: `Added ${payload.length} match${payload.length > 1 ? "es" : ""} with ALAB FC logo!`,
      });
      await loadDetail(detail.id);
      setExpandedCats((prev) => {
        const next = new Set(prev);
        for (const p of payload) next.add(p.age_category);
        return next;
      });
    } else {
      setMatchModalError(res.message || "Failed to add match.");
    }
  }

  function openEditMatchModal(match: TournamentMatch) {
    setEditingMatch(match);
    setMCategory(match.age_category || "U-8");
    setMLabel(match.game_label);
    setMHomeTeam(match.home_team || `ALAB FC ${match.age_category || ""}`.trim());
    setMOpponent(match.opponent);
    setMDate(match.match_date || detail?.start_date || todayISO);
    setMTime(toTimeInputValue(match.match_time));
    setMPitch(match.pitch);
    setMAlabScore(match.alab_score !== null ? String(match.alab_score) : "");
    setMOppScore(match.opponent_score !== null ? String(match.opponent_score) : "");
    setMStatus(match.status || "Scheduled");
    setMRemarks(match.remarks);
    setEditMatchError(null);
  }

  async function handleSaveEditMatch(e: FormEvent) {
    e.preventDefault();
    if (!editingMatch || !detail) return;
    setEditMatchError(null);

    const alabNum = mAlabScore.trim() !== "" ? Number(mAlabScore) : null;
    const oppNum = mOppScore.trim() !== "" ? Number(mOppScore) : null;

    setSavingEditMatch(true);
    const res = await updateTournamentMatch(editingMatch.id, {
      age_category: mCategory,
      game_label: mLabel,
      home_team: mHomeTeam,
      opponent: mOpponent,
      match_date: mDate,
      match_time: mTime,
      pitch: mPitch,
      alab_score: alabNum,
      opponent_score: oppNum,
      status: mStatus,
      remarks: mRemarks,
    });
    setSavingEditMatch(false);

    if (res.ok) {
      setEditingMatch(null);
      setToast({ type: "success", message: "Match updated!" });
      await loadDetail(detail.id);
    } else {
      setEditMatchError(res.message || "Failed to update match.");
    }
  }

  function handleDeleteMatch(match: TournamentMatch) {
    if (!detail || busyId) return;
    const tournamentId = detail.id;
    setConfirmAction({
      title: "Delete Match Schedule?",
      message: `Are you sure you want to delete ${match.age_category} ${match.game_label} (${match.home_team} vs ${match.opponent})? This action cannot be undone.`,
      confirmLabel: "Delete Match",
      onConfirm: async () => {
        setBusyId(`del-match-${match.id}`);
        const res = await deleteTournamentMatch(match.id);
        setBusyId(null);
        if (res.ok || res.status === 404) {
          setToast({
            type: "success",
            message:
              res.status === 404 ? "Match was already removed. Schedule refreshed." : "Match deleted.",
          });
          await loadDetail(tournamentId);
        } else {
          setToast({ type: "error", message: res.message || "Failed to delete match." });
        }
      },
    });
  }

  async function openAddRosterModal() {
    if (!detail) return;
    setRosterPickIds(new Set());
    setRosterPickSearch("");
    setRosterPickCat(selectedCat !== "all" ? selectedCat : "all");
    setRosterPickRemarks("Confirmed lineup");
    setRosterModalError(null);
    setAddRosterOpen(true);

    if (clubPlayers.length === 0) {
      const res = await fetchAllPlayersRoster();
      if (res.ok) setClubPlayers(res.data);
    }
  }

  async function handleSaveAddRoster(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const ids = Array.from(rosterPickIds);
    if (ids.length === 0) {
      setRosterModalError("Select at least one player.");
      return;
    }
    setSavingRoster(true);
    const res = await addPlayersToTournamentRoster(detail.id, {
      player_user_ids: ids,
      remarks: rosterPickRemarks,
    });
    setSavingRoster(false);
    if (res.ok) {
      setAddRosterOpen(false);
      setToast({ type: "success", message: `Added ${ids.length} player(s) to roster!` });
      await loadDetail(detail.id);
    } else {
      setRosterModalError(res.message || "Failed to add players.");
    }
  }

  async function handleToggleConsent(rosterId: number, currentConsent: boolean, playerName: string) {
    if (!detail || busyId) return;
    setBusyId(`consent-${rosterId}`);
    const next = !currentConsent;
    const res = await updateRosterParentConsent(rosterId, {
      parent_consent: next,
      remarks: next ? "Approved by parent" : "Consent revoked",
    });
    setBusyId(null);
    if (res.ok) {
      setToast({
        type: "success",
        message: next ? `Approved consent for ${playerName}.` : `Updated consent for ${playerName}.`,
      });
      await loadDetail(detail.id);
    } else {
      setToast({ type: "error", message: res.message || "Failed to update consent." });
    }
  }

  function handleRemoveRoster(rosterId: number, playerName: string) {
    if (!detail || busyId) return;
    const tournamentId = detail.id;
    const tournamentTitle = detail.title;
    setConfirmAction({
      title: "Remove Player from Roster?",
      message: `Are you sure you want to remove "${playerName}" from the ${tournamentTitle} roster?`,
      confirmLabel: "Remove Player",
      onConfirm: async () => {
        setBusyId(`rem-roster-${rosterId}`);
        const res = await removeRosterPlayer(rosterId);
        setBusyId(null);
        if (res.ok || res.status === 404) {
          setToast({
            type: "success",
            message:
              res.status === 404
                ? `${playerName} was already removed. Roster refreshed.`
                : `Removed ${playerName}.`,
          });
          await loadDetail(tournamentId);
        } else {
          setToast({ type: "error", message: res.message || "Failed to remove player." });
        }
      },
    });
  }

  function handleExportScheduleCsv() {
    if (!detail) return;
    const rows = [
      ["Category", "Game", "Date", "Time", "Home", "Opponent", "Score", "Pitch", "Status", "Notes"].join(","),
      ...detail.matches.map((m) =>
        [
          `"${m.age_category}"`,
          `"${m.game_label}"`,
          `"${m.match_date}"`,
          `"${formatMatchTime(m.match_time)}"`,
          `"${m.home_team.replace(/"/g, '""')}"`,
          `"${m.opponent.replace(/"/g, '""')}"`,
          `"${m.alab_score !== null && m.opponent_score !== null ? `${m.alab_score}-${m.opponent_score}` : ""}"`,
          `"${m.pitch}"`,
          `"${m.status}"`,
          `"${m.remarks.replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleCategoryAccordion(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Derived categories & filtered matches
  const detailCategories = useMemo(() => {
    if (!detail) return [];
    const set = new Set<string>(detail.age_categories);
    for (const m of detail.matches) if (m.age_category) set.add(m.age_category);
    for (const r of detail.rosters) if (r.age_category) set.add(r.age_category);
    return Array.from(set);
  }, [detail]);

  const filteredMatches = useMemo(() => {
    if (!detail) return [];
    const q = matchSearch.trim().toLowerCase();
    return detail.matches
      .filter((m) => {
        if (selectedCat !== "all" && m.age_category !== selectedCat) return false;
        if (matchStatusFilter !== "all") {
          const st = m.status.toLowerCase();
          if (matchStatusFilter === "upcoming" && !/scheduled|upcoming/.test(st)) return false;
          if (matchStatusFilter === "live" && !/live/.test(st)) return false;
          if (matchStatusFilter === "finished" && !/completed|finished/.test(st)) return false;
        }
        if (!q) return true;
        return (
          m.home_team.toLowerCase().includes(q) ||
          m.opponent.toLowerCase().includes(q) ||
          m.age_category.toLowerCase().includes(q) ||
          m.game_label.toLowerCase().includes(q) ||
          m.pitch.toLowerCase().includes(q) ||
          m.remarks.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => `${a.match_date} ${a.match_time}`.localeCompare(`${b.match_date} ${b.match_time}`));
  }, [detail, selectedCat, matchStatusFilter, matchSearch]);

  const categoryAccordionList = useMemo(() => {
    const catsToShow =
      selectedCat === "all" ? detailCategories : detailCategories.filter((c) => c === selectedCat);
    const map = new Map<string, TournamentMatch[]>();
    for (const c of catsToShow) map.set(c, []);
    for (const m of filteredMatches) {
      const key = m.age_category || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [detailCategories, selectedCat, filteredMatches]);

  // Complete Multi-Team Tournament Standings ("Tally") per Category — includes ALAB FC AND all opponents/other teams!
  const standingsByCategory = useMemo(() => {
    if (!detail) return [];
    const catsToShow =
      selectedCat === "all" ? detailCategories : detailCategories.filter((c) => c === selectedCat);

    return catsToShow.map((cat) => {
      const catMatches = detail.matches.filter((m) => m.age_category === cat);
      const table = new Map<
        string,
        {
          team: string;
          played: number;
          won: number;
          drawn: number;
          lost: number;
          gf: number;
          ga: number;
          gd: number;
          pts: number;
        }
      >();

      const ensureTeam = (rawName: string) => {
        const clean = rawName.trim();
        if (!clean || clean.toLowerCase() === "tba") return null;
        const key = clean.toLowerCase();
        if (!table.has(key)) {
          table.set(key, {
            team: clean,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          });
        }
        return table.get(key)!;
      };

      // Always include ALAB FC for the category if no custom ALAB match is listed yet
      if (!catMatches.some((m) => /\balab\b/i.test(m.home_team) || /\balab\b/i.test(m.opponent))) {
        ensureTeam(`ALAB FC ${cat}`);
      }

      for (const m of catMatches) {
        const teamA = ensureTeam(m.home_team || `ALAB FC ${cat}`);
        const teamB = ensureTeam(m.opponent);

        if (m.alab_score !== null && m.opponent_score !== null && teamA && teamB) {
          const sA = m.alab_score;
          const sB = m.opponent_score;

          teamA.played++;
          teamA.gf += sA;
          teamA.ga += sB;
          teamA.gd = teamA.gf - teamA.ga;

          teamB.played++;
          teamB.gf += sB;
          teamB.ga += sA;
          teamB.gd = teamB.gf - teamB.ga;

          if (sA > sB) {
            teamA.won++;
            teamA.pts += 3;
            teamB.lost++;
          } else if (sA < sB) {
            teamB.won++;
            teamB.pts += 3;
            teamA.lost++;
          } else {
            teamA.drawn++;
            teamA.pts += 1;
            teamB.drawn++;
            teamB.pts += 1;
          }
        }
      }

      const rows = Array.from(table.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        if (b.played !== a.played) return b.played - a.played;
        return a.team.localeCompare(b.team);
      });

      return { category: cat, matchCount: catMatches.length, rows };
    });
  }, [detail, detailCategories, selectedCat]);

  const completedResults = useMemo(() => {
    return filteredMatches.filter(
      (m) =>
        (m.alab_score !== null && m.opponent_score !== null) ||
        /completed|finished|live/i.test(m.status)
    );
  }, [filteredMatches]);

  const visibleRoster = useMemo(() => {
    if (!detail) return [];
    if (selectedCat === "all") return detail.rosters;
    return detail.rosters.filter((r) => r.age_category === selectedCat);
  }, [detail, selectedCat]);

  const existingRosterPlayerIds = useMemo(
    () => new Set((detail?.rosters ?? []).map((r) => r.player_user_id)),
    [detail?.rosters]
  );

  const modalFilteredClubPlayers = useMemo(() => {
    const q = rosterPickSearch.trim().toLowerCase();
    return clubPlayers.filter((p) => {
      if (rosterPickCat !== "all" && p.age_category !== rosterPickCat) return false;
      if (!q) return true;
      const full = (p.full_name || `${p.first_name} ${p.last_name}`).toLowerCase();
      return (
        full.includes(q) ||
        p.age_category.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q)
      );
    });
  }, [clubPlayers, rosterPickCat, rosterPickSearch]);

  // Real Recent Updates derived from live tournament matches & roster
  const recentUpdates = useMemo(() => {
    if (!detail) return [];
    const list: Array<{ id: string; time: string; text: string }> = [];
    for (const m of detail.matches.slice(0, 3)) {
      list.push({
        id: `m-${m.id}`,
        time: `${formatShortDate(m.match_date)} • ${formatMatchTime(m.match_time)}`,
        text: `${m.age_category} ${m.game_label}: ${m.home_team} vs ${m.opponent}`,
      });
    }
    if (detail.rosters.length > 0) {
      const approved = detail.rosters.filter((r) => r.parent_consent).length;
      list.push({
        id: "roster-count",
        time: "Tournament Roster",
        text: `${detail.rosters.length} player(s) listed (${approved} parent consent approved)`,
      });
    }
    return list.slice(0, 4);
  }, [detail]);

  const isSearchingMatches = matchSearch.trim().length > 0 || matchStatusFilter !== "all";

  return (
    <div className="space-y-4">
      {/* ==================== TOP STADIUM HERO BANNER (Matches Mockup!) ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#06184c] px-5 py-5 shadow-[0_16px_44px_-14px_rgba(37,99,235,0.6)] sm:px-6">
        <Image
          src={stadiumBg}
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="pointer-events-none object-cover object-right opacity-95"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041038]/92 via-[#072066]/60 to-[#040f33]/40" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/65 to-transparent" />

        {loading && !detail ? (
          <div className="relative py-8 text-center text-sm font-medium text-blue-100">
            Loading tournaments...
          </div>
        ) : !detail ? (
          /* Empty Hero State when no tournament exists yet */
          <div className="relative flex flex-wrap items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-4">
              <div className="hidden shrink-0 drop-shadow-[0_6px_22px_rgba(226,232,240,0.4)] sm:block">
                <SilverTrophyGraphic className="h-20 w-20" />
              </div>
              <div>
                <span className="inline-block rounded-full border border-sky-300/40 bg-blue-600/50 px-3 py-0.5 text-[11px] font-bold text-sky-100">
                  ALAB FC Tournaments
                </span>
                <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  No Tournaments Yet
                </h2>
                <p className="mt-0.5 text-xs italic text-blue-100/85 sm:text-sm">
                  &ldquo;Play Hard. Dream Big.&rdquo; Create your first tournament to build category schedules.
                </p>
              </div>
            </div>

            {canCreate && (
              <button
                type="button"
                onClick={openCreateTournamentModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-400 px-5 py-2.5 text-xs font-bold text-white shadow-[0_0_22px_rgba(56,189,248,0.65)] transition hover:from-blue-500 hover:to-sky-300"
              >
                <PlusIcon className="h-4 w-4" />
                Create Tournament
              </button>
            )}
          </div>
        ) : (
          /* Active Tournament Hero Banner */
          <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="hidden shrink-0 drop-shadow-[0_8px_24px_rgba(226,232,240,0.35)] sm:block">
                <SilverTrophyGraphic className="h-[82px] w-[82px]" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block rounded-full border border-sky-300/45 bg-gradient-to-r from-blue-600/80 to-sky-500/75 px-3 py-0.5 text-[11px] font-bold text-white shadow-[0_0_14px_rgba(56,189,248,0.4)]">
                    Current Tournament
                  </span>

                  {tournaments.length > 1 && (
                    <CustomSelect
                      ariaLabel="Switch tournament"
                      size="xs"
                      pill
                      value={String(detail.id)}
                      onChange={(val) => void handleSwitchTournament(Number(val))}
                      leadingIcon={<TrophyIcon className="h-3 w-3" />}
                      className="max-w-[230px]"
                      menuMinWidth={220}
                      options={tournaments.map((t) => ({
                        value: String(t.id),
                        label: `Switch: ${t.title}`,
                        sublabel: t.venue || t.status || undefined,
                      }))}
                    />
                  )}

                  {canCreate && (
                    <button
                      type="button"
                      onClick={openCreateTournamentModal}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-300/40 bg-[#041138]/80 px-2.5 py-0.5 text-[11px] font-bold text-sky-200 backdrop-blur-md transition hover:border-sky-300 hover:bg-blue-700/60 hover:text-white"
                    >
                      <PlusIcon className="h-3 w-3" />
                      New Tournament
                    </button>
                  )}
                </div>

                <h2 className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-white drop-shadow-xs sm:text-3xl">
                  {detail.title}
                </h2>
                <p className="mt-0.5 text-xs italic text-blue-100/85 sm:text-sm">
                  {detail.description ? `"${detail.description}"` : '"Play Hard. Dream Big."'}
                </p>
              </div>
            </div>

            {/* Right: Tournament Period + Category Range Pill */}
            <div className="flex flex-col items-start gap-2 sm:pr-12 lg:items-end lg:pr-24">
              <div className="flex items-center gap-2.5 text-left lg:text-right">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/30 bg-[#051442]/80 text-sky-300 backdrop-blur-sm">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-medium text-blue-200/80">Tournament Period</p>
                  <p className="text-sm font-extrabold text-white">
                    {formatPeriodRange(detail.start_date, detail.end_date)}
                  </p>
                </div>
              </div>
              <span className="inline-block rounded-full border border-sky-400/45 bg-blue-600/40 px-3.5 py-1 text-[11px] font-bold text-sky-100 backdrop-blur-md">
                {categoryRangePill(detailCategories)}
              </span>
            </div>
          </div>
        )}
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

      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {detail && (
        <>
          {/* ==================== HORIZONTAL TABS BAR (Schedule | Categories | Standings | Teams | Results | Settings) ==================== */}
          <div className="sidebar-scroll flex items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: "schedule", label: "Schedule", icon: CalendarIcon },
                { id: "categories", label: "Categories", icon: GridIcon },
                { id: "standings", label: "Standings", icon: BarChartIcon },
                { id: "teams", label: "Teams & Roster", icon: UsersIcon },
                { id: "results", label: "Results", icon: TrophyIcon },
                ...(canEdit || canDelete
                  ? [{ id: "settings" as const, label: "Settings", icon: SettingsIcon }]
                  : []),
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    active
                      ? "border-sky-300/60 bg-gradient-to-r from-blue-600 to-sky-400 text-white shadow-[0_0_20px_rgba(56,189,248,0.6)]"
                      : "border-blue-400/25 bg-[#05133a]/90 text-blue-200/85 hover:border-sky-400/50 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ==================== CATEGORY PILLS + SEARCH + FILTER + REFRESH ==================== */}
          {activeTab !== "settings" && (
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              {/* Category Pills */}
              <div className="sidebar-scroll flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCat("all")}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    selectedCat === "all"
                      ? "bg-gradient-to-r from-blue-600 to-sky-400 text-white shadow-[0_0_16px_rgba(56,189,248,0.55)]"
                      : "border border-blue-400/25 bg-[#05133a]/85 text-blue-200/85 hover:border-sky-400 hover:text-white"
                  }`}
                >
                  All Categories
                </button>
                {detailCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCat(cat);
                      setExpandedCats((prev) => new Set(prev).add(cat));
                    }}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      selectedCat === cat
                        ? "bg-gradient-to-r from-blue-600 to-sky-400 text-white shadow-[0_0_16px_rgba(56,189,248,0.55)]"
                        : "border border-blue-400/25 bg-[#05133a]/85 text-blue-200/85 hover:border-sky-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search + Filter + Refresh */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1 sm:w-52 sm:flex-none">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/65" />
                  <input
                    type="search"
                    value={matchSearch}
                    onChange={(e) => setMatchSearch(e.target.value)}
                    placeholder="Search matches..."
                    className="w-full rounded-xl border border-blue-400/25 bg-[#05133a]/90 py-2 pl-8 pr-3 text-xs text-white placeholder:text-blue-200/50 focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <CustomSelect
                  ariaLabel="Filter match status"
                  size="sm"
                  value={matchStatusFilter}
                  onChange={setMatchStatusFilter}
                  menuMinWidth={155}
                  options={[
                    {
                      value: "all",
                      label: "Filter",
                      icon: <FilterIcon className="h-3.5 w-3.5" />,
                    },
                    {
                      value: "upcoming",
                      label: "Upcoming",
                      icon: <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />,
                    },
                    {
                      value: "live",
                      label: "Live",
                      icon: <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />,
                    },
                    {
                      value: "finished",
                      label: "Finished",
                      icon: <span className="h-2.5 w-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />,
                    },
                  ]}
                />

                <button
                  type="button"
                  onClick={() => void loadDetail(detail.id)}
                  disabled={detailLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-[#05133a]/90 px-3.5 py-2 text-xs font-bold text-blue-100 transition hover:border-sky-400 hover:text-white disabled:opacity-50"
                >
                  <RefreshIcon className={`h-3.5 w-3.5 ${detailLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
          )}

          {/* ==================== MAIN 2-COLUMN WORKSPACE ==================== */}
          <div className="grid gap-5 xl:grid-cols-12">
            {/* LEFT (8/12): Active Tab Content */}
            <div className="space-y-4 xl:col-span-8">
              {activeTab === "schedule" && (
                <div className="dash-card overflow-hidden rounded-2xl p-4 sm:p-5">
                  {/* Card Header + Status Legend */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-blue-400/15 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                        <CalendarIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white">Tournament Schedule</h3>
                        <p className="text-xs text-blue-200/70">
                          {selectedCat === "all"
                            ? "Match schedule for all categories"
                            : `Match schedule for ${selectedCat}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-blue-100/85">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> Upcoming
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-400" /> Live
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-violet-400" /> Finished
                      </span>
                    </div>
                  </div>

                  {/* Category Accordion List */}
                  {categoryAccordionList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-blue-400/25 bg-[#040f30]/55 py-12 text-center">
                      <p className="text-sm font-bold text-white">No matches scheduled yet.</p>
                      <p className="mt-1 text-xs text-blue-200/70">
                        Click &ldquo;+ Add Match&rdquo; to schedule games for each category.
                      </p>
                      {canCreate && (
                        <button
                          type="button"
                          onClick={() => openAddMatchesModal()}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-400 px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.5)]"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add Match
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categoryAccordionList.map(([cat, matches]) => {
                        const isOpen =
                          selectedCat !== "all" || isSearchingMatches || expandedCats.has(cat);
                        return (
                          <div
                            key={cat}
                            className="overflow-hidden rounded-xl border border-blue-400/25 bg-[#040f30]/80"
                          >
                            {/* Category Accordion Header */}
                            <button
                              type="button"
                              onClick={() => toggleCategoryAccordion(cat)}
                              className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-[#081d59]/90 via-[#061748]/90 to-[#081d59]/90 px-4 py-3 text-left transition hover:brightness-110"
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className={`shrink-0 rounded-lg px-2.5 py-0.5 text-xs font-extrabold ${categoryBadgeStyle(cat)}`}
                                >
                                  {cat}
                                </span>
                                <span className="truncate text-sm font-bold text-white">
                                  {categoryFullLabel(cat)}
                                </span>
                              </div>

                              <div className="flex shrink-0 items-center gap-2.5">
                                <span className="rounded-lg border border-sky-400/35 bg-blue-600/30 px-2.5 py-0.5 text-[11px] font-bold text-sky-200">
                                  {matches.length} {matches.length === 1 ? "Match" : "Matches"}
                                </span>
                                <ChevronDownIcon
                                  className={`h-4 w-4 text-blue-200 transition-transform ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Match Rows */}
                            {isOpen && (
                              <div className="divide-y divide-blue-400/15">
                                {matches.length === 0 ? (
                                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-blue-200/70">
                                    <span>No matches scheduled for {cat} yet.</span>
                                    {canCreate && (
                                      <button
                                        type="button"
                                        onClick={() => openAddMatchesModal(cat)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-500/30"
                                      >
                                        <PlusIcon className="h-3 w-3" />
                                        Add {cat} Match
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  matches.map((match) => {
                                    const dt = getDateParts(match.match_date);
                                    const st = matchStatusPill(match.status);
                                    const hasScore =
                                      match.alab_score !== null && match.opponent_score !== null;
                                    const homeLabel =
                                      match.home_team || `ALAB FC ${match.age_category}`.trim();

                                    return (
                                      <div
                                        key={match.id}
                                        className="space-y-2.5 px-4 py-3.5 transition hover:bg-blue-600/10"
                                      >
                                        {/* Row 1: Full-Width Matchup (Never Truncates Team Names!) */}
                                        <div className="flex flex-col items-stretch justify-between gap-2.5 sm:flex-row sm:items-center sm:gap-4">
                                          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:justify-end sm:text-right">
                                            <TeamCrest name={homeLabel} />
                                            <span
                                              title={homeLabel}
                                              className="break-words text-sm font-bold leading-snug text-white"
                                            >
                                              {homeLabel}
                                            </span>
                                          </div>

                                          <div className="flex shrink-0 items-center justify-center">
                                            {hasScore ? (
                                              <span className="rounded-lg border border-sky-400/50 bg-blue-700/70 px-3 py-0.5 font-mono text-xs font-extrabold text-white shadow-[0_0_12px_rgba(56,189,248,0.45)]">
                                                {match.alab_score} - {match.opponent_score}
                                              </span>
                                            ) : (
                                              <span className="rounded-md border border-blue-400/25 bg-blue-950/80 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-200">
                                                VS
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:justify-start sm:text-left">
                                            <TeamCrest name={match.opponent} />
                                            <span
                                              title={match.opponent}
                                              className="break-words text-sm font-bold leading-snug text-blue-100"
                                            >
                                              {match.opponent}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Row 2: Date, Game Label, Time, Pitch, Status & Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-400/10 pt-2 text-xs">
                                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-blue-200/85">
                                            <span className="inline-flex items-center gap-1 font-bold text-white">
                                              <CalendarIcon className="h-3.5 w-3.5 text-sky-400" />
                                              {dt.monthDay}
                                              {dt.weekday ? ` (${dt.weekday})` : ""}
                                            </span>
                                            {match.game_label && (
                                              <span className="rounded bg-blue-900/70 px-1.5 py-0.5 text-[10px] font-bold text-blue-200">
                                                {match.game_label}
                                              </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 font-semibold text-blue-100/90">
                                              <ClockIcon className="h-3.5 w-3.5 text-sky-400" />
                                              {formatMatchTime(match.match_time)}
                                            </span>
                                            {match.pitch && (
                                              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200">
                                                {match.pitch}
                                              </span>
                                            )}
                                            {match.remarks && (
                                              <span className="text-[11px] italic text-blue-200/70">
                                                • {match.remarks}
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold ${st.className}`}
                                            >
                                              {st.label}
                                            </span>

                                            {canEdit && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => openEditMatchModal(match)}
                                                  title="Edit match or enter score"
                                                  aria-label="Edit match"
                                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/25 bg-[#06184a] text-blue-200 transition hover:border-sky-400 hover:text-white"
                                                >
                                                  <EditIcon className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={busyId === `del-match-${match.id}`}
                                                  onClick={() => void handleDeleteMatch(match)}
                                                  title="Delete match"
                                                  aria-label="Delete match"
                                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/25 hover:text-white disabled:opacity-50"
                                                >
                                                  <TrashIcon className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "categories" && (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {detailCategories.map((cat) => {
                    const catMatches = detail.matches.filter((m) => m.age_category === cat);
                    const catRoster = detail.rosters.filter((r) => r.age_category === cat);
                    const nextGame = catMatches[0];
                    return (
                      <div key={cat} className="dash-card flex flex-col justify-between gap-4 rounded-2xl p-4">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${categoryBadgeStyle(cat)}`}
                            >
                              {cat}
                            </span>
                            <span className="text-xs font-semibold text-blue-200/80">
                              {catMatches.length} Matches • {catRoster.length} Players
                            </span>
                          </div>
                          <h4 className="mt-2.5 text-base font-bold text-white">
                            {categoryFullLabel(cat)}
                          </h4>
                          <p className="mt-1 text-xs text-blue-200/75">
                            {nextGame
                              ? `Next: ${nextGame.game_label} vs ${nextGame.opponent} (${formatShortDate(nextGame.match_date)} • ${formatMatchTime(nextGame.match_time)})`
                              : "No games scheduled yet for this division."}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 border-t border-blue-400/15 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCat(cat);
                              setExpandedCats(new Set([cat]));
                              setActiveTab("schedule");
                            }}
                            className="flex-1 rounded-xl border border-sky-400/35 bg-sky-500/15 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/30 hover:text-white"
                          >
                            View Schedule
                          </button>
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => openAddMatchesModal(cat)}
                              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2 text-xs font-bold text-white"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                              Add Game
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "standings" && (
                <div className="space-y-4">
                  {standingsByCategory.length === 0 ? (
                    <div className="dash-card rounded-2xl p-8 text-center text-xs text-blue-200/75">
                      No categories configured yet.
                    </div>
                  ) : (
                    standingsByCategory.map((group) => (
                      <div key={group.category} className="dash-card overflow-hidden rounded-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-400/20 bg-[#051238]/75 px-4 py-3.5 sm:px-5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`rounded-lg px-2.5 py-0.5 text-xs font-extrabold ${categoryBadgeStyle(group.category)}`}
                            >
                              {group.category}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-white sm:text-base">
                                {categoryFullLabel(group.category)} — Tally / Standings
                              </h3>
                              <p className="text-[11px] text-blue-200/70">
                                {group.rows.length} {group.rows.length === 1 ? "team" : "teams"} •{" "}
                                {group.matchCount} {group.matchCount === 1 ? "match" : "matches"}
                              </p>
                            </div>
                          </div>

                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => openAddMatchesModal(group.category)}
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-500/30 hover:text-white"
                            >
                              <PlusIcon className="h-3 w-3" />
                              Add Match
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-blue-400/15 bg-[#040f30]/75 text-[11px] font-bold uppercase text-blue-200/75">
                                <th className="w-10 px-3 py-2.5 text-center">#</th>
                                <th className="px-3 py-2.5">Team</th>
                                <th className="px-2 py-2.5 text-center">P</th>
                                <th className="px-2 py-2.5 text-center">W</th>
                                <th className="px-2 py-2.5 text-center">D</th>
                                <th className="px-2 py-2.5 text-center">L</th>
                                <th className="px-2 py-2.5 text-center">GF</th>
                                <th className="px-2 py-2.5 text-center">GA</th>
                                <th className="px-2 py-2.5 text-center">GD</th>
                                <th className="px-3 py-2.5 text-center text-sky-300">PTS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-400/15">
                              {group.rows.map((row, idx) => {
                                const rank = idx + 1;
                                const isAlab = /\balab\b/i.test(row.team);
                                const rankClass =
                                  rank === 1 && row.played > 0
                                    ? "bg-amber-400/25 text-amber-300 ring-1 ring-amber-400/50"
                                    : rank === 2 && row.played > 0
                                    ? "bg-slate-300/20 text-slate-200 ring-1 ring-slate-300/40"
                                    : rank === 3 && row.played > 0
                                    ? "bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/40"
                                    : "text-blue-200/75";
                                return (
                                  <tr
                                    key={row.team}
                                    className={`transition hover:bg-blue-600/15 ${
                                      isAlab ? "bg-sky-500/[0.08]" : ""
                                    }`}
                                  >
                                    <td className="px-3 py-3 text-center">
                                      <span
                                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${rankClass}`}
                                      >
                                        {rank}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <TeamCrest name={row.team} size="sm" />
                                        <span
                                          className={`font-bold ${
                                            isAlab ? "text-sky-200" : "text-white"
                                          }`}
                                        >
                                          {row.team}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-3 text-center text-blue-100">
                                      {row.played}
                                    </td>
                                    <td className="px-2 py-3 text-center font-bold text-emerald-300">
                                      {row.won}
                                    </td>
                                    <td className="px-2 py-3 text-center text-blue-200">
                                      {row.drawn}
                                    </td>
                                    <td className="px-2 py-3 text-center text-rose-300">
                                      {row.lost}
                                    </td>
                                    <td className="px-2 py-3 text-center text-blue-100">
                                      {row.gf}
                                    </td>
                                    <td className="px-2 py-3 text-center text-blue-100">
                                      {row.ga}
                                    </td>
                                    <td className="px-2 py-3 text-center font-semibold text-blue-100">
                                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                                    </td>
                                    <td className="px-3 py-3 text-center font-extrabold text-sky-300">
                                      {row.pts}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "teams" && (
                <div className="dash-card overflow-hidden rounded-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-400/20 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                        <UsersIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          Tournament Roster &amp; Parent Consent ({visibleRoster.length})
                        </h3>
                        <p className="text-xs text-blue-200/70">
                          Confirmed ALAB FC players and parent consent approvals.
                        </p>
                      </div>
                    </div>

                    {canManageRoster && (
                      <button
                        type="button"
                        onClick={() => void openAddRosterModal()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.45)]"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Add Player(s)
                      </button>
                    )}
                  </div>

                  {visibleRoster.length === 0 ? (
                    <div className="px-4 py-12 text-center text-xs text-blue-200/70">
                      No players added to this tournament roster yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-blue-400/15">
                      {visibleRoster.map((item) => {
                        const canThisConsent =
                          canApproveConsent && (!isParent || myChildIds.has(item.player_user_id));
                        return (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-blue-600/10 sm:px-5"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <TeamCrest name="ALAB FC" size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">
                                  {item.full_name}
                                </p>
                                <p className="text-[11px] text-blue-200/75">
                                  {[
                                    item.age_category,
                                    item.position,
                                    item.jersey_number !== null ? `#${item.jersey_number}` : "",
                                    item.remarks,
                                  ]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                  item.parent_consent
                                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                                    : "border-amber-400/40 bg-amber-500/15 text-amber-300"
                                }`}
                              >
                                {item.parent_consent ? "✓ Consent Approved" : "Pending Consent"}
                              </span>

                              {canThisConsent && (
                                <button
                                  type="button"
                                  disabled={busyId === `consent-${item.id}`}
                                  onClick={() =>
                                    void handleToggleConsent(
                                      item.id,
                                      item.parent_consent,
                                      item.full_name
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                    item.parent_consent
                                      ? "border-blue-400/25 bg-blue-950/75 text-blue-200"
                                      : "border-emerald-400/45 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/35"
                                  }`}
                                >
                                  <ShieldIcon className="h-3 w-3" />
                                  {item.parent_consent ? "Revoke" : "Approve"}
                                </button>
                              )}

                              {canManageRoster && (
                                <button
                                  type="button"
                                  disabled={busyId === `rem-roster-${item.id}`}
                                  onClick={() => void handleRemoveRoster(item.id, item.full_name)}
                                  title="Remove player"
                                  aria-label={`Remove ${item.full_name}`}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "results" && (
                <div className="dash-card overflow-hidden rounded-2xl p-5">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                      <TrophyIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">Match Results</h3>
                      <p className="text-xs text-blue-200/70">
                        Completed and live scored matches across divisions.
                      </p>
                    </div>
                  </div>

                  {completedResults.length === 0 ? (
                    <p className="py-10 text-center text-xs text-blue-200/70">
                      No scored results recorded yet. Use &ldquo;Edit&rdquo; on any match to enter final scores.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {completedResults.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-[#040f30]/80 px-4 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${categoryBadgeStyle(m.age_category)}`}
                            >
                              {m.age_category}
                            </span>
                            <span className="text-xs text-blue-200/75">
                              {formatShortDate(m.match_date)} • {m.game_label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                              <TeamCrest name={m.home_team} size="sm" />
                              {m.home_team}
                            </span>
                            <span className="rounded-lg border border-sky-400/50 bg-blue-600/60 px-3 py-0.5 font-mono text-sm font-extrabold text-white">
                              {m.alab_score ?? 0} - {m.opponent_score ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-100">
                              <TeamCrest name={m.opponent} size="sm" />
                              {m.opponent}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="dash-card space-y-4 rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-400/15 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Tournament Settings</h3>
                      <p className="text-xs text-blue-200/70">
                        Manage event details, categories, or delete {detail.title}.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditTournamentModal(detail)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2 text-xs font-bold text-white"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                          Edit Tournament Details
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          disabled={busyId === `del-tour-${detail.id}`}
                          onClick={() => void handleDeleteTournament(detail)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Delete Tournament
                        </button>
                      )}
                    </div>
                  </div>

                  {tournaments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-300/75">
                        All Club Tournaments ({tournaments.length})
                      </p>
                      <div className="space-y-2">
                        {tournaments.map((t) => (
                          <div
                            key={t.id}
                            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                              t.id === detail.id
                                ? "border-sky-400/55 bg-blue-600/20"
                                : "border-blue-400/20 bg-[#040f30]/75"
                            }`}
                          >
                            <div>
                              <p className="font-bold text-white">{t.title}</p>
                              <p className="text-[11px] text-blue-200/70">
                                {formatPeriodRange(t.start_date, t.end_date)} • {t.venue}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void handleSwitchTournament(t.id);
                                  setActiveTab("schedule");
                                }}
                                className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 font-bold text-sky-200 hover:bg-sky-500/30"
                              >
                                {t.id === detail.id ? "Viewing" : "Open"}
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteTournament(t)}
                                  className="rounded-lg border border-rose-400/35 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/25"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT (4/12): Tournament Info + Quick Actions + Recent Updates (Matches Mockup!) */}
            <div className="space-y-4 xl:col-span-4">
              {/* Card 1: Tournament Info */}
              <div className="dash-card relative overflow-hidden rounded-2xl p-5">
                <Image
                  src={alabBall}
                  alt=""
                  className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 object-contain opacity-25"
                />
                <div className="relative flex items-center justify-between gap-2 border-b border-blue-400/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/35">
                      <TrophyIcon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-bold text-white">Tournament Info</h3>
                  </div>
                  <span className="rounded-full border border-emerald-400/45 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    {detail.status === "Upcoming" ? "Active" : detail.status}
                  </span>
                </div>

                <div className="relative mt-3.5">
                  <h4 className="text-lg font-extrabold text-white">{detail.title}</h4>
                  <p className="text-xs text-blue-200/75">
                    {detail.description || "Youth Football Tournament"}
                  </p>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">
                          Duration
                        </p>
                        <p className="font-bold text-white">
                          {formatPeriodRange(detail.start_date, detail.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">
                          Venue
                        </p>
                        <p className="font-bold text-white">{detail.venue}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">
                          Age Groups
                        </p>
                        <p className="font-bold text-white">
                          {detailCategories.join(", ") || "All Divisions"}
                        </p>
                      </div>
                    </div>
                    {detail.registration_fee > 0 && (
                      <div className="flex items-center justify-between rounded-xl border border-blue-400/15 bg-[#040f30]/70 px-3 py-2">
                        <span className="text-blue-200/75">Registration Fee</span>
                        <span className="font-extrabold text-emerald-300">
                          {formatPeso(detail.registration_fee)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Quick Actions (2x2 Grid Matching Mockup!) */}
              <div className="dash-card rounded-2xl p-5">
                <div className="mb-3.5 flex items-center gap-2">
                  <span className="text-amber-400">⚡</span>
                  <h3 className="text-sm font-bold text-white">Quick Actions</h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => openAddMatchesModal()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2.5 text-xs font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.45)] transition hover:from-blue-500 hover:to-sky-400"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add Match
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (canManageRoster) void openAddRosterModal();
                      else setActiveTab("teams");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/35 bg-blue-600/25 px-3 py-2.5 text-xs font-bold text-sky-100 transition hover:bg-blue-600/45 hover:text-white"
                  >
                    <UsersIcon className="h-3.5 w-3.5" />
                    Manage Teams
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("standings")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-400/25 bg-[#06184c]/90 px-3 py-2.5 text-xs font-bold text-blue-100 transition hover:border-sky-400 hover:text-white"
                  >
                    <BarChartIcon className="h-3.5 w-3.5 text-sky-300" />
                    View Standings
                  </button>

                  <button
                    type="button"
                    onClick={handleExportScheduleCsv}
                    disabled={detail.matches.length === 0}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-400/25 bg-[#06184c]/90 px-3 py-2.5 text-xs font-bold text-blue-100 transition hover:border-sky-400 hover:text-white disabled:opacity-45"
                  >
                    <DownloadIcon className="h-3.5 w-3.5 text-sky-300" />
                    Export Schedule
                  </button>
                </div>
              </div>

              {/* Card 3: Recent Updates (Real Live Data) */}
              <div className="dash-card rounded-2xl p-5">
                <div className="mb-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/35">
                      <BellIcon className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-bold text-white">Recent Updates</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("schedule")}
                    className="text-[11px] font-semibold text-sky-300 hover:text-white"
                  >
                    View All →
                  </button>
                </div>

                {recentUpdates.length === 0 ? (
                  <p className="text-xs text-blue-200/70">
                    Add match schedules or players to see live tournament updates here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentUpdates.map((upd) => (
                      <div key={upd.id} className="flex items-start gap-2.5 text-xs">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                        <div className="min-w-0 leading-snug">
                          <p className="text-[10px] font-medium text-blue-300/75">{upd.time}</p>
                          <p className="font-semibold text-white">{upd.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== MODAL 1: CREATE / EDIT TOURNAMENT ==================== */}
      {tourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setTourModalOpen(false)}
          />
          <div className="dash-card relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2368] to-[#07184a] px-5 py-4">
              <div className="flex items-center gap-3">
                <TeamCrest name="ALAB FC" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingTournamentId ? "Edit Tournament" : "Create Tournament"}
                  </h3>
                  <p className="text-xs text-blue-200/75">
                    ALAB FC logo is automatically applied to every saved match.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTourModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              method="post"
              onSubmit={handleSaveTournament}
              className="flex-1 space-y-4 overflow-y-auto p-5"
            >
              {tModalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3.5 py-2.5 text-xs font-medium text-rose-200"
                >
                  {tModalError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Tournament Title
                  </label>
                  <input
                    type="text"
                    required
                    value={tTitle}
                    onChange={(e) => setTTitle(e.target.value)}
                    placeholder="e.g. Maximo Cup 2026"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Venue</label>
                  <input
                    type="text"
                    required
                    value={tVenue}
                    onChange={(e) => setTVenue(e.target.value)}
                    placeholder="e.g. Vermosa Sports Hub"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                    <CalendarIcon className="h-3.5 w-3.5 text-sky-400" />
                    Start Date
                  </label>
                  <CustomDatePicker
                    ariaLabel="Tournament start date"
                    size="sm"
                    value={tStartDate}
                    onChange={setTStartDate}
                    placeholder="Start date..."
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                    <CalendarIcon className="h-3.5 w-3.5 text-sky-400" />
                    End Date
                  </label>
                  <CustomDatePicker
                    ariaLabel="Tournament end date"
                    size="sm"
                    value={tEndDate}
                    onChange={setTEndDate}
                    placeholder="End date..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Status</label>
                  <CustomSelect
                    ariaLabel="Tournament status"
                    size="sm"
                    value={tStatus}
                    onChange={setTStatus}
                    className="w-full"
                    options={TOURNAMENT_STATUSES.map((st) => ({
                      value: st,
                      label: st,
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Fee (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={tFee}
                    onChange={(e) => setTFee(e.target.value)}
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-select Age Categories */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-blue-200">
                    Age Categories ({tCategories.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTCategories(
                        tCategories.length === ALL_CATEGORIES.length ? [] : [...ALL_CATEGORIES]
                      )
                    }
                    className="text-[11px] font-semibold text-sky-300 hover:text-white"
                  >
                    {tCategories.length === ALL_CATEGORIES.length ? "Clear All" : "Select All"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const active = tCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoryChip(cat)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          active
                            ? "border-sky-400 bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.45)]"
                            : "border-blue-400/25 bg-[#040f30] text-blue-200 hover:border-sky-400/50 hover:text-white"
                        }`}
                      >
                        {active ? `✓ ${cat}` : cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-blue-200">
                  Tagline / Description
                </label>
                <input
                  type="text"
                  value={tDescription}
                  onChange={(e) => setTDescription(e.target.value)}
                  placeholder="Play Hard. Dream Big."
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                />
              </div>

              {!editingTournamentId && (
                <div className="space-y-2.5 rounded-xl border border-blue-400/20 bg-[#030b24]/75 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-white">Initial Match Schedules (Optional)</p>
                      <p className="text-[11px] text-blue-200/70">
                        ALAB FC logo automatically appears beside each scheduled game.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setTInitialMatches((prev) => [
                          ...prev,
                          makeBlankMatchRow(
                            tCategories[0] || "U-8",
                            tStartDate || todayISO,
                            prev.length
                          ),
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-400/45 bg-sky-500/15 px-3 py-1.5 text-[11px] font-bold text-sky-200 hover:bg-sky-500/30"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add Game Row
                    </button>
                  </div>

                  {tInitialMatches.map((row, idx) => (
                    <MatchRowEditor
                      key={row.key}
                      row={row}
                      categories={tCategories.length > 0 ? tCategories : [...ALL_CATEGORIES]}
                      onChange={(patch) =>
                        setTInitialMatches((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
                        )
                      }
                      onRemove={() =>
                        setTInitialMatches((prev) => prev.filter((_, i) => i !== idx))
                      }
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTourModalOpen(false)}
                  className="rounded-xl border border-blue-400/25 bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] disabled:opacity-60"
                >
                  <CheckIcon className="h-4 w-4" />
                  {tSaving
                    ? "Saving..."
                    : editingTournamentId
                    ? "Save Changes"
                    : "Create Tournament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: ADD MATCH(ES) ==================== */}
      {addMatchesOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setAddMatchesOpen(false)}
          />
          <div className="dash-card relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2368] to-[#07184a] px-5 py-4">
              <div className="flex items-center gap-3">
                <TeamCrest name="ALAB FC" />
                <div>
                  <h3 className="text-base font-bold text-white">Add Match — {detail.title}</h3>
                  <p className="text-xs text-blue-200/75">
                    ALAB FC crest automatically links to each saved game.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddMatchesOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              method="post"
              onSubmit={handleSaveNewMatches}
              className="flex-1 space-y-3 overflow-y-auto p-5"
            >
              {matchModalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-200"
                >
                  {matchModalError}
                </div>
              )}

              {draftMatches.map((row, idx) => (
                <MatchRowEditor
                  key={row.key}
                  row={row}
                  categories={detailCategories.length > 0 ? detailCategories : [...ALL_CATEGORIES]}
                  onChange={(patch) =>
                    setDraftMatches((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
                    )
                  }
                  onRemove={
                    draftMatches.length > 1
                      ? () => setDraftMatches((prev) => prev.filter((_, i) => i !== idx))
                      : undefined
                  }
                />
              ))}

              <button
                type="button"
                onClick={() =>
                  setDraftMatches((prev) => [
                    ...prev,
                    makeBlankMatchRow(
                      prev[prev.length - 1]?.age_category || detailCategories[0] || "U-8",
                      prev[prev.length - 1]?.match_date || detail.start_date || todayISO,
                      prev.length
                    ),
                  ])
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-sky-400/45 bg-sky-500/10 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20"
              >
                <PlusIcon className="h-4 w-4" />
                Add Another Match Row
              </button>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMatchesOpen(false)}
                  className="rounded-xl border border-blue-400/25 bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMatches}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] disabled:opacity-60"
                >
                  <CheckIcon className="h-4 w-4" />
                  {savingMatches
                    ? "Saving..."
                    : `Save ${draftMatches.length} Match${draftMatches.length > 1 ? "es" : ""}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: EDIT MATCH / SCORE ==================== */}
      {editingMatch && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setEditingMatch(null)}
          />
          <div className="dash-card relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2368] to-[#07184a] px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">Edit Match &amp; Score</h3>
                <p className="text-xs text-blue-200/75">Update schedule or record match score.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              method="post"
              onSubmit={handleSaveEditMatch}
              className="flex-1 space-y-3.5 overflow-y-auto p-5"
            >
              {editMatchError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3.5 py-2 text-xs text-rose-200"
                >
                  {editMatchError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Category</label>
                  <CustomSelect
                    ariaLabel="Match category"
                    value={mCategory}
                    onChange={setMCategory}
                    className="w-full"
                    options={(detailCategories.length > 0
                      ? detailCategories
                      : [...ALL_CATEGORIES]
                    ).map((cat) => ({
                      value: cat,
                      label: cat,
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Game Label</label>
                  <input
                    type="text"
                    required
                    value={mLabel}
                    onChange={(e) => setMLabel(e.target.value)}
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Team A (Home)
                  </label>
                  <div className="flex items-center gap-2">
                    <TeamCrest name={mHomeTeam || "ALAB FC"} size="sm" />
                    <input
                      type="text"
                      required
                      value={mHomeTeam}
                      onChange={(e) => setMHomeTeam(e.target.value)}
                      placeholder={`ALAB FC ${mCategory}`}
                      className="min-w-0 flex-1 rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Team B (Away)
                  </label>
                  <div className="flex items-center gap-2">
                    <TeamCrest name={mOpponent || "Team"} size="sm" />
                    <input
                      type="text"
                      required
                      value={mOpponent}
                      onChange={(e) => setMOpponent(e.target.value)}
                      placeholder="e.g. Kaya FC Youth"
                      className="min-w-0 flex-1 rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-blue-200">Pitch</label>
                <input
                  type="text"
                  value={mPitch}
                  onChange={(e) => setMPitch(e.target.value)}
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                    <CalendarIcon className="h-3.5 w-3.5 text-sky-400" />
                    Date
                  </label>
                  <CustomDatePicker
                    ariaLabel="Match date"
                    size="md"
                    value={mDate}
                    onChange={setMDate}
                    placeholder="Pick match date..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Time</label>
                  <input
                    type="time"
                    value={mTime}
                    onChange={(e) => setMTime(e.target.value)}
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-sky-400/25 bg-[#030b24]/80 p-3.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block truncate text-xs font-bold text-sky-300">
                    {mHomeTeam.trim() || "Team A"} Score
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={mAlabScore}
                    onChange={(e) => setMAlabScore(e.target.value)}
                    placeholder="—"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-center text-base font-extrabold text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block truncate text-xs font-bold text-blue-200">
                    {mOpponent.trim() || "Team B"} Score
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={mOppScore}
                    onChange={(e) => setMOppScore(e.target.value)}
                    placeholder="—"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-center text-base font-extrabold text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Status</label>
                  <CustomSelect
                    ariaLabel="Match status"
                    size="sm"
                    value={mStatus}
                    onChange={setMStatus}
                    className="w-full py-2.5"
                    options={MATCH_STATUSES.map((st) => ({
                      value: st,
                      label: st,
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-blue-200">Remarks</label>
                <input
                  type="text"
                  value={mRemarks}
                  onChange={(e) => setMRemarks(e.target.value)}
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="rounded-xl border border-blue-400/25 bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditMatch}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] disabled:opacity-60"
                >
                  <CheckIcon className="h-4 w-4" />
                  {savingEditMatch ? "Saving..." : "Save Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: ADD PLAYERS TO ROSTER ==================== */}
      {addRosterOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setAddRosterOpen(false)}
          />
          <div className="dash-card relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2368] to-[#07184a] px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">Manage Tournament Roster</h3>
                <p className="text-xs text-blue-200/75">{detail.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAddRosterOpen(false)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              method="post"
              onSubmit={handleSaveAddRoster}
              className="flex-1 space-y-3.5 overflow-y-auto p-5"
            >
              {rosterModalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3.5 py-2 text-xs text-rose-200"
                >
                  {rosterModalError}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="search"
                  value={rosterPickSearch}
                  onChange={(e) => setRosterPickSearch(e.target.value)}
                  placeholder="Search player name..."
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3 py-2 text-xs text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                />
                <CustomSelect
                  ariaLabel="Filter division"
                  size="sm"
                  value={rosterPickCat}
                  onChange={setRosterPickCat}
                  leadingIcon={<FilterIcon className="h-3.5 w-3.5" />}
                  className="w-full"
                  options={[
                    { value: "all", label: "All Divisions" },
                    ...ALL_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
                  ]}
                />
              </div>

              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-blue-400/20 bg-[#030b24]/90 p-2">
                {modalFilteredClubPlayers.length === 0 ? (
                  <p className="py-6 text-center text-xs text-blue-200/70">No players found.</p>
                ) : (
                  modalFilteredClubPlayers.map((p) => {
                    const alreadyIn = existingRosterPlayerIds.has(p.player_user_id);
                    const checked = rosterPickIds.has(p.player_user_id);
                    const name =
                      p.full_name || `${p.first_name} ${p.last_name}`.trim() || `Player #${p.player_user_id}`;
                    return (
                      <label
                        key={p.player_user_id}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                          alreadyIn
                            ? "cursor-not-allowed opacity-50"
                            : checked
                            ? "cursor-pointer bg-blue-600/30 text-white"
                            : "cursor-pointer text-blue-100/85 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <input
                            type="checkbox"
                            disabled={alreadyIn}
                            checked={alreadyIn || checked}
                            onChange={() => {
                              if (alreadyIn) return;
                              setRosterPickIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(p.player_user_id)) next.delete(p.player_user_id);
                                else next.add(p.player_user_id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 shrink-0 rounded accent-blue-500"
                          />
                          <span className="truncate font-semibold text-white">{name}</span>
                          {p.age_category && (
                            <span className="shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200">
                              {p.age_category}
                            </span>
                          )}
                        </div>
                        <span className="ml-2 shrink-0 text-[10px] text-blue-300/70">
                          {alreadyIn ? "In Roster" : p.position || ""}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-blue-200">Remarks</label>
                <input
                  type="text"
                  value={rosterPickRemarks}
                  onChange={(e) => setRosterPickRemarks(e.target.value)}
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddRosterOpen(false)}
                  className="rounded-xl border border-blue-400/25 bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoster}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] disabled:opacity-60"
                >
                  <CheckIcon className="h-4 w-4" />
                  {savingRoster
                    ? "Adding..."
                    : `Add ${rosterPickIds.size || ""} Player${rosterPickIds.size === 1 ? "" : "s"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      <ConfirmModal
        open={confirmAction !== null}
        title={confirmAction?.title ?? "Confirm Delete"}
        message={confirmAction?.message ?? ""}
        confirmLabel={confirmAction?.confirmLabel ?? "Delete"}
        busy={confirmBusy}
        onCancel={() => {
          if (!confirmBusy) setConfirmAction(null);
        }}
        onConfirm={() => {
          if (!confirmAction || confirmBusy) return;
          setConfirmBusy(true);
          void confirmAction.onConfirm().finally(() => {
            setConfirmBusy(false);
            setConfirmAction(null);
          });
        }}
      />
    </div>
  );
}

function MatchRowEditor({
  row,
  categories,
  onChange,
  onRemove,
}: {
  row: DraftMatchRow;
  categories: string[];
  onChange: (patch: Partial<DraftMatchRow>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-blue-400/25 bg-[#051238]/90 p-3.5">
      {/* Interactive Matchup Row: Editable Team A (defaults to ALAB FC w/ auto logo) VS Editable Team B */}
      <div className="flex flex-col gap-2 border-b border-blue-400/15 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamCrest name={row.home_team.trim() || "ALAB FC"} size="sm" />
            <input
              type="text"
              required
              value={row.home_team}
              onChange={(e) => onChange({ home_team: e.target.value })}
              placeholder={`ALAB FC ${row.age_category}`}
              className="min-w-0 flex-1 rounded-lg border border-sky-400/40 bg-[#040f30] px-2.5 py-1.5 text-xs font-bold text-white placeholder:font-normal placeholder:text-blue-200/50 focus:border-sky-300 focus:outline-none"
            />
          </div>

          <span className="shrink-0 self-center rounded-md bg-blue-950/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
            VS
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamCrest name={row.opponent.trim() || "FC"} size="sm" />
            <input
              type="text"
              required
              value={row.opponent}
              onChange={(e) => onChange({ opponent: e.target.value })}
              placeholder="Team B (e.g. Kaya FC Youth)"
              className="min-w-0 flex-1 rounded-lg border border-sky-400/40 bg-[#040f30] px-2.5 py-1.5 text-xs font-bold text-white placeholder:font-normal placeholder:text-blue-200/50 focus:border-sky-300 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5">
          {!/\balab\b/i.test(row.home_team) && (
            <button
              type="button"
              onClick={() => onChange({ home_team: `ALAB FC ${row.age_category}` })}
              className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2 py-1 text-[10px] font-bold text-sky-200 hover:bg-sky-500/30"
            >
              Set ALAB
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove game row"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/30"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Labeled Match Details */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-blue-300/75">
            Category
          </label>
          <CustomSelect
            ariaLabel="Match category"
            size="xs"
            value={row.age_category}
            onChange={(nextCat) => {
              const isDefaultAlab = /^alab\s+fc(\s+u-?\d+|\s+senior)?$/i.test(row.home_team.trim());
              onChange({
                age_category: nextCat,
                ...(isDefaultAlab ? { home_team: `ALAB FC ${nextCat}` } : {}),
              });
            }}
            className="w-full"
            options={categories.map((cat) => ({
              value: cat,
              label: cat,
            }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-blue-300/75">
            Game / Round
          </label>
          <input
            type="text"
            value={row.game_label}
            onChange={(e) => onChange({ game_label: e.target.value })}
            placeholder="Game 1 / Semi-Finals"
            className="w-full rounded-lg border border-blue-400/25 bg-[#040f30] px-2.5 py-1.5 text-xs text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-blue-300/75">
            Pitch / Field
          </label>
          <input
            type="text"
            value={row.pitch}
            onChange={(e) => onChange({ pitch: e.target.value })}
            placeholder="Pitch A"
            className="w-full rounded-lg border border-blue-400/25 bg-[#040f30] px-2.5 py-1.5 text-xs text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-blue-300/75">
            Match Date
          </label>
          <CustomDatePicker
            ariaLabel="Match date"
            size="xs"
            value={row.match_date}
            onChange={(val) => onChange({ match_date: val })}
            placeholder="Pick date..."
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-blue-300/75">
            Kickoff Time
          </label>
          <input
            type="time"
            aria-label="Match time"
            value={row.match_time}
            onChange={(e) => onChange({ match_time: e.target.value })}
            className="w-full rounded-lg border border-blue-400/25 bg-[#040f30] px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-blue-300/75">
            Notes (Optional)
          </label>
          <input
            type="text"
            value={row.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            placeholder="Wear Blue Kit"
            className="w-full rounded-lg border border-blue-400/25 bg-[#040f30] px-2.5 py-1.5 text-xs text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
