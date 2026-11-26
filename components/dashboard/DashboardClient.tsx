"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import crest from "@/app/logo/logoALAB.png";
import alabBall from "@/app/logo/ball.png";
import stadiumBg from "@/app/logo/backgoundimage.png";
import {
  clearAuthToken,
  fetchDailyAttendance,
  fetchPortalSession,
  getAuthToken,
  groupModulesByParent,
  type DailyAttendanceSummary,
  type DashboardData,
  type ModuleGroup,
} from "@/lib/api";
import {
  BallIcon,
  BarChartIcon,
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  CloseIcon,
  CrownIcon,
  HistoryIcon,
  HomeIcon,
  ImageIcon,
  LogoutIcon,
  MegaphoneIcon,
  MenuIcon,
  PlusIcon,
  ReceiptIcon,
  RefreshIcon,
  SettingsIcon,
  ShieldIcon,
  ShieldLockIcon,
  TrendUpIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import RbacManager from "./RbacManager";
import AttendanceManager from "./AttendanceManager";
import PlayersManager from "./PlayersManager";
import CustomSelect from "@/components/ui/CustomSelect";
import ProfileManager from "./ProfileManager";
import TournamentsManager from "./TournamentsManager";
import UserManagementManager from "./UserManagementManager";
import AddPlayerModal from "./AddPlayerModal";
import ConfirmModal from "./ConfirmModal";

type ActiveTab = "overview" | "rbac" | "users" | "no-access" | `group:${number}`;
type ActivityFilter = "week" | "attendance" | "all";

function formatPeso(amount: unknown): string {
  const num = Number(amount ?? 0);
  if (Number.isNaN(num)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(val: unknown): string {
  if (!val) return "—";
  const str = String(val);
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return str;
  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pickStr(obj: Record<string, unknown>, keys: string[], fallback = "—"): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return fallback;
}

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (/(paid|present|active|completed|approved|confirmed)/.test(s)) {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
  }
  if (/(pending|upcoming|late|scheduled|partial)/.test(s)) {
    return "bg-blue-500/25 text-blue-200 border-blue-400/40";
  }
  if (/(overdue|absent|unpaid|cancelled|rejected)/.test(s)) {
    return "bg-rose-500/20 text-rose-300 border-rose-400/40";
  }
  return "bg-blue-500/20 text-blue-200 border-blue-400/35";
}

function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  if (/dashboard|home/.test(n)) return <HomeIcon className={className} />;
  if (/tournament|match|fixture|standing|league/.test(n)) return <TrophyIcon className={className} />;
  if (/attendance|training|schedule|calendar/.test(n)) return <CalendarIcon className={className} />;
  if (/soa|bill|payment|finance|fee|invoice/.test(n)) return <ReceiptIcon className={className} />;
  if (/gallery|photo|media/.test(n)) return <ImageIcon className={className} />;
  if (/announcement|news|notice/.test(n)) return <MegaphoneIcon className={className} />;
  if (/setting|config/.test(n)) return <SettingsIcon className={className} />;
  if (/rbac|role|permission|access|admin/.test(n)) return <CrownIcon className={className} />;
  if (/player|child|team|coach|roster|member|user/.test(n)) return <UsersIcon className={className} />;
  if (/profile|account/.test(n)) return <UserIcon className={className} />;
  return <BallIcon className={className} />;
}

function groupCategory(
  name: string
): "tournaments" | "attendance" | "soa" | "players" | "profile" | "users" | "generic" {
  const n = name.toLowerCase();
  if (/profile|own\s*account|my\s*account/.test(n)) return "profile";
  if (/user\s*management|manage\s*user|user\s*role|^users$/.test(n)) return "users";
  if (/tournament|match|fixture|event/.test(n)) return "tournaments";
  if (/attendance|training|session/.test(n)) return "attendance";
  if (/soa|bill|payment|finance|fee/.test(n)) return "soa";
  if (/player|child|roster|team/.test(n)) return "players";
  return "generic";
}

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("week");
  const [todayAttendanceSummary, setTodayAttendanceSummary] = useState<DailyAttendanceSummary | null>(null);
  const [playerLookup, setPlayerLookup] = useState<
    Record<number, { name: string; division: string }>
  >({});
  const [logoutConfirmMode, setLogoutConfirmMode] = useState<"manual" | "back" | null>(null);
  const tabHistoryRef = useRef<ActiveTab[]>([]);
  const guardPushedRef = useRef(false);

  const navigateTab = useCallback((next: ActiveTab) => {
    setActiveTab((prev) => {
      if (prev === next) return prev;
      tabHistoryRef.current = [...tabHistoryRef.current.slice(-19), prev];
      return next;
    });
    if (typeof window !== "undefined") {
      window.history.pushState({ alabPortal: true, tab: next }, "", window.location.href);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);
    const res = await fetchPortalSession();
    setLoading(false);

    if (res.status === 401) {
      clearAuthToken();
      router.replace("/login");
      return;
    }

    if (res.ok && res.data) {
      const session = res.data;
      setData(session);

      // Also fetch today's live daily attendance summary + player names for Dashboard donut & Recent Activity
      const hasAttendanceAccess = session.access.modules.some((m) =>
        /attendance|training/i.test(m.name)
      );
      if (hasAttendanceAccess) {
        const dailyRes = await fetchDailyAttendance();
        if (dailyRes.ok && dailyRes.data) {
          setTodayAttendanceSummary(dailyRes.data.summary);
          const lookup: Record<number, { name: string; division: string }> = {};
          for (const p of dailyRes.data.players) {
            const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
            if (p.player_user_id) {
              lookup[p.player_user_id] = {
                name: full || `Player #${p.player_user_id}`,
                division: p.age_category || "",
              };
            }
          }
          setPlayerLookup(lookup);
        }
      }

      const groups = groupModulesByParent(session.access.modules, {
        collapseOrphans: true,
      }).filter(
        (g) =>
          !/^dashboard$/i.test(g.parent.name.trim()) &&
          !/(rbac|role\s*access)/i.test(g.parent.name.trim())
      );
      const userIsAdmin = session.role_id === 5 || session.role_name.toLowerCase() === "admin";

      setActiveTab((prev) => {
        if (prev === "rbac" && userIsAdmin) return "rbac";
        if (prev === "users" && userIsAdmin) return "users";
        if (prev === "overview" && session.has_dashboard_access) return "overview";
        if (prev.startsWith("group:")) {
          const stillAllowed = groups.some((g) => `group:${g.parent.id}` === prev);
          if (stillAllowed) return prev;
        }
        if (session.has_dashboard_access) return "overview";
        if (groups.length > 0) return `group:${groups[0].parent.id}`;
        if (userIsAdmin) return "rbac";
        return "no-access";
      });
    } else {
      setError(res.message || "Unable to load portal.");
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  // Browser Back-button, bfcache, and cross-tab session security guard
  useEffect(() => {
    if (!data || typeof window === "undefined") return;

    if (!guardPushedRef.current) {
      window.history.pushState({ alabPortal: true, rootGuard: true }, "", window.location.href);
      guardPushedRef.current = true;
    }

    function enforceSessionOrRedirect() {
      if (!getAuthToken()) {
        setData(null);
        window.location.replace("/login");
        return false;
      }
      return true;
    }

    function handlePopState() {
      if (!enforceSessionOrRedirect()) return;

      if (tabHistoryRef.current.length > 0) {
        const prevTab = tabHistoryRef.current.pop()!;
        setActiveTab(prevTab);
        setSidebarOpen(false);
        if (tabHistoryRef.current.length === 0) {
          window.history.pushState({ alabPortal: true, rootGuard: true }, "", window.location.href);
        }
        return;
      }

      // Already on root portal view — stay securely inside /dashboard and confirm before logging out
      window.history.pushState({ alabPortal: true, rootGuard: true }, "", window.location.href);
      setLogoutConfirmMode("back");
    }

    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted || !getAuthToken()) {
        enforceSessionOrRedirect();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        enforceSessionOrRedirect();
      }
    }

    function handleStorage(e: StorageEvent) {
      if (e.key === "token" && !e.newValue) {
        setData(null);
        window.location.replace("/login");
      }
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [data]);

  const moduleGroups = useMemo(
    () => groupModulesByParent(data?.access.modules ?? [], { collapseOrphans: true }),
    [data?.access.modules]
  );

  const sidebarGroups = useMemo(
    () =>
      moduleGroups.filter(
        (g) =>
          !/^dashboard$/i.test(g.parent.name.trim()) &&
          !/(rbac|role\s*access)/i.test(g.parent.name.trim())
      ),
    [moduleGroups]
  );

  const attendanceSummary = useMemo(() => {
    if (todayAttendanceSummary && todayAttendanceSummary.total_players > 0) {
      const present = todayAttendanceSummary.present + todayAttendanceSummary.late;
      const absent = todayAttendanceSummary.absent;
      const marked = present + absent + todayAttendanceSummary.excused;
      const denom = marked > 0 ? marked : todayAttendanceSummary.total_players;
      const rate = denom > 0 ? Math.round((present / denom) * 100) : 0;
      return { present, absent, total: denom, rate };
    }
    const list = data?.recent_attendance ?? [];
    let present = 0;
    let absent = 0;
    for (const row of list) {
      const s = pickStr(row, ["status", "attendance_status"], "").toLowerCase();
      if (/(absent|missed|no.?show)/.test(s)) absent++;
      else present++;
    }
    const total = present + absent;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, rate };
  }, [data?.recent_attendance, todayAttendanceSummary]);

  const recentActivities = useMemo(() => {
    if (!data) return [];
    const items: Array<{
      id: string;
      kind: "attendance" | "soa" | "tournament";
      title: string;
      subtitle: string;
      date: string;
      status: string;
    }> = [];

    for (let i = 0; i < data.recent_attendance.length; i++) {
      const att = data.recent_attendance[i];
      const nestedPlayer =
        att.player && typeof att.player === "object"
          ? (att.player as Record<string, unknown>)
          : att.user && typeof att.user === "object"
          ? (att.user as Record<string, unknown>)
          : null;
      const directFirstLast = [att.first_name, att.last_name]
        .filter((v) => typeof v === "string" && v.trim())
        .join(" ")
        .trim();
      const nestedFirstLast = nestedPlayer
        ? [nestedPlayer.first_name, nestedPlayer.last_name]
            .filter((v) => typeof v === "string" && v.trim())
            .join(" ")
            .trim()
        : "";
      const pid = Number(
        att.player_user_id ?? att.player_id ?? att.user_id ?? nestedPlayer?.id ?? 0
      );
      const fromLookup = pid > 0 ? playerLookup[pid] : undefined;

      const resolvedName =
        pickStr(att, ["player_name", "full_name", "student_name", "user_name", "name"], "") ||
        directFirstLast ||
        (nestedPlayer ? pickStr(nestedPlayer, ["full_name", "name", "username"], "") : "") ||
        nestedFirstLast ||
        fromLookup?.name ||
        (pid > 0 ? `Player #${pid}` : "Player Attendance");

      const rawSub = pickStr(
        att,
        ["remarks", "notes", "session_title", "session_name", "event_name"],
        "Training Session"
      );
      const division = String(att.age_category ?? fromLookup?.division ?? "").trim();
      const subtitle = division && !rawSub.includes(division) ? `${division} • ${rawSub}` : rawSub;

      items.push({
        id: `att-${String(att.id ?? att.attendance_id ?? i)}`,
        kind: "attendance",
        title: resolvedName,
        subtitle,
        date: formatDate(att.date ?? att.attendance_date ?? att.session_date ?? att.created_at),
        status: pickStr(att, ["status", "attendance_status"], "Present"),
      });
    }

    for (let i = 0; i < data.soas.length; i++) {
      const s = data.soas[i];
      items.push({
        id: `soa-${String(s.id ?? i)}`,
        kind: "soa",
        title: pickStr(s, ["description", "title", "soa_number", "billing_period"], `SOA #${s.id ?? i + 1}`),
        subtitle: `Balance: ${formatPeso(s.balance ?? s.amount_due ?? s.total_amount ?? s.amount)}`,
        date: formatDate(s.due_date ?? s.billing_date ?? s.created_at),
        status: pickStr(s, ["status", "payment_status"], "Pending"),
      });
    }

    for (let i = 0; i < data.upcoming_tournaments.length; i++) {
      const t = data.upcoming_tournaments[i];
      items.push({
        id: `tour-${String(t.id ?? i)}`,
        kind: "tournament",
        title: pickStr(t, ["name", "tournament_name", "title"], `Tournament #${i + 1}`),
        subtitle: pickStr(t, ["location", "venue", "address"], "Scheduled Event"),
        date: formatDate(t.start_date ?? t.date ?? t.event_date),
        status: pickStr(t, ["status"], "Upcoming"),
      });
    }

    if (activityFilter === "attendance") return items.filter((it) => it.kind === "attendance");
    return items.slice(0, 6);
  }, [data, activityFilter, playerLookup]);

  function findGroupByCategory(cat: ReturnType<typeof groupCategory>): ModuleGroup | undefined {
    return sidebarGroups.find((g) => groupCategory(g.parent.name) === cat);
  }

  function performLogout() {
    clearAuthToken();
    setLogoutConfirmMode(null);
    setData(null);
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    } else {
      router.replace("/login");
    }
  }

  function requestLogout() {
    setSidebarOpen(false);
    setLogoutConfirmMode("manual");
  }

  if (loading && !data) {
    return (
      <div className="dash-bg flex min-h-dvh flex-col items-center justify-center text-white">
        <Image src={crest} alt="ALAB Football Club" priority className="h-16 w-auto animate-pulse" />
        <p className="mt-4 text-sm font-medium text-blue-200">Loading ALAB Football Club Portal...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dash-bg flex min-h-dvh flex-col items-center justify-center px-4 text-center text-white">
        <Image src={crest} alt="ALAB Football Club" className="h-14 w-auto" />
        <h1 className="mt-4 text-xl font-bold">Could not load portal</h1>
        <p className="mt-1 max-w-md text-sm text-blue-200/80">{error}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={performLogout}
            className="rounded-xl border border-blue-400/50 px-5 py-2.5 text-sm font-semibold text-blue-100 hover:bg-white/10"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isAdmin = data.role_id === 5 || data.role_name.toLowerCase() === "admin";
  const displayName =
    data.user.full_name ||
    [data.user.first_name, data.user.last_name].filter(Boolean).join(" ") ||
    data.user.username ||
    data.role_name;

  const activeGroup: ModuleGroup | undefined = activeTab.startsWith("group:")
    ? sidebarGroups.find((g) => `group:${g.parent.id}` === activeTab)
    : undefined;

  const tournamentsGroup = findGroupByCategory("tournaments");
  const attendanceGroup = findGroupByCategory("attendance");
  const soaGroup = findGroupByCategory("soa");
  const profileGroup = findGroupByCategory("profile");

  const headerSubtitle =
    activeTab === "rbac"
      ? "Role Permissions"
      : activeTab === "users"
      ? "User Management"
      : activeTab === "overview"
      ? `${data.role_name} Dashboard`
      : activeGroup
      ? groupCategory(activeGroup.parent.name) === "players"
        ? "Players Management"
        : groupCategory(activeGroup.parent.name) === "profile"
        ? "My Profile"
        : groupCategory(activeGroup.parent.name) === "users"
        ? "User Management"
        : activeGroup.parent.name
      : `${data.role_name} Portal`;

  const canCreateTournament =
    !!tournamentsGroup &&
    (isAdmin || tournamentsGroup.actions.some((a) => /create|add|manage/i.test(a.name)));

  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - attendanceSummary.rate / 100);

  function renderSidebarContent() {
    if (!data) return null;
    return (
      <div className="relative flex h-full flex-col overflow-hidden border-r border-blue-400/20 bg-gradient-to-b from-[#040d2a] via-[#051238] to-[#03091f] text-white">
        {/* Subtle top crest ambient glow */}
        <div className="pointer-events-none absolute -top-10 left-1/2 h-32 w-44 -translate-x-1/2 rounded-full bg-blue-500/20 blur-2xl" />

        {/* Compact Crest + Brand */}
        <div className="relative shrink-0 px-4 pb-2.5 pt-3.5 text-center">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-blue-200 hover:bg-white/10 lg:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <Image
            src={crest}
            alt="ALAB Football Club"
            priority
            className="mx-auto h-14 w-auto drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
          />
          <div className="mt-1.5 font-display uppercase italic leading-none">
            <span className="block text-xl font-extrabold tracking-wider text-white">ALAB</span>
            <span className="mt-0.5 block text-[10px] font-bold tracking-[0.16em] text-blue-100/90">
              Football Club
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium italic text-blue-200/70">
            Keep the fire burning
          </p>
          <div className="mx-auto mt-2.5 h-px w-full bg-gradient-to-r from-transparent via-blue-400/25 to-transparent" />
        </div>

        {/* Clean Top-Level Navigation (Fits cleanly without clipping or ugly scrollbars) */}
        <nav className="sidebar-scroll relative flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
          {data.has_dashboard_access && (
            <button
              type="button"
              onClick={() => {
                navigateTab("overview");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white shadow-[0_0_18px_rgba(56,189,248,0.55)]"
                  : "text-blue-100/80 hover:bg-blue-500/15 hover:text-white"
              }`}
            >
              <HomeIcon className="h-4 w-4 shrink-0" />
              <span>Dashboard</span>
            </button>
          )}

          {sidebarGroups.map((group) => {
            const tabKey: ActiveTab = `group:${group.parent.id}`;
            const active = activeTab === tabKey;
            return (
              <button
                key={group.parent.id}
                type="button"
                onClick={() => {
                  navigateTab(tabKey);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white shadow-[0_0_18px_rgba(56,189,248,0.55)]"
                    : "text-blue-100/80 hover:bg-blue-500/15 hover:text-white"
                }`}
              >
                <ModuleIcon name={group.parent.name} className="h-4 w-4 shrink-0" />
                <span className="truncate">{group.parent.name}</span>
              </button>
            );
          })}

          {isAdmin &&
            !sidebarGroups.some((g) => groupCategory(g.parent.name) === "users") && (
              <button
                type="button"
                onClick={() => {
                  navigateTab("users");
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition ${
                  activeTab === "users"
                    ? "bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white shadow-[0_0_18px_rgba(56,189,248,0.55)]"
                    : "text-blue-100/80 hover:bg-blue-500/15 hover:text-white"
                }`}
              >
                <UsersIcon className="h-4 w-4 shrink-0" />
                <span>User Management</span>
              </button>
            )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                navigateTab("rbac");
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition ${
                activeTab === "rbac"
                  ? "bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white shadow-[0_0_18px_rgba(56,189,248,0.55)]"
                  : "text-blue-100/85 hover:bg-blue-500/15 hover:text-white"
              }`}
            >
              <CrownIcon
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "rbac" ? "text-white" : "text-amber-400"
                }`}
              />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>

        {/* Compact Bottom Slogan + User + Logout */}
        <div className="relative shrink-0 space-y-2 border-t border-blue-400/15 px-3 py-2.5">
          <div className="relative overflow-hidden rounded-xl border border-blue-400/30 bg-gradient-to-br from-[#06184c] via-[#09236b] to-[#051238] px-3 py-2.5">
            <Image
              src={alabBall}
              alt="ALAB Football"
              className="pointer-events-none absolute -bottom-2 -right-2 h-14 w-14 object-contain drop-shadow-[0_0_14px_rgba(56,189,248,0.65)]"
            />
            <p className="relative font-display text-base font-bold italic leading-tight text-white">
              One Team.
              <br />
              One Goal.
            </p>
            <span className="relative mt-1 block h-0.5 w-14 rounded-full bg-gradient-to-r from-sky-400 to-transparent" />
          </div>

          <button
            type="button"
            onClick={() => {
              if (profileGroup) {
                navigateTab(`group:${profileGroup.parent.id}`);
                setSidebarOpen(false);
              }
            }}
            className={`flex w-full items-center justify-between gap-2 rounded-xl border border-blue-400/20 bg-blue-950/70 px-2.5 py-1.5 text-left transition ${
              profileGroup ? "hover:border-sky-400/50 hover:bg-blue-900/60" : "cursor-default"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-bold text-white shadow-[0_0_10px_rgba(56,189,248,0.45)]">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-bold text-white">{displayName}</p>
                <p className="truncate text-[10px] text-blue-200/75">{data.role_name}</p>
              </div>
            </div>
            {profileGroup && <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-blue-300/70" />}
          </button>

          <button
            type="button"
            onClick={requestLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-white"
          >
            <LogoutIcon className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-bg flex min-h-dvh text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-0 h-dvh">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full w-64 max-w-[85vw] shadow-2xl">{renderSidebarContent()}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Sleek Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-blue-400/20 bg-[#040f33]/90 px-3.5 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            {/* Left Brand + Active View Subtitle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="rounded-xl border border-blue-400/25 bg-blue-950/70 p-2 text-blue-100 hover:bg-blue-900/70 lg:hidden"
              >
                <MenuIcon className="h-5 w-5" />
              </button>

              <span className="hidden h-8 w-0.5 rounded-full bg-gradient-to-b from-sky-400 via-blue-500 to-transparent sm:block" />

              <div>
                <p className="font-display text-xl font-extrabold uppercase italic leading-none tracking-wide sm:text-2xl">
                  <span className="text-white">ALAB </span>
                  <span className="bg-gradient-to-r from-sky-200 to-blue-400 bg-clip-text text-transparent">
                    FOOTBALL CLUB
                  </span>
                </p>
                <p className="mt-0.5 text-xs font-medium text-sky-300/90">{headerSubtitle}</p>
              </div>
            </div>

            {/* Right Refresh + Bell + User Pill */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                title="Refresh"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-950/70 text-blue-200 transition hover:bg-blue-900/70 hover:text-white disabled:opacity-50"
              >
                <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-950/70 text-blue-100">
                <BellIcon className="h-4 w-4" />
                {data.stats.upcoming_tournaments + data.stats.pending_soa_count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow">
                    {data.stats.upcoming_tournaments + data.stats.pending_soa_count}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (profileGroup) navigateTab(`group:${profileGroup.parent.id}`);
                }}
                title={profileGroup ? "Open My Profile" : displayName}
                className={`flex items-center gap-2.5 rounded-full border border-blue-400/30 bg-blue-950/80 py-1 pl-1.5 pr-3 transition ${
                  profileGroup ? "hover:border-sky-400/60 hover:bg-blue-900/70" : "cursor-default"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="max-w-28 truncate text-xs font-bold text-white">{displayName}</p>
                  <p className="text-[10px] text-blue-200/75">{data.role_name}</p>
                </div>
                <ChevronDownIcon className="hidden h-3.5 w-3.5 text-blue-300/70 sm:block" />
              </button>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-3.5 pb-24 pt-4 sm:space-y-5 sm:px-6 sm:pt-5 lg:pb-6">
          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {activeTab === "rbac" && isAdmin ? (
            <RbacManager currentUserRoleId={data.role_id} onSelfAccessUpdated={() => void loadDashboard()} />
          ) : activeTab === "users" && isAdmin ? (
            <UserManagementManager
              currentUserId={Number(data.user.user_id ?? data.user.id ?? 0)}
              roleId={data.role_id}
              isAdmin={isAdmin}
              onDataChanged={() => void loadDashboard()}
            />
          ) : activeTab === "overview" && data.has_dashboard_access ? (
            <>
              {/* Row 1: Full-Width Hero Welcome Banner */}
              <section>
                <div className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#06184c] p-6 shadow-[0_14px_40px_-14px_rgba(37,99,235,0.55)] sm:p-7">
                  {/* Stadium panorama background with glowing soccer ball */}
                  <Image
                    src={stadiumBg}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1280px) 100vw, 1152px"
                    className="pointer-events-none object-cover object-right opacity-90"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041038]/92 via-[#072066]/62 to-[#040f33]/35" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

                  <div className="relative flex flex-wrap items-center justify-between gap-4 sm:pr-44">
                    <div>
                      <span className="inline-block rounded-lg border border-sky-300/30 bg-blue-500/30 px-3 py-1 text-xs font-semibold text-sky-100">
                        Welcome Back!
                      </span>
                      <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-white sm:mt-3 sm:text-4xl">
                        Hello, {displayName}!
                      </h1>
                      <p className="mt-1.5 text-xs text-blue-100/85 sm:text-sm">
                        Here&apos;s what&apos;s happening with ALAB Football Club today.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (tournamentsGroup) navigateTab(`group:${tournamentsGroup.parent.id}`);
                          else if (sidebarGroups[0]) navigateTab(`group:${sidebarGroups[0].parent.id}`);
                          else if (isAdmin) navigateTab("rbac");
                        }}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.65)] transition hover:from-blue-500 hover:to-sky-300"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Row 2: Upcoming Tournaments & Events (left) + Account & Attendance Donut (right) */}
              <section className="grid gap-5 lg:grid-cols-12">
                {/* Upcoming Tournaments & Events */}
                <div className="dash-card relative flex flex-col overflow-hidden rounded-2xl p-5 lg:col-span-7">
                  <div className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

                  <div className="relative mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30">
                        <TrendUpIcon className="h-4 w-4" />
                      </span>
                      <h2 className="text-base font-bold text-white">Upcoming Tournaments &amp; Events</h2>
                    </div>
                    {tournamentsGroup && (
                      <button
                        type="button"
                        onClick={() => navigateTab(`group:${tournamentsGroup.parent.id}`)}
                        className="rounded-full border border-blue-400/30 bg-blue-950/75 px-3.5 py-1 text-xs font-semibold text-blue-100 transition hover:border-sky-400/60 hover:bg-blue-800/60"
                      >
                        View All →
                      </button>
                    )}
                  </div>

                  {data.upcoming_tournaments.length === 0 ? (
                    <div className="relative flex flex-1 flex-col items-center justify-center py-6 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/30 shadow-[0_0_24px_rgba(56,189,248,0.25)]">
                        <CalendarIcon className="h-6 w-6" />
                      </span>
                      <p className="mt-3.5 text-sm font-bold text-white">
                        No upcoming tournaments or events scheduled yet.
                      </p>
                      <p className="mt-1 text-xs text-blue-200/70">
                        {canCreateTournament
                          ? "Create a tournament to get started!"
                          : "Upcoming club events will appear here."}
                      </p>
                      {canCreateTournament && tournamentsGroup && (
                        <button
                          type="button"
                          onClick={() => navigateTab(`group:${tournamentsGroup.parent.id}`)}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.6)] transition hover:from-blue-500 hover:to-sky-300"
                        >
                          Create Tournament →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative space-y-2.5">
                      {data.upcoming_tournaments.slice(0, 4).map((t, idx) => {
                        const title = pickStr(t, ["name", "tournament_name", "title"], `Tournament #${idx + 1}`);
                        const date = formatDate(t.start_date ?? t.date ?? t.event_date);
                        const location = pickStr(t, ["location", "venue", "address"], "ALAB Field");
                        const status = pickStr(t, ["status"], "Upcoming");
                        return (
                          <div
                            key={String(t.id ?? t.tournament_id ?? idx)}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-blue-950/60 p-3 transition hover:border-sky-400/45"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <Image src={crest} alt="ALAB FC" className="h-9 w-auto shrink-0" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{title}</p>
                                <p className="truncate text-xs text-blue-200/75">{location}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-medium text-blue-100/85">{date}</span>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(status)}`}
                              >
                                {status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Account & Attendance (Circular Progress Ring + Present / Absent) */}
                <div className="dash-card relative flex flex-col overflow-hidden rounded-2xl p-5 lg:col-span-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30">
                        <ReceiptIcon className="h-4 w-4" />
                      </span>
                      <h2 className="text-base font-bold text-white">Account &amp; Attendance</h2>
                    </div>
                    {(attendanceGroup || soaGroup) && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = attendanceGroup ?? soaGroup;
                          if (target) navigateTab(`group:${target.parent.id}`);
                        }}
                        className="rounded-full border border-blue-400/30 bg-blue-950/75 px-3.5 py-1 text-xs font-semibold text-blue-100 transition hover:border-sky-400/60 hover:bg-blue-800/60"
                      >
                        View All →
                      </button>
                    )}
                  </div>

                  <div className="grid flex-1 grid-cols-1 items-center gap-4 py-2 sm:grid-cols-2">
                    {/* Circular Attendance Rate Donut */}
                    <div className="flex flex-col items-center justify-center border-b border-blue-400/20 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                      <div className="relative flex h-28 w-28 items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112">
                          <circle
                            cx="56"
                            cy="56"
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(59,130,246,0.22)"
                            strokeWidth="10"
                          />
                          <circle
                            cx="56"
                            cy="56"
                            r={ringRadius}
                            fill="none"
                            stroke="url(#alabRingGrad)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                          />
                          <defs>
                            <linearGradient id="alabRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span className="absolute text-2xl font-extrabold text-white">
                          {attendanceSummary.rate}%
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-blue-200/85">Attendance Rate</p>
                    </div>

                    {/* Present & Absent Counters */}
                    <div className="space-y-4 pl-1">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/30">
                          <UsersIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-2xl font-extrabold leading-none text-white">
                            {attendanceSummary.present}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-blue-100/80">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Present
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-blue-400/15" />

                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-400/30">
                          <UsersIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-2xl font-extrabold leading-none text-white">
                            {attendanceSummary.absent}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-blue-100/80">
                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                            Absent
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle SOA footer strip if SOA items exist */}
                  {data.soas.length > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-blue-400/15 bg-blue-950/60 px-3.5 py-2 text-xs">
                      <span className="text-blue-200/80">
                        Active SOA Records: <strong className="text-white">{data.soas.length}</strong>
                      </span>
                      <span className="font-bold text-amber-300">
                        {formatPeso(data.stats.total_balance)}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Row 3: Compact Recent Activity Card (Admin only) */}
              {isAdmin && (
                <section className="dash-card rounded-2xl p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                        <BarChartIcon className="h-3.5 w-3.5" />
                      </span>
                      <h2 className="text-sm font-bold text-white">Recent Activity</h2>
                    </div>

                    <CustomSelect
                      ariaLabel="Filter recent activity"
                      size="xs"
                      pill
                      value={activityFilter}
                      onChange={(val) => setActivityFilter(val as ActivityFilter)}
                      leadingIcon={<HistoryIcon className="h-3.5 w-3.5" />}
                      menuMinWidth={150}
                      options={[
                        { value: "week", label: "This Week" },
                        { value: "attendance", label: "Attendance" },
                        { value: "all", label: "All Activity" },
                      ]}
                    />
                  </div>

                  {recentActivities.length === 0 ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-blue-400/10 bg-[#040f30]/50 px-3.5 py-2.5 text-xs text-blue-200/75">
                      <HistoryIcon className="h-4 w-4 shrink-0 text-sky-400/80" />
                      <span>No recent activity yet. Updates will appear here.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-blue-400/10">
                      {recentActivities.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                            <p className="truncate font-semibold text-white">{item.title}</p>
                            <span className="hidden truncate text-blue-200/65 sm:inline">
                              • {item.subtitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] text-blue-200/70">{item.date}</span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(item.status)}`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : activeGroup ? (
            groupCategory(activeGroup.parent.name) === "tournaments" ? (
              <TournamentsManager
                roleId={data.role_id}
                canCreate={
                  isAdmin ||
                  data.access.module_ids.includes(4) ||
                  activeGroup.actions.some((a) => /(create|add)/i.test(a.name))
                }
                canEdit={
                  isAdmin ||
                  data.access.module_ids.includes(5) ||
                  activeGroup.actions.some((a) => /(edit|update|manage)/i.test(a.name))
                }
                canDelete={
                  isAdmin ||
                  data.access.module_ids.includes(6) ||
                  activeGroup.actions.some((a) => /(delete|remove)/i.test(a.name))
                }
                canManageRoster={
                  isAdmin ||
                  data.access.module_ids.includes(7) ||
                  activeGroup.actions.some((a) => /roster/i.test(a.name))
                }
                canApproveConsent={
                  isAdmin ||
                  data.role_id === 7 ||
                  data.access.module_ids.includes(8) ||
                  activeGroup.actions.some((a) => /consent|approve/i.test(a.name))
                }
                onDataChanged={() => void loadDashboard()}
              />
            ) : groupCategory(activeGroup.parent.name) === "attendance" ? (
              <AttendanceManager
                canRecord={
                  isAdmin ||
                  data.role_id === 6 ||
                  activeGroup.actions.some((a) => /(record|mark|manage|create)/i.test(a.name))
                }
                canAddPlayer={
                  isAdmin ||
                  data.role_id === 6 ||
                  data.access.modules.some((m) => /(add|create|enroll|manage).*player/i.test(m.name))
                }
                onAttendanceChanged={() => void loadDashboard()}
              />
            ) : groupCategory(activeGroup.parent.name) === "players" ? (
              <PlayersManager
                currentUserName={displayName}
                roleId={data.role_id}
                isAdmin={isAdmin}
                canLinkParent={isAdmin || data.access.module_ids.includes(24)}
                canAddPlayer={
                  isAdmin ||
                  data.role_id === 6 ||
                  activeGroup.actions.some((a) => /(add|create|enroll|manage)/i.test(a.name))
                }
                canRecordAttendance={
                  isAdmin ||
                  data.role_id === 6 ||
                  data.access.modules.some((m) => /(record|mark).*attendance/i.test(m.name))
                }
                onDataChanged={() => void loadDashboard()}
              />
            ) : groupCategory(activeGroup.parent.name) === "profile" ? (
              <ProfileManager
                user={data.user}
                roleId={data.role_id}
                roleName={data.role_name}
                isAdmin={isAdmin}
                actions={activeGroup.actions}
                onProfileUpdated={() => void loadDashboard()}
              />
            ) : groupCategory(activeGroup.parent.name) === "users" ? (
              <UserManagementManager
                currentUserId={Number(data.user.user_id ?? data.user.id ?? 0)}
                roleId={data.role_id}
                isAdmin={isAdmin}
                onDataChanged={() => void loadDashboard()}
              />
            ) : (
              <ModuleWorkspace
                group={activeGroup}
                data={data}
                isAdmin={isAdmin}
                onDataChanged={() => void loadDashboard()}
                onBack={data.has_dashboard_access ? () => navigateTab("overview") : undefined}
              />
            )
          ) : (
            <div className="dash-card rounded-2xl p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-sky-300 ring-1 ring-blue-400/30">
                <ShieldIcon className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">No Modules Assigned</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-blue-200/75">
                Your <strong>{data.role_name}</strong> account currently has no active modules assigned.
                {isAdmin
                  ? " Open the Admin Panel to enable modules for this role."
                  : " Please contact an ALAB FC administrator to request module access."}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigateTab("rbac")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.5)] hover:from-blue-500 hover:to-sky-400"
                >
                  <ShieldIcon className="h-4 w-4" />
                  Open Admin Panel
                </button>
              )}
            </div>
          )}
        </main>

        {/* Mobile Bottom Quick Navigation Bar (Phones & Small Tablets) */}
        <nav
          aria-label="Mobile quick navigation"
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-blue-400/25 bg-[#040d2a]/95 px-2 py-1.5 backdrop-blur-lg lg:hidden"
        >
          {data.has_dashboard_access && (
            <button
              type="button"
              onClick={() => navigateTab("overview")}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
                activeTab === "overview" ? "text-sky-300" : "text-blue-200/70 hover:text-white"
              }`}
            >
              <HomeIcon className="h-5 w-5" />
              <span className="truncate">Home</span>
            </button>
          )}

          {sidebarGroups.slice(0, data.has_dashboard_access ? 3 : 4).map((group) => {
            const tabKey: ActiveTab = `group:${group.parent.id}`;
            const active = activeTab === tabKey;
            const shortLabel = group.parent.name.split(/\s|&/)[0] || group.parent.name;
            return (
              <button
                key={group.parent.id}
                type="button"
                onClick={() => navigateTab(tabKey)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
                  active ? "text-sky-300" : "text-blue-200/70 hover:text-white"
                }`}
              >
                <ModuleIcon name={group.parent.name} className="h-5 w-5" />
                <span className="max-w-16 truncate">{shortLabel}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-blue-200/70 transition hover:text-white"
          >
            <MenuIcon className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </nav>
      </div>

      {/* Session Security & Logout Confirmation Modal */}
      <ConfirmModal
        open={logoutConfirmMode !== null}
        variant="security"
        icon={<ShieldLockIcon className="h-5 w-5" />}
        confirmIcon={<LogoutIcon className="h-3.5 w-3.5" />}
        title={
          logoutConfirmMode === "back"
            ? "Stay Signed In or Log Out?"
            : "Confirm Logout"
        }
        message={
          logoutConfirmMode === "back"
            ? "For your account security, pressing the browser Back button will not automatically log you out. Stay signed in to continue, or click Log Out to end your session safely."
            : "Are you sure you want to log out of your ALAB Football Club account? You will need to sign in again to access the portal."
        }
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        busyLabel="Logging out..."
        onCancel={() => setLogoutConfirmMode(null)}
        onConfirm={performLogout}
      />
    </div>
  );
}

function ModuleWorkspace({
  group,
  data,
  isAdmin,
  onDataChanged,
  onBack,
}: {
  group: ModuleGroup;
  data: DashboardData;
  isAdmin: boolean;
  onDataChanged: () => void;
  onBack?: () => void;
}) {
  const category = groupCategory(group.parent.name);
  const [selectedActionNotice, setSelectedActionNotice] = useState<string | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  const createOrManageActions = group.actions.filter((a) =>
    /^(create|add|record|generate|approve|manage)/i.test(a.name)
  );

  return (
    <div className="space-y-5">
      <div className="dash-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              <ModuleIcon name={group.parent.name} className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-white">{group.parent.name}</h2>
              <p className="text-xs text-blue-200/75">
                All {group.parent.name.toLowerCase()} views and permitted actions in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {category === "players" && (isAdmin || createOrManageActions.length > 0) && (
              <button
                type="button"
                onClick={() => setAddPlayerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.5)] transition hover:from-blue-500 hover:to-sky-400"
              >
                <PlusIcon className="h-4 w-4" />
                Add Player
              </button>
            )}
            {category !== "players" &&
              createOrManageActions.slice(0, 3).map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setSelectedActionNotice(`"${action.name}" is ready to connect to its API endpoint.`)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.5)] transition hover:from-blue-500 hover:to-sky-400"
                >
                  <PlusIcon className="h-4 w-4" />
                  {action.name}
                </button>
              ))}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-blue-400/30 bg-blue-950/60 px-3.5 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-900/70"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>

        <AddPlayerModal
          open={addPlayerOpen}
          onClose={() => setAddPlayerOpen(false)}
          onCreated={() => {
            setSelectedActionNotice("Player added successfully!");
            onDataChanged();
          }}
        />

        {group.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-blue-400/15 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/70">
              Your Permissions:
            </span>
            {group.actions.map((action) => (
              <span
                key={action.id}
                className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-100"
              >
                <ShieldIcon className="h-3 w-3 text-sky-400" />
                {action.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {selectedActionNotice && (
        <div className="rounded-xl border border-blue-400/40 bg-blue-500/15 px-4 py-3 text-sm text-blue-100">
          {selectedActionNotice}
        </div>
      )}

      <div className="dash-card rounded-2xl p-5">
        {category === "tournaments" ? (
          data.upcoming_tournaments.length === 0 ? (
            <DarkEmptyState message="No upcoming tournaments scheduled yet." />
          ) : (
            <div className="space-y-3">
              {data.upcoming_tournaments.map((t, idx) => (
                <div
                  key={String(t.id ?? idx)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-blue-950/60 p-4"
                >
                  <div>
                    <p className="font-bold text-white">
                      {pickStr(t, ["name", "tournament_name", "title"], `Tournament #${idx + 1}`)}
                    </p>
                    <p className="mt-0.5 text-xs text-blue-200/75">
                      {formatDate(t.start_date ?? t.date ?? t.event_date)} •{" "}
                      {pickStr(t, ["location", "venue", "address"], "TBA")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass(pickStr(t, ["status"], "Upcoming"))}`}
                  >
                    {pickStr(t, ["status"], "Upcoming")}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : category === "attendance" ? (
          data.recent_attendance.length === 0 ? (
            <DarkEmptyState message="No training or attendance records yet." />
          ) : (
            <div className="space-y-2.5">
              {data.recent_attendance.map((att, idx) => (
                <div
                  key={String(att.id ?? idx)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-blue-950/60 p-3.5"
                >
                  <div>
                    <p className="font-bold text-white">
                      {pickStr(att, ["player_name", "student_name", "name"], "Player")}
                    </p>
                    <p className="text-xs text-blue-200/75">
                      {formatDate(att.date ?? att.attendance_date ?? att.created_at)} •{" "}
                      {pickStr(att, ["session_name", "event_name", "remarks"], "Training Session")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass(pickStr(att, ["status"], "Present"))}`}
                  >
                    {pickStr(att, ["status"], "Present")}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : category === "soa" ? (
          data.soas.length === 0 ? (
            <DarkEmptyState message="No billing or SOA records found." />
          ) : (
            <div className="space-y-2.5">
              {data.soas.map((s, idx) => (
                <div
                  key={String(s.id ?? idx)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-400/20 bg-blue-950/60 p-3.5"
                >
                  <div>
                    <p className="font-bold text-white">
                      {pickStr(s, ["description", "title", "soa_number"], `SOA #${s.id ?? idx + 1}`)}
                    </p>
                    <p className="text-xs text-blue-200/75">
                      Due: {formatDate(s.due_date ?? s.billing_date ?? s.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-300">
                      {formatPeso(s.balance ?? s.amount_due ?? s.total_amount ?? s.amount)}
                    </p>
                    <span
                      className={`mt-0.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(pickStr(s, ["status"], "Pending"))}`}
                    >
                      {pickStr(s, ["status"], "Pending")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <DarkEmptyState
            message={`Ready for ${group.parent.name} data. Send the backend endpoint when you want to wire full CRUD here.`}
          />
        )}
      </div>
    </div>
  );
}

function DarkEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-blue-400/25 bg-blue-950/40 px-4 py-8 text-center text-sm text-blue-200/70">
      {message}
    </div>
  );
}
