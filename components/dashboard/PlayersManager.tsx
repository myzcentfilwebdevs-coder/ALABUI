"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import crest from "@/app/logo/logoALAB.png";
import stadiumBg from "@/app/logo/backgoundimage.png";
import {
  fetchAllAttendanceHistory,
  fetchAllPlayersRoster,
  fetchDailyAttendance,
  fetchMyPlayers,
  fetchParentPlayers,
  fetchParents,
  getLocalTodayISO,
  linkParentPlayers,
  markSingleDailyAttendance,
  RELATIONSHIP_OPTIONS,
  unlinkParentPlayer,
  type AttendanceStatus,
  type LinkedPlayer,
  type ParentOption,
} from "@/lib/api";
import {
  BarChartIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ClockIcon,
  CloseIcon,
  EyeIcon,
  HistoryIcon,
  InfoIcon,
  JerseyIcon,
  LinkIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  UnlinkIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import CustomSelect from "@/components/ui/CustomSelect";
import AddPlayerModal from "./AddPlayerModal";
import ConfirmModal from "./ConfirmModal";
import PlayerAttendanceDetail, { type PlayerAttendanceSummaryItem } from "./PlayerAttendanceDetail";

type PlayersTab = "roster" | "my-children" | "parent-links";
type LinkStatusFilter = "all" | "linked" | "unlinked";

interface PlayerParentLinkInfo {
  link_id: number | null;
  parent_user_id: number | null;
  parent_name: string;
  relationship: string;
}

interface QuickAttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
  activePlayerIds: Set<number>;
}

interface PlayersManagerProps {
  currentUserName: string;
  roleId: number;
  isAdmin: boolean;
  canLinkParent: boolean;
  canAddPlayer: boolean;
  canRecordAttendance: boolean;
  onDataChanged?: () => void;
}

const DEFAULT_DIVISIONS = ["U-8", "U-10", "U-12", "U-14", "U-16", "U-18", "Senior"];
const DEFAULT_POSITIONS = ["Forward", "Midfielder", "Defender", "Goalkeeper"];
const PAGE_SIZE = 10;

function getPlayerDisplayName(p: LinkedPlayer): string {
  return (
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    `Player #${p.player_user_id}`
  );
}

function getTablePlayerName(p: LinkedPlayer): string {
  if (p.last_name && p.first_name) return `${p.last_name}, ${p.first_name}`;
  return getPlayerDisplayName(p);
}

function getInitials(name: string): string {
  const parts = name
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatAlabCode(playerId: number): string {
  return `ALAB-${String(playerId).padStart(3, "0")}`;
}

function AlabJerseyGraphic({ className = "h-20 w-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="alabJerseyBody" x1="18" y1="12" x2="102" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="35%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f2573" />
        </linearGradient>
        <linearGradient id="alabJerseySleeve" x1="10" y1="22" x2="42" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0c1e5e" />
        </linearGradient>
        <linearGradient id="alabJerseyHighlight" x1="60" y1="14" x2="60" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Left sleeve */}
      <path
        d="M36 18L10 38L20 62L36 53V18Z"
        fill="url(#alabJerseySleeve)"
        stroke="#60a5fa"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Right sleeve */}
      <path
        d="M84 18L110 38L100 62L84 53V18Z"
        fill="url(#alabJerseySleeve)"
        stroke="#60a5fa"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Main jersey torso */}
      <path
        d="M36 18L47 13C51 20 69 20 73 13L84 18L88 108C70 113 50 113 32 108L36 18Z"
        fill="url(#alabJerseyBody)"
        stroke="#7dd3fc"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* V-neck collar */}
      <path
        d="M47 13L60 28L73 13"
        fill="#051138"
        stroke="#bae6fd"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Subtle diagonal stripes */}
      <path
        d="M35 66L86 44L86.5 54L34.5 76Z"
        fill="url(#alabJerseyHighlight)"
      />
      {/* Mini chest crest circle */}
      <circle cx="71" cy="40" r="6" fill="#0b1f66" stroke="#fb923c" strokeWidth="1.3" />
      <circle cx="71" cy="40" r="2.5" fill="#38bdf8" />
      {/* ALAB front wordmark */}
      <text
        x="60"
        y="69"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="16"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="1.2"
        fontFamily="system-ui, sans-serif"
      >
        ALAB
      </text>
      {/* Trim lines */}
      <path d="M13 44L23 58" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M107 44L97 58" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export default function PlayersManager({
  currentUserName,
  roleId,
  isAdmin,
  canLinkParent,
  canAddPlayer,
  canRecordAttendance,
  onDataChanged,
}: PlayersManagerProps) {
  const isParent = roleId === 7;
  const [activeTab, setActiveTab] = useState<PlayersTab>(isParent ? "my-children" : "roster");

  // Core data
  const [roster, setRoster] = useState<LinkedPlayer[]>([]);
  const [myChildren, setMyChildren] = useState<LinkedPlayer[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentLinksByPlayer, setParentLinksByPlayer] = useState<
    Record<number, PlayerParentLinkInfo[]>
  >({});
  const [childrenByParentId, setChildrenByParentId] = useState<Record<number, LinkedPlayer[]>>({});
  const [quickStats, setQuickStats] = useState<QuickAttendanceStats>({
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: 0,
    rate: 0,
    activePlayerIds: new Set(),
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>("");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<LinkStatusFilter>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  // Parent Directory Lookup state
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [parentSearch, setParentSearch] = useState<string>("");
  const [parentChildren, setParentChildren] = useState<LinkedPlayer[]>([]);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [addPlayerOpen, setAddPlayerOpen] = useState<boolean>(false);
  const [linkModalOpen, setLinkModalOpen] = useState<boolean>(false);
  const [linkParentName, setLinkParentName] = useState<string>(isParent ? currentUserName : "");
  const [linkRelationship, setLinkRelationship] = useState<string>("Father");
  const [selectedLinkPlayerIds, setSelectedLinkPlayerIds] = useState<Set<number>>(new Set());
  const [linkModalPlayerSearch, setLinkModalPlayerSearch] = useState<string>("");
  const [linking, setLinking] = useState<boolean>(false);
  const [linkModalError, setLinkModalError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<{
    linkId: number;
    label: string;
  } | null>(null);

  // Full-page Player Attendance drilldown
  const [detailPlayer, setDetailPlayer] = useState<PlayerAttendanceSummaryItem | null>(null);
  const [detailRefreshTick, setDetailRefreshTick] = useState<number>(0);
  const [quickMarkTarget, setQuickMarkTarget] = useState<{
    player: PlayerAttendanceSummaryItem;
    date: string;
  } | null>(null);
  const [quickMarkStatus, setQuickMarkStatus] = useState<Exclude<AttendanceStatus, "">>("Present");
  const [quickMarkRemarks, setQuickMarkRemarks] = useState<string>("");
  const [quickMarkSaving, setQuickMarkSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [rosterRes, mineRes, parentsRes, historyRes] = await Promise.all([
      isParent && !canLinkParent ? Promise.resolve(null) : fetchAllPlayersRoster(),
      fetchMyPlayers(),
      isParent ? Promise.resolve(null) : fetchParents(),
      fetchAllAttendanceHistory(),
    ]);

    if (isParent) {
      if (mineRes.ok) {
        setMyChildren(mineRes.data);
      } else {
        setError(mineRes.message || "Failed to load linked players.");
      }
      if (rosterRes && rosterRes.ok) {
        setRoster(rosterRes.data);
      }
    } else {
      if (rosterRes && rosterRes.ok) {
        setRoster(rosterRes.data);
      } else if (rosterRes) {
        setError(rosterRes.message || "Failed to load players.");
      }
      if (mineRes.ok) {
        setMyChildren(mineRes.data);
      }
    }

    // Hydrate Quick Stats from Attendance History (fallback to Daily Attendance)
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    const activeIds = new Set<number>();

    if (historyRes.ok && historyRes.data && historyRes.data.players.length > 0) {
      for (const p of historyRes.data.players) {
        present += p.summary.present;
        absent += p.summary.absent;
        late += p.summary.late;
        excused += p.summary.excused;
        if (p.summary.total > 0 || p.attended_today) {
          activeIds.add(p.player_user_id);
        }
      }
    }

    const histTotal = present + absent + late + excused;
    if (histTotal === 0) {
      const dailyRes = await fetchDailyAttendance();
      if (dailyRes.ok && dailyRes.data) {
        present = dailyRes.data.summary.present;
        absent = dailyRes.data.summary.absent;
        late = dailyRes.data.summary.late;
        excused = dailyRes.data.summary.excused;
        for (const p of dailyRes.data.players) {
          if (p.attended || p.status) activeIds.add(p.player_user_id);
        }
      }
    }

    const statsTotal = present + absent + late + excused;
    const statsRate =
      statsTotal > 0 ? Math.round(((present + late) / statsTotal) * 100) : 0;

    setQuickStats({
      present,
      absent,
      late,
      excused,
      total: statsTotal,
      rate: statsRate,
      activePlayerIds: activeIds,
    });

    // Hydrate parent->children links map so the table displays real Parent names & Linked/Unlinked counts
    if (parentsRes && parentsRes.ok) {
      setParents(parentsRes.data);
      if (parentsRes.data.length > 0) {
        const sample = parentsRes.data.slice(0, 25);
        const childResults = await Promise.all(
          sample.map((parent) => fetchParentPlayers(parent.user_id))
        );

        const nextByPlayer: Record<number, PlayerParentLinkInfo[]> = {};
        const nextByParent: Record<number, LinkedPlayer[]> = {};

        sample.forEach((parent, idx) => {
          const res = childResults[idx];
          if (!res || !res.ok) return;
          nextByParent[parent.user_id] = res.data;
          for (const child of res.data) {
            const list = nextByPlayer[child.player_user_id] ?? [];
            const exists = list.some((x) => x.parent_user_id === parent.user_id);
            if (!exists) {
              list.push({
                link_id: child.link_id,
                parent_user_id: parent.user_id,
                parent_name: parent.full_name,
                relationship: child.relationship || "Parent",
              });
            }
            nextByPlayer[child.player_user_id] = list;
          }
        });

        setParentLinksByPlayer(nextByPlayer);
        setChildrenByParentId(nextByParent);
      } else {
        setParentLinksByPlayer({});
        setChildrenByParentId({});
      }
    }

    setLoading(false);
  }, [isParent, canLinkParent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPlayers();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPlayers]);

  const loadParentChildren = useCallback(async (parentId: number | string) => {
    const idStr = String(parentId).trim();
    if (!idStr) return;
    setLookupLoading(true);
    setLookupError(null);
    const res = await fetchParentPlayers(idStr);
    setLookupLoading(false);

    if (res.ok) {
      setParentChildren(res.data);
      const numericId = Number(idStr);
      if (!Number.isNaN(numericId) && numericId > 0) {
        setChildrenByParentId((prev) => ({ ...prev, [numericId]: res.data }));
      }
    } else {
      setParentChildren([]);
      setLookupError(res.message || "Failed to load parent's linked players.");
    }
  }, []);

  function getPlayerLinks(player: LinkedPlayer): PlayerParentLinkInfo[] {
    const fromMap = parentLinksByPlayer[player.player_user_id] ?? [];
    if (fromMap.length > 0) return fromMap;
    if (player.parent_name) {
      return [
        {
          link_id: player.link_id,
          parent_user_id: player.parent_user_id,
          parent_name: player.parent_name,
          relationship: player.relationship || "Parent",
        },
      ];
    }
    if (isParent || activeTab === "my-children") {
      return [
        {
          link_id: player.link_id,
          parent_user_id: player.parent_user_id,
          parent_name: currentUserName,
          relationship: player.relationship || "Parent",
        },
      ];
    }
    return [];
  }

  function openLinkModal(preselectedPlayerId?: number, prefilledParentName?: string) {
    const activeParent = parents.find((p) => String(p.user_id) === selectedParentId);
    setLinkParentName(
      prefilledParentName ??
        (isParent ? currentUserName : activeParent?.full_name ?? parents[0]?.full_name ?? "")
    );
    setLinkRelationship("Father");
    setSelectedLinkPlayerIds(preselectedPlayerId ? new Set([preselectedPlayerId]) : new Set());
    setLinkModalPlayerSearch("");
    setLinkModalError(null);
    setLinkModalOpen(true);
  }

  async function handleSubmitLinks(e: FormEvent) {
    e.preventDefault();
    setLinkModalError(null);

    const parentNameClean = linkParentName.trim();
    if (!parentNameClean) {
      setLinkModalError("Please select or enter a Parent Name.");
      return;
    }

    const playerIds = Array.from(selectedLinkPlayerIds);
    if (playerIds.length === 0) {
      setLinkModalError("Please select at least one player to link.");
      return;
    }

    setLinking(true);
    const res = await linkParentPlayers({
      parent_name: parentNameClean,
      relationship: linkRelationship,
      player_user_ids: playerIds,
    });
    setLinking(false);

    if (res.ok) {
      setLinkModalOpen(false);
      const count = res.data?.linked_count ?? playerIds.length;
      const linkedParentName = res.data?.parent_name || parentNameClean;
      setToast({
        type: "success",
        message: `Linked ${count} player(s) to ${linkedParentName} (${linkRelationship}).`,
      });
      await loadPlayers();

      const linkedParentId = res.data?.parent_user_id;
      if (linkedParentId) {
        setSelectedParentId(String(linkedParentId));
        await loadParentChildren(linkedParentId);
      } else if (selectedParentId) {
        await loadParentChildren(selectedParentId);
      }

      if (onDataChanged) onDataChanged();
    } else {
      setLinkModalError(res.message || "Failed to link parent and player(s).");
    }
  }

  function handleUnlinkById(linkId: number | null, playerName: string) {
    if (!linkId || unlinkingId !== null) return;
    setPendingUnlink({ linkId, label: playerName });
  }

  async function executeConfirmedUnlink() {
    if (!pendingUnlink || unlinkingId !== null) return;
    const { linkId, label } = pendingUnlink;
    setUnlinkingId(linkId);
    const res = await unlinkParentPlayer(linkId);
    setUnlinkingId(null);
    setPendingUnlink(null);

    if (res.ok) {
      setToast({
        type: "success",
        message: `Unlinked ${label}.`,
      });
      await loadPlayers();
      if (selectedParentId) {
        await loadParentChildren(selectedParentId);
      }
      if (onDataChanged) onDataChanged();
    } else {
      setToast({ type: "error", message: res.message || "Failed to unlink player." });
    }
  }

  async function handleQuickMarkSubmit(e: FormEvent) {
    e.preventDefault();
    if (!quickMarkTarget || quickMarkSaving) return;
    setQuickMarkSaving(true);
    const res = await markSingleDailyAttendance({
      date: quickMarkTarget.date || getLocalTodayISO(),
      player_user_id: quickMarkTarget.player.player_user_id,
      status: quickMarkStatus,
      remarks: quickMarkRemarks,
    });
    setQuickMarkSaving(false);

    if (res.ok) {
      setQuickMarkTarget(null);
      setDetailRefreshTick((t) => t + 1);
      setToast({ type: "success", message: `Attendance marked as ${quickMarkStatus}.` });
      void loadPlayers();
      if (onDataChanged) onDataChanged();
    } else {
      setToast({ type: "error", message: res.message || "Failed to mark attendance." });
    }
  }

  const activeList = activeTab === "my-children" ? myChildren : roster;

  // Derived KPI counts (100% live data!)
  const kpi = useMemo(() => {
    const baseList = isParent ? myChildren : roster;
    const totalPlayers = baseList.length;

    let linkedPlayersCount = 0;
    const uniqueLinkedParents = new Set<number>();

    if (isParent) {
      linkedPlayersCount = myChildren.length;
    } else {
      for (const p of baseList) {
        const links = parentLinksByPlayer[p.player_user_id] ?? [];
        if (links.length > 0 || p.parent_name || p.parent_user_id) {
          linkedPlayersCount++;
          for (const l of links) {
            if (l.parent_user_id) uniqueLinkedParents.add(l.parent_user_id);
          }
          if (p.parent_user_id) uniqueLinkedParents.add(p.parent_user_id);
        }
      }
    }

    const linkedParentsCount = isParent
      ? myChildren.length > 0
        ? 1
        : 0
      : uniqueLinkedParents.size > 0
      ? uniqueLinkedParents.size
      : parents.length;

    const unlinkedPlayers = Math.max(0, totalPlayers - linkedPlayersCount);

    const activePlayers =
      quickStats.activePlayerIds.size > 0
        ? baseList.filter((p) => quickStats.activePlayerIds.has(p.player_user_id)).length
        : linkedPlayersCount > 0
        ? linkedPlayersCount
        : totalPlayers;

    const divisionsUsed = new Set(baseList.map((p) => p.age_category).filter(Boolean)).size;

    return {
      totalPlayers,
      linkedParentsCount,
      linkedPlayersCount,
      unlinkedPlayers,
      activePlayers,
      divisionsUsed,
    };
  }, [isParent, myChildren, roster, parentLinksByPlayer, parents.length, quickStats.activePlayerIds]);

  const divisionOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_DIVISIONS);
    for (const p of [...roster, ...myChildren]) {
      if (p.age_category) set.add(p.age_category);
    }
    return Array.from(set);
  }, [roster, myChildren]);

  const positionOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_POSITIONS);
    for (const p of [...roster, ...myChildren]) {
      if (p.position) set.add(p.position);
    }
    return Array.from(set);
  }, [roster, myChildren]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeList.filter((p) => {
      if (divisionFilter !== "all" && p.age_category !== divisionFilter) return false;
      if (positionFilter !== "all" && p.position.toLowerCase() !== positionFilter.toLowerCase()) {
        return false;
      }

      const links = parentLinksByPlayer[p.player_user_id] ?? [];
      const isLinked =
        isParent || activeTab === "my-children" || links.length > 0 || Boolean(p.parent_name);

      if (statusFilter === "linked" && !isLinked) return false;
      if (statusFilter === "unlinked" && isLinked) return false;

      if (!q) return true;
      const full = getPlayerDisplayName(p).toLowerCase();
      const tableName = getTablePlayerName(p).toLowerCase();
      const code = formatAlabCode(p.player_user_id).toLowerCase();
      const parentNames = links.map((l) => l.parent_name.toLowerCase()).join(" ");
      return (
        full.includes(q) ||
        tableName.includes(q) ||
        code.includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.age_category.toLowerCase().includes(q) ||
        p.relationship.toLowerCase().includes(q) ||
        p.parent_name.toLowerCase().includes(q) ||
        parentNames.includes(q) ||
        String(p.player_user_id).includes(q) ||
        (p.jersey_number !== null && String(p.jersey_number).includes(q))
      );
    });
  }, [
    activeList,
    divisionFilter,
    positionFilter,
    statusFilter,
    search,
    parentLinksByPlayer,
    isParent,
    activeTab,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = filteredList.slice(startIdx, startIdx + PAGE_SIZE);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  const filteredParentsTab = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone_number.includes(q)
    );
  }, [parents, parentSearch]);

  const modalFilteredRoster = useMemo(() => {
    const q = linkModalPlayerSearch.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((p) => {
      const full = getPlayerDisplayName(p).toLowerCase();
      return (
        full.includes(q) ||
        p.age_category.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        String(p.player_user_id).includes(q)
      );
    });
  }, [roster, linkModalPlayerSearch]);

  const selectedParentObj = parents.find((p) => String(p.user_id) === selectedParentId) ?? null;

  // Quick Stats SVG Donut math
  const donutRadius = 46;
  const donutCirc = 2 * Math.PI * donutRadius;
  const donutOffset = donutCirc * (1 - Math.min(100, Math.max(0, quickStats.rate)) / 100);

  if (detailPlayer) {
    return (
      <>
        <PlayerAttendanceDetail
          player={detailPlayer}
          allPlayers={activeList.length > 0 ? activeList : [detailPlayer]}
          canRecord={canRecordAttendance}
          onSelectPlayer={(next) => setDetailPlayer(next)}
          onBack={() => setDetailPlayer(null)}
          onMarkForPlayer={(target, dateISO) => {
            setQuickMarkTarget({ player: target, date: dateISO });
            setQuickMarkStatus("Present");
            setQuickMarkRemarks("");
          }}
          refreshTick={detailRefreshTick}
        />

        {quickMarkTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => setQuickMarkTarget(null)}
            />
            <div className="dash-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
              <div className="flex items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2368] to-[#07184a] px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Mark Attendance — {quickMarkTarget.player.first_name}{" "}
                    {quickMarkTarget.player.last_name}
                  </h3>
                  <p className="text-xs text-blue-200/75">{quickMarkTarget.date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickMarkTarget(null)}
                  className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <form method="post" onSubmit={handleQuickMarkSubmit} className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-2">
                  {(["Present", "Late", "Absent", "Excused"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setQuickMarkStatus(st)}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                        quickMarkStatus === st
                          ? "border-sky-400 bg-blue-600 text-white shadow-[0_0_14px_rgba(56,189,248,0.5)]"
                          : "border-blue-400/25 bg-[#040f30] text-blue-200 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={quickMarkRemarks}
                  onChange={(e) => setQuickMarkRemarks(e.target.value)}
                  placeholder="Notes / remarks (optional)"
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickMarkTarget(null)}
                    className="rounded-xl border border-blue-400/25 px-4 py-2 text-xs font-semibold text-blue-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickMarkSaving}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white"
                  >
                    {quickMarkSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      {/* ==================== STADIUM HERO BANNER (backgoundimage.png) ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#06184c] px-5 py-5 shadow-[0_16px_44px_-14px_rgba(37,99,235,0.55)] sm:px-6">
        <Image
          src={stadiumBg}
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="pointer-events-none object-cover object-right opacity-90"
        />
        {/* Crisp royal-blue gradient overlay for text contrast while preserving stadium & glowing ball */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041038]/92 via-[#072066]/62 to-[#040f33]/48" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden shrink-0 drop-shadow-[0_6px_18px_rgba(56,189,248,0.45)] sm:block">
              <AlabJerseyGraphic className="h-[74px] w-[74px]" />
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700 text-white shadow-[0_0_24px_rgba(56,189,248,0.55)] sm:hidden">
              <JerseyIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-xs sm:text-3xl">
                {isParent ? "My Children & Players" : "Players & Parent Links"}
              </h2>
              <p className="mt-0.5 text-xs text-blue-100/90 sm:text-sm">
                {isParent
                  ? "View all your linked children and track each player's daily attendance."
                  : "Manage club players and link children to parent accounts."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canLinkParent && (
              <button
                type="button"
                onClick={() => openLinkModal()}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-300/45 bg-[#051542]/80 px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_20px_rgba(2,12,42,0.55)] backdrop-blur-md transition hover:border-sky-300 hover:bg-blue-700/65"
              >
                <LinkIcon className="h-4 w-4 text-sky-300" />
                Link Player to Parent
              </button>
            )}
            {canAddPlayer && (
              <button
                type="button"
                onClick={() => setAddPlayerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-400 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_22px_rgba(56,189,248,0.65)] transition hover:from-blue-500 hover:to-sky-300"
              >
                <PlusIcon className="h-4 w-4" />
                Add Player
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 4 COLORED-ACCENT KPI CARDS ==================== */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <PlayerKpiCard
          accent="from-sky-400 via-blue-500 to-blue-600"
          glow="bg-sky-500/20 text-sky-300 ring-sky-400/35"
          icon={<UsersIcon className="h-6 w-6" />}
          value={String(kpi.totalPlayers)}
          label="Total Players"
          meta={kpi.divisionsUsed > 0 ? `${kpi.divisionsUsed} divisions` : "Club roster"}
          metaClass="text-sky-300"
        />
        <PlayerKpiCard
          accent="from-emerald-400 via-green-500 to-emerald-600"
          glow="bg-emerald-500/20 text-emerald-300 ring-emerald-400/35"
          icon={<UsersIcon className="h-6 w-6" />}
          value={String(kpi.linkedParentsCount)}
          label="Linked Parents"
          meta={`${kpi.linkedPlayersCount} linked`}
          metaClass="text-emerald-300"
        />
        <PlayerKpiCard
          accent="from-amber-400 via-orange-400 to-amber-500"
          glow="bg-amber-500/20 text-amber-300 ring-amber-400/35"
          icon={<UserIcon className="h-6 w-6" />}
          value={String(kpi.unlinkedPlayers)}
          label="Unlinked Players"
          infoTitle="Players who do not have a linked parent account yet."
        />
        <PlayerKpiCard
          accent="from-fuchsia-400 via-violet-500 to-purple-600"
          glow="bg-violet-500/20 text-violet-300 ring-violet-400/35"
          icon={<ClipboardCheckIcon className="h-6 w-6" />}
          value={String(kpi.activePlayers)}
          label="Active Players"
          meta={quickStats.total > 0 ? `${quickStats.rate}% rate` : "Active roster"}
          metaClass="text-emerald-300"
        />
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

      {/* ==================== FILTER & SEARCH TOOLBAR ==================== */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative w-full lg:min-w-[230px] lg:flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/70" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search player name, ID, parent, or position..."
            className="w-full rounded-xl border border-blue-400/30 bg-[#05133a]/90 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-blue-200/55 shadow-[inset_0_1px_0_rgba(147,197,253,0.12)] focus:border-sky-400 focus:outline-none sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <CustomSelect
            ariaLabel="Filter by team or age group"
            value={divisionFilter}
            onChange={(val) => {
              setDivisionFilter(val);
              setPage(1);
            }}
            size="sm"
            className="w-full sm:w-auto sm:min-w-[125px]"
            options={[
              { value: "all", label: "All Teams" },
              ...divisionOptions.map((div) => ({ value: div, label: div })),
            ]}
          />

          <CustomSelect
            ariaLabel="Filter by link status"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as LinkStatusFilter);
              setPage(1);
            }}
            size="sm"
            className="w-full sm:w-auto sm:min-w-[130px]"
            options={[
              { value: "all", label: "All Status" },
              { value: "linked", label: "Active (Linked)" },
              { value: "unlinked", label: "Pending (Unlinked)" },
            ]}
          />

          <CustomSelect
            ariaLabel="Filter by position"
            value={positionFilter}
            onChange={(val) => {
              setPositionFilter(val);
              setPage(1);
            }}
            size="sm"
            className="w-full sm:w-auto sm:min-w-[135px]"
            options={[
              { value: "all", label: "All Positions" },
              ...positionOptions.map((pos) => ({ value: pos, label: pos })),
            ]}
          />

          <button
            type="button"
            onClick={() => void loadPlayers()}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.5)] transition hover:from-blue-500 hover:to-sky-400 disabled:opacity-55 sm:w-auto"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* ==================== MAIN 2-COLUMN WORKSPACE (TABLE + QUICK STATS) ==================== */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* LEFT (9/12): Player List Table / Parents Directory */}
        <div className="dash-card flex flex-col overflow-hidden rounded-2xl xl:col-span-9">
          {/* Card Header + View Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-400/20 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                  <UsersIcon className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-white">
                  {activeTab === "parent-links"
                    ? "Parents Directory"
                    : activeTab === "my-children"
                    ? "My Linked Children"
                    : "Player List"}
                </h3>
              </div>

              {/* Subtle Segmented Mode Switcher */}
              {(!isParent || canLinkParent) && (
                <div className="flex items-center rounded-lg border border-blue-400/25 bg-[#040f30]/90 p-0.5 text-[11px] font-semibold">
                  {!isParent && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("roster");
                        setPage(1);
                      }}
                      className={`rounded-md px-2.5 py-1 transition ${
                        activeTab === "roster"
                          ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow"
                          : "text-blue-200/80 hover:text-white"
                      }`}
                    >
                      Players ({roster.length})
                    </button>
                  )}
                  {(isParent || myChildren.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("my-children");
                        setPage(1);
                      }}
                      className={`rounded-md px-2.5 py-1 transition ${
                        activeTab === "my-children"
                          ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow"
                          : "text-blue-200/80 hover:text-white"
                      }`}
                    >
                      My Children ({myChildren.length})
                    </button>
                  )}
                  {(isAdmin || canLinkParent) && !isParent && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("parent-links")}
                      className={`rounded-md px-2.5 py-1 transition ${
                        activeTab === "parent-links"
                          ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow"
                          : "text-blue-200/80 hover:text-white"
                      }`}
                    >
                      Parents ({parents.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeTab !== "parent-links" && (
              <p className="text-xs font-medium text-blue-200/75">
                Showing{" "}
                <span className="font-semibold text-white">
                  {filteredList.length === 0 ? 0 : startIdx + 1} -{" "}
                  {Math.min(startIdx + PAGE_SIZE, filteredList.length)}
                </span>{" "}
                of <span className="font-semibold text-white">{filteredList.length}</span> players
              </p>
            )}
          </div>

          {activeTab === "parent-links" ? (
            /* ==================== PARENTS DIRECTORY VIEW ==================== */
            <div className="grid flex-1 gap-4 p-5 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-5">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/60" />
                  <input
                    type="search"
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    placeholder="Search parent name or email..."
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] py-2 pl-8 pr-3 text-xs text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>

                {filteredParentsTab.length === 0 ? (
                  <p className="py-10 text-center text-xs text-blue-200/70">No parents found.</p>
                ) : (
                  <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                    {filteredParentsTab.map((parent) => {
                      const active = selectedParentId === String(parent.user_id);
                      const childCount = childrenByParentId[parent.user_id]?.length;
                      return (
                        <button
                          key={parent.user_id}
                          type="button"
                          onClick={() => {
                            setSelectedParentId(String(parent.user_id));
                            const cached = childrenByParentId[parent.user_id];
                            if (cached) setParentChildren(cached);
                            void loadParentChildren(parent.user_id);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                            active
                              ? "border-sky-400 bg-blue-600/40 text-white shadow-[0_0_16px_rgba(56,189,248,0.35)]"
                              : "border-blue-400/15 bg-[#040f30]/75 text-blue-100 hover:border-blue-400/40 hover:bg-blue-900/40"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-xs font-bold text-white">
                              {getInitials(parent.full_name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-white">
                                {parent.full_name}
                              </p>
                              <p className="truncate text-[11px] text-blue-200/70">
                                {parent.email || parent.username}
                              </p>
                            </div>
                          </div>
                          {childCount !== undefined && (
                            <span className="shrink-0 rounded-full border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                              {childCount} {childCount === 1 ? "child" : "children"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-blue-400/20 bg-[#040f30]/60 p-4 lg:col-span-7">
                {!selectedParentObj ? (
                  <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/30">
                      <UsersIcon className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-white">Select a Parent</p>
                    <p className="mt-1 max-w-xs text-xs text-blue-200/70">
                      Click any parent on the left to view, link, or unlink their children.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-400/15 pb-3.5">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {selectedParentObj.full_name}&apos;s Linked Children ({parentChildren.length})
                        </h4>
                        <p className="text-[11px] text-blue-200/75">
                          {[selectedParentObj.email, selectedParentObj.phone_number]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      </div>
                      {canLinkParent && (
                        <button
                          type="button"
                          onClick={() => openLinkModal(undefined, selectedParentObj.full_name)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(56,189,248,0.45)]"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          Link Player(s)
                        </button>
                      )}
                    </div>

                    {lookupError && (
                      <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2 text-xs text-rose-200">
                        {lookupError}
                      </div>
                    )}

                    {lookupLoading ? (
                      <div className="py-10 text-center text-xs text-blue-200/70">
                        Loading linked children...
                      </div>
                    ) : parentChildren.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-blue-400/25 bg-blue-950/35 py-10 text-center text-xs text-blue-200/70">
                        No players linked to {selectedParentObj.full_name} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {parentChildren.map((child) => {
                          const childName = getPlayerDisplayName(child);
                          return (
                            <div
                              key={`${child.link_id ?? child.player_user_id}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-[#06184a]/75 p-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-bold text-white">
                                  {getInitials(childName)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-white">
                                    {childName}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-200/75">
                                    <span className="inline-flex items-center gap-1 font-semibold text-sky-200">
                                      <Image src={crest} alt="ALAB" className="h-3 w-auto" />
                                      {child.age_category || "ALAB"}
                                    </span>
                                    {child.position && <span>• {child.position}</span>}
                                    {child.relationship && (
                                      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.2 text-[10px] font-semibold text-emerald-300">
                                        {child.relationship}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailPlayer(child)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-400/25 bg-blue-950/75 px-2.5 py-1.5 text-[11px] font-semibold text-blue-100 hover:border-sky-400 hover:text-white"
                                >
                                  <EyeIcon className="h-3.5 w-3.5" />
                                  Attendance
                                </button>
                                {canLinkParent && child.link_id && (
                                  <button
                                    type="button"
                                    disabled={unlinkingId === child.link_id}
                                    onClick={() => void handleUnlinkById(child.link_id, childName)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                                  >
                                    <UnlinkIcon className="h-3.5 w-3.5" />
                                    {unlinkingId === child.link_id ? "..." : "Unlink"}
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
              </div>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-sm text-blue-200/75">Loading players...</div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/30">
                <JerseyIcon className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-bold text-white">
                {activeTab === "my-children"
                  ? "No linked children found yet."
                  : "No matching players found."}
              </p>
              <p className="mt-1 max-w-sm text-xs text-blue-200/70">
                {activeTab === "my-children"
                  ? "Ask an ALAB FC admin or coach to link your child's player profile to your parent account."
                  : "Try adjusting your search/filters or add a new player to the ALAB FC roster."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {canLinkParent && (
                  <button
                    type="button"
                    onClick={() => openLinkModal()}
                    className="rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/25"
                  >
                    Link Player to Parent
                  </button>
                )}
                {canAddPlayer && (
                  <button
                    type="button"
                    onClick={() => setAddPlayerOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-400 px-4 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)]"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Player
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ==================== PLAYER LIST (MOBILE CARDS + DESKTOP TABLE) ==================== */
            <>
              {/* Mobile Card View (< md) */}
              <div className="divide-y divide-blue-400/15 md:hidden">
                {paginatedRows.map((player) => {
                  const displayName = getTablePlayerName(player);
                  const fullName = getPlayerDisplayName(player);
                  const links = getPlayerLinks(player);
                  const primaryParent = links[0] ?? null;
                  const isLinked = links.length > 0;
                  const isActive =
                    player.status.toLowerCase() === "active" ||
                    isLinked ||
                    quickStats.activePlayerIds.has(player.player_user_id);

                  return (
                    <div
                      key={`mob-${player.link_id ?? "p"}-${player.player_user_id}`}
                      className="space-y-3 p-4"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDetailPlayer(player)}
                          className="flex min-w-0 items-center gap-3 text-left"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-400/45 bg-gradient-to-br from-blue-500/80 to-indigo-900 text-xs font-extrabold text-white shadow-[0_0_12px_rgba(56,189,248,0.35)]">
                            {getInitials(fullName)}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-bold text-white">{displayName}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-blue-200/65">
                              {formatAlabCode(player.player_user_id)}
                            </p>
                          </div>
                        </button>

                        {isActive ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-blue-100/90">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Image src={crest} alt="ALAB FC" className="h-4 w-auto" />
                          {player.age_category || "ALAB FC"}
                        </span>
                        {player.position && <span>• {player.position}</span>}
                        {player.jersey_number !== null && (
                          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-200">
                            #{player.jersey_number}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 rounded-xl border border-blue-400/15 bg-[#040f30]/75 px-3 py-2 text-xs">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-300/70">
                          {links.length > 1 ? `Parents (${links.length})` : "Parent"}
                        </span>
                        {links.length > 0 ? (
                          <div className="space-y-1.5">
                            {links.map((link, lIdx) => (
                              <div
                                key={`${link.link_id ?? link.parent_user_id ?? lIdx}`}
                                className="flex items-center justify-between gap-2"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-400/35 bg-blue-900/80 text-[9px] font-bold text-sky-200">
                                    {getInitials(link.parent_name)}
                                  </span>
                                  <span className="truncate font-semibold text-white">
                                    {link.parent_name}
                                    {link.relationship ? (
                                      <span className="ml-1 text-[10px] font-normal text-blue-200/70">
                                        ({link.relationship})
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                                {canLinkParent && link.link_id && (
                                  <button
                                    type="button"
                                    disabled={unlinkingId === link.link_id}
                                    onClick={() => void handleUnlinkById(link.link_id, `${fullName} from ${link.parent_name}`)}
                                    title={`Unlink ${link.parent_name}`}
                                    aria-label={`Unlink ${link.parent_name}`}
                                    className="rounded-md p-1 text-rose-300/80 transition hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-50"
                                  >
                                    <CloseIcon className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-blue-300/55">Not linked</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailPlayer(player)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2 text-xs font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          Attendance
                        </button>
                        {canLinkParent && (
                          <button
                            type="button"
                            onClick={() => openLinkModal(player.player_user_id)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-200"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            Link
                          </button>
                        )}
                        {canLinkParent && links.length === 1 && primaryParent?.link_id && (
                          <button
                            type="button"
                            disabled={unlinkingId === primaryParent.link_id}
                            onClick={() => void handleUnlinkById(primaryParent.link_id, fullName)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-400/35 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-50"
                          >
                            <UnlinkIcon className="h-3.5 w-3.5" />
                            Unlink
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-blue-400/20 bg-[#051238]/75 text-[11px] font-bold uppercase tracking-wider text-blue-200/75">
                      <th className="w-10 px-4 py-3">#</th>
                      <th className="px-3 py-3">Player</th>
                      <th className="px-3 py-3">Team</th>
                      <th className="px-3 py-3">Position / #</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Parent</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-400/15">
                    {paginatedRows.map((player, idx) => {
                      const rowNum = startIdx + idx + 1;
                      const displayName = getTablePlayerName(player);
                      const fullName = getPlayerDisplayName(player);
                      const links = getPlayerLinks(player);
                      const primaryParent = links[0] ?? null;
                      const isLinked = links.length > 0;
                      const isActive =
                        player.status.toLowerCase() === "active" ||
                        isLinked ||
                        quickStats.activePlayerIds.has(player.player_user_id);

                      return (
                        <tr
                          key={`${player.link_id ?? "p"}-${player.player_user_id}`}
                          className="transition hover:bg-blue-600/15"
                        >
                          <td className="px-4 py-3 font-semibold text-blue-200/75">{rowNum}</td>

                          {/* PLAYER */}
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => setDetailPlayer(player)}
                              className="group flex items-center gap-3 text-left"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-400/45 bg-gradient-to-br from-blue-500/80 to-indigo-900 text-xs font-extrabold text-white shadow-[0_0_12px_rgba(56,189,248,0.35)]">
                                {getInitials(fullName)}
                              </span>
                              <div className="min-w-0 leading-tight">
                                <p className="truncate text-sm font-bold text-white transition group-hover:text-sky-300">
                                  {displayName}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-blue-200/65">
                                  {formatAlabCode(player.player_user_id)}
                                </p>
                              </div>
                            </button>
                          </td>

                          {/* TEAM */}
                          <td className="px-3 py-3">
                            <div className="inline-flex items-center gap-2 font-semibold text-blue-100">
                              <Image
                                src={crest}
                                alt="ALAB FC"
                                className="h-5 w-auto shrink-0 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]"
                              />
                              <span>{player.age_category || "ALAB FC"}</span>
                            </div>
                          </td>

                          {/* POSITION / AGE / JERSEY */}
                          <td className="px-3 py-3 text-blue-100/90">
                            <div className="flex items-center gap-1.5">
                              {player.age !== null && (
                                <span className="font-bold text-white">{player.age} yrs</span>
                              )}
                              {player.position && (
                                <span className="font-medium text-blue-100">{player.position}</span>
                              )}
                              {player.jersey_number !== null && (
                                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-200">
                                  #{player.jersey_number}
                                </span>
                              )}
                              {player.age === null &&
                                !player.position &&
                                player.jersey_number === null && (
                                  <span className="text-blue-300/50">—</span>
                                )}
                            </div>
                          </td>

                          {/* STATUS */}
                          <td className="px-3 py-3">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                Pending
                              </span>
                            )}
                          </td>

                          {/* PARENT (Lists ALL linked parents clearly!) */}
                          <td className="px-3 py-3">
                            {links.length > 0 ? (
                              <div className="space-y-1.5">
                                {links.map((link, lIdx) => (
                                  <div
                                    key={`${link.link_id ?? link.parent_user_id ?? lIdx}`}
                                    className="group/parent flex items-center justify-between gap-2"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-400/35 bg-blue-900/80 text-[10px] font-bold text-sky-200">
                                        {getInitials(link.parent_name)}
                                      </span>
                                      <div className="min-w-0 leading-tight">
                                        <p className="truncate text-xs font-semibold text-white">
                                          {link.parent_name}
                                        </p>
                                        {link.relationship && (
                                          <p className="text-[10px] text-blue-200/65">
                                            {link.relationship}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {canLinkParent && links.length > 1 && link.link_id && (
                                      <button
                                        type="button"
                                        disabled={unlinkingId === link.link_id}
                                        onClick={() =>
                                          void handleUnlinkById(
                                            link.link_id,
                                            `${fullName} from ${link.parent_name}`
                                          )
                                        }
                                        title={`Unlink ${link.parent_name}`}
                                        aria-label={`Unlink ${link.parent_name}`}
                                        className="shrink-0 rounded-md p-1 text-rose-300/75 opacity-80 transition hover:bg-rose-500/20 hover:text-rose-200 hover:opacity-100 disabled:opacity-40"
                                      >
                                        <CloseIcon className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : canLinkParent ? (
                              <button
                                type="button"
                                onClick={() => openLinkModal(player.player_user_id)}
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-sky-400/45 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-500/25 hover:text-white"
                              >
                                <LinkIcon className="h-3 w-3" />
                                Link Parent
                              </button>
                            ) : (
                              <span className="text-blue-300/50">Unlinked</span>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailPlayer(player)}
                                title="View Attendance & History"
                                aria-label={`View attendance for ${fullName}`}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/25 bg-[#06184a]/90 text-blue-200 transition hover:border-sky-400 hover:bg-blue-700/60 hover:text-white"
                              >
                                <EyeIcon className="h-3.5 w-3.5" />
                              </button>

                              {canLinkParent && (
                                <button
                                  type="button"
                                  onClick={() => openLinkModal(player.player_user_id)}
                                  title="Link to Parent"
                                  aria-label={`Link ${fullName} to parent`}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/25 bg-[#06184a]/90 text-sky-300 transition hover:border-sky-400 hover:bg-blue-700/60 hover:text-white"
                                >
                                  <LinkIcon className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {canLinkParent && primaryParent?.link_id ? (
                                <button
                                  type="button"
                                  disabled={unlinkingId === primaryParent.link_id}
                                  onClick={() =>
                                    void handleUnlinkById(primaryParent.link_id, fullName)
                                  }
                                  title={`Unlink from ${primaryParent.parent_name}`}
                                  aria-label={`Unlink ${fullName}`}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/25 hover:text-white disabled:opacity-50"
                                >
                                  <UnlinkIcon className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDetailPlayer(player)}
                                  title="Attendance History"
                                  aria-label={`Attendance history for ${fullName}`}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/25 bg-[#06184a]/90 text-blue-200 transition hover:border-sky-400 hover:bg-blue-700/60 hover:text-white"
                                >
                                  <HistoryIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-blue-400/20 px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/25 bg-[#051238] text-blue-200 transition hover:border-sky-400 hover:text-white disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>

                  {visiblePages.map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPage(pg)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                        pg === safePage
                          ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_0_16px_rgba(56,189,248,0.55)]"
                          : "border border-blue-400/20 bg-[#051238]/75 text-blue-200 hover:border-sky-400/50 hover:text-white"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/25 bg-[#051238] text-blue-200 transition hover:border-sky-400 hover:text-white disabled:opacity-40"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>

                <span className="text-[11px] font-medium text-blue-200/70">
                  Page {safePage} of {totalPages}
                </span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT (3/12): Quick Stats Card with Glowing Attendance Rate Ring */}
        <div className="dash-card flex flex-col justify-between rounded-2xl p-5 xl:col-span-3">
          <div>
            <div className="flex items-center gap-2.5 border-b border-blue-400/15 pb-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                <BarChartIcon className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-white">Quick Stats</h3>
            </div>

            {/* Glowing Circular Attendance Rate Donut */}
            <div className="flex flex-col items-center py-6 text-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg
                  className="h-full w-full -rotate-90 drop-shadow-[0_0_14px_rgba(56,189,248,0.55)]"
                  viewBox="0 0 112 112"
                >
                  <circle
                    cx="56"
                    cy="56"
                    r={donutRadius}
                    fill="none"
                    stroke="rgba(37,99,235,0.22)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={donutRadius}
                    fill="none"
                    stroke="url(#playersQuickStatsRing)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={donutCirc}
                    strokeDashoffset={donutOffset}
                  />
                  <defs>
                    <linearGradient id="playersQuickStatsRing" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-3xl font-extrabold tracking-tight text-white">
                  {quickStats.rate}%
                </span>
              </div>
              <p className="mt-3 text-sm font-bold text-white">Attendance Rate</p>
              <p className="mt-0.5 text-xs font-medium text-emerald-300">
                {quickStats.total > 0
                  ? `${quickStats.total} recorded logs`
                  : "Awaiting attendance logs"}
              </p>
            </div>
          </div>

          {/* 4 Breakdown Rows */}
          <div className="space-y-3 border-t border-blue-400/15 pt-4 text-xs">
            <QuickStatRow
              icon={<CheckIcon className="h-3.5 w-3.5" />}
              iconClass="bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
              label="Present"
              count={quickStats.present}
            />
            <QuickStatRow
              icon={<CloseIcon className="h-3.5 w-3.5" />}
              iconClass="bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40"
              label="Absent"
              count={quickStats.absent}
            />
            <QuickStatRow
              icon={<ClockIcon className="h-3.5 w-3.5" />}
              iconClass="bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
              label="Late"
              count={quickStats.late}
            />
            <QuickStatRow
              icon={<InfoIcon className="h-3.5 w-3.5" />}
              iconClass="bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40"
              label="Excused"
              count={quickStats.excused}
            />
          </div>
        </div>
      </div>

      {/* ==================== LINK PLAYER(S) TO PARENT MODAL (BY PARENT NAME) ==================== */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setLinkModalOpen(false)}
          />
          <div className="dash-card relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2670] via-[#081d5c] to-[#061544] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                  <UsersIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Link Player(s) to Parent</h3>
                  <p className="text-xs text-blue-200/80">
                    Choose a parent by name and select one or multiple children.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                aria-label="Close modal"
                className="rounded-lg border border-blue-400/20 bg-white/5 p-1.5 text-blue-200 transition hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <form
              method="post"
              onSubmit={handleSubmitLinks}
              className="flex-1 space-y-4 overflow-y-auto p-5"
            >
              {linkModalError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3.5 py-2.5 text-xs font-medium text-rose-200"
                >
                  {linkModalError}
                </div>
              )}

              {/* Parent Name Picker (from GET /api/parents) + Relationship (Glowing CustomSelect!) */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-blue-100">
                    <UserIcon className="h-3.5 w-3.5 text-sky-400" />
                    Parent Name
                  </label>
                  {!isParent && parents.length > 0 ? (
                    <CustomSelect
                      ariaLabel="Parent Name"
                      value={linkParentName}
                      onChange={setLinkParentName}
                      placeholder="Select parent..."
                      leadingIcon={<UserIcon className="h-4 w-4" />}
                      className="w-full"
                      options={parents.map((p) => ({
                        value: p.full_name,
                        label: p.username ? `${p.full_name} (@${p.username})` : p.full_name,
                        icon: <UserIcon className="h-4 w-4" />,
                      }))}
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      disabled={isParent && !!currentUserName}
                      value={linkParentName}
                      onChange={(e) => setLinkParentName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full rounded-xl border border-blue-400/30 bg-[#041034] px-3.5 py-2.5 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none disabled:opacity-65"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-blue-100">
                    <ShieldIcon className="h-3.5 w-3.5 text-sky-400" />
                    Relationship
                  </label>
                  <CustomSelect
                    ariaLabel="Relationship"
                    value={linkRelationship}
                    onChange={setLinkRelationship}
                    className="w-full"
                    options={RELATIONSHIP_OPTIONS.map((rel) => ({
                      value: rel.label,
                      label: rel.label,
                      icon:
                        rel.label === "Mother" ? (
                          <UserIcon className="h-4 w-4" />
                        ) : rel.label === "Guardian" ? (
                          <ShieldIcon className="h-4 w-4" />
                        ) : (
                          <UsersIcon className="h-4 w-4" />
                        ),
                    }))}
                  />
                </div>
              </div>

              {/* Multi-select Player Checkboxes */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-blue-100">
                    <UsersIcon className="h-3.5 w-3.5 text-sky-400" />
                    Select Player(s) ({selectedLinkPlayerIds.size} selected)
                  </label>
                  {selectedLinkPlayerIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedLinkPlayerIds(new Set())}
                      className="text-[11px] font-semibold text-sky-300 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative mb-2">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/65" />
                  <input
                    type="search"
                    value={linkModalPlayerSearch}
                    onChange={(e) => setLinkModalPlayerSearch(e.target.value)}
                    placeholder="Search players by name or division..."
                    className="w-full rounded-xl border border-blue-400/25 bg-[#041034] py-2 pl-8 pr-3 text-xs text-white placeholder:text-blue-300/50 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                {modalFilteredRoster.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-blue-400/20 bg-[#030b24]/80 py-6 text-center text-xs text-blue-200/70">
                    No players found.
                  </div>
                ) : (
                  <div className="sidebar-scroll max-h-52 space-y-1 overflow-y-auto rounded-xl border border-blue-400/25 bg-[#030c29]/95 p-2">
                    {modalFilteredRoster.map((p) => {
                      const checked = selectedLinkPlayerIds.has(p.player_user_id);
                      const pName = getPlayerDisplayName(p);
                      return (
                        <label
                          key={p.player_user_id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                            checked ? "bg-blue-600/35 text-white ring-1 ring-sky-400/35" : "text-blue-100/85 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedLinkPlayerIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(p.player_user_id)) next.delete(p.player_user_id);
                                  else next.add(p.player_user_id);
                                  return next;
                                });
                              }}
                              className="h-4 w-4 shrink-0 rounded accent-sky-500"
                            />
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-400/40 bg-gradient-to-br from-blue-500/80 to-indigo-900 text-[10px] font-extrabold text-white">
                              {getInitials(pName)}
                            </span>
                            <span className="truncate font-semibold text-white">{pName}</span>
                            {p.age_category && (
                              <span className="shrink-0 rounded-md bg-blue-500/25 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
                                {p.age_category}
                              </span>
                            )}
                            {p.jersey_number !== null && (
                              <span className="shrink-0 font-mono text-[10px] text-blue-200/75">
                                #{p.jersey_number}
                              </span>
                            )}
                          </div>
                          <span className="ml-2 shrink-0 text-[11px] text-blue-300/75">
                            {p.position || `ID #${p.player_user_id}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-blue-400/15 pt-3">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-[#05143f] px-4 py-2 text-xs font-semibold text-blue-200 transition hover:border-blue-400/60 hover:text-white"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.6)] transition hover:from-blue-500 hover:to-sky-300 disabled:opacity-60"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {linking ? "Linking..." : `Link Player${selectedLinkPlayerIds.size > 1 ? "s" : ""}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      <AddPlayerModal
        open={addPlayerOpen}
        onClose={() => setAddPlayerOpen(false)}
        onCreated={() => {
          setToast({ type: "success", message: "Player added successfully!" });
          void loadPlayers();
          if (onDataChanged) onDataChanged();
        }}
      />

      {/* Unlink Confirmation Modal */}
      <ConfirmModal
        open={pendingUnlink !== null}
        title="Unlink Parent & Player?"
        message={`Are you sure you want to unlink ${pendingUnlink?.label ?? "this player"}? You can always link them again later.`}
        confirmLabel="Unlink"
        busy={unlinkingId !== null}
        onCancel={() => {
          if (unlinkingId === null) setPendingUnlink(null);
        }}
        onConfirm={() => void executeConfirmedUnlink()}
      />
    </div>
  );
}

function PlayerKpiCard({
  accent,
  glow,
  icon,
  value,
  label,
  meta,
  metaClass,
  infoTitle,
}: {
  accent: string;
  glow: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  meta?: string;
  metaClass?: string;
  infoTitle?: string;
}) {
  return (
    <div className="dash-card relative flex flex-col justify-between gap-2 overflow-hidden rounded-2xl px-3.5 py-3.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-4">
      <span className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${accent}`} />
      <div className="flex min-w-0 items-center gap-2.5 pl-1 sm:gap-3.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-11 sm:w-11 ${glow}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xl font-extrabold leading-none tracking-tight text-white sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-blue-200/80 sm:text-xs">
            {label}
          </p>
        </div>
      </div>

      {meta && (
        <span className={`pl-1 text-[10px] font-bold sm:shrink-0 sm:pl-0 sm:text-[11px] ${metaClass ?? "text-sky-300"}`}>
          {meta}
        </span>
      )}
      {infoTitle && (
        <span
          title={infoTitle}
          className="absolute right-2.5 top-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-blue-200/70 transition hover:bg-white/10 hover:text-white sm:static"
        >
          <InfoIcon className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

function QuickStatRow({
  icon,
  iconClass,
  label,
  count,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${iconClass}`}>
          {icon}
        </span>
        <span className="font-medium text-blue-100/90">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-white">{count}</span>
    </div>
  );
}
