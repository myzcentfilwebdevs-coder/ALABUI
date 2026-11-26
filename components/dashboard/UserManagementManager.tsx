"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import stadiumBg from "@/app/logo/backgoundimage.png";
import {
  fetchAdminUsers,
  updateAdminUserRole,
  USER_STATUS_OPTIONS,
  type ManagedUser,
} from "@/lib/api";
import {
  CheckIcon,
  CloseIcon,
  CrownIcon,
  FilterIcon,
  MailIcon,
  PhoneIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  ShieldLockIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import CustomSelect, { type CustomSelectOption } from "@/components/ui/CustomSelect";
import ConfirmModal from "./ConfirmModal";

interface UserManagementManagerProps {
  currentUserId: number;
  roleId: number;
  isAdmin: boolean;
  onDataChanged?: () => void;
}

const MANAGED_ROLE_OPTIONS = ["Admin", "Coach", "Parent"] as const;

type RoleFilter = "All" | (typeof MANAGED_ROLE_OPTIONS)[number];
type StatusFilter = "All" | (typeof USER_STATUS_OPTIONS)[number];

function isPlayerAccount(u: ManagedUser): boolean {
  return u.role_id === 8 || u.role_name.trim().toLowerCase() === "player";
}

function roleIcon(role: string) {
  const r = role.toLowerCase();
  if (r === "admin") return <CrownIcon className="h-3.5 w-3.5 text-amber-300" />;
  if (r === "coach") return <ShieldIcon className="h-3.5 w-3.5 text-sky-300" />;
  if (r === "parent") return <UsersIcon className="h-3.5 w-3.5 text-emerald-300" />;
  return <UserIcon className="h-3.5 w-3.5 text-violet-300" />;
}

function roleAvatarGradient(role: string): string {
  const r = role.toLowerCase();
  if (r === "admin") return "from-amber-400 to-orange-600 shadow-[0_0_12px_rgba(251,191,36,0.45)]";
  if (r === "coach") return "from-sky-400 to-blue-600 shadow-[0_0_12px_rgba(56,189,248,0.45)]";
  if (r === "parent") return "from-emerald-400 to-teal-600 shadow-[0_0_12px_rgba(52,211,153,0.4)]";
  return "from-violet-400 to-indigo-600 shadow-[0_0_12px_rgba(167,139,250,0.45)]";
}

function statusDot(status: string) {
  const s = status.toLowerCase();
  if (s === "active") {
    return <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />;
  }
  if (s === "pending") {
    return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />;
  }
  if (s === "suspended") {
    return <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function UserManagementManager({
  currentUserId,
  roleId,
  isAdmin,
  onDataChanged,
}: UserManagementManagerProps) {
  const strictAdmin = isAdmin || roleId === 5;

  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Confirm modal for sensitive changes (granting/revoking Admin or Suspending account)
  const [pendingConfirm, setPendingConfirm] = useState<{
    user: ManagedUser;
    nextRole: string;
    nextStatus: string;
    title: string;
    message: string;
    confirmLabel: string;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    if (!strictAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetchAdminUsers();
    setLoading(false);

    if (!res.ok) {
      setError(
        res.status === 403
          ? "Access Denied: Admin only (role_id = 5) can manage user accounts."
          : res.message || "Unable to load users."
      );
      return;
    }

    // Exclude Player accounts (managed in the dedicated Players tab)
    setAllUsers(res.data.filter((u) => !isPlayerAccount(u)));
  }, [strictAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const roleCounts = useMemo(() => {
    const byRole: Record<RoleFilter, number> = {
      All: allUsers.length,
      Admin: 0,
      Coach: 0,
      Parent: 0,
    };
    let activeCount = 0;
    let pendingOrRestricted = 0;
    for (const u of allUsers) {
      const rKey = MANAGED_ROLE_OPTIONS.find((r) => r.toLowerCase() === u.role_name.toLowerCase());
      if (rKey) byRole[rKey] = byRole[rKey] + 1;
      if (u.status_name.toLowerCase() === "active") activeCount++;
      else pendingOrRestricted++;
    }
    return { byRole, activeCount, pendingOrRestricted };
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (roleFilter !== "All" && u.role_name.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "All" && u.status_name.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = `${u.full_name} ${u.username} ${u.email} ${u.phone_number} ${u.role_name} ${u.status_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allUsers, roleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  const roleSelectOptions: CustomSelectOption[] = useMemo(
    () =>
      MANAGED_ROLE_OPTIONS.map((r) => ({
        value: r,
        label: r,
        icon: roleIcon(r),
      })),
    []
  );

  const statusSelectOptions: CustomSelectOption[] = useMemo(
    () =>
      USER_STATUS_OPTIONS.map((s) => ({
        value: s,
        label: s,
        icon: statusDot(s),
      })),
    []
  );

  const statusFilterOptions: CustomSelectOption[] = useMemo(
    () => [
      {
        value: "All",
        label: "All Status",
        icon: <FilterIcon className="h-3.5 w-3.5" />,
      },
      ...statusSelectOptions,
    ],
    [statusSelectOptions]
  );

  async function commitUpdate(user: ManagedUser, nextRole: string, nextStatus: string) {
    setSavingId(user.user_id);
    setError(null);
    setNotice(null);

    const res = await updateAdminUserRole(user.user_id, {
      role: nextRole,
      status: nextStatus,
    });

    setSavingId(null);

    if (!res.ok) {
      setError(res.data?.error || res.message || "Failed to update user role/status.");
      return;
    }

    const updatedRole = res.data.role_name || nextRole;
    const updatedStatus = res.data.status_name || nextStatus;

    setAllUsers((prev) =>
      prev.map((item) =>
        item.user_id === user.user_id
          ? {
              ...item,
              role_id: res.data.role_id ?? item.role_id,
              role_name: updatedRole,
              status_id: res.data.status_id ?? item.status_id,
              status_name: updatedStatus,
            }
          : item
      )
    );

    const displayHandle = res.data.username || user.username || user.full_name;
    setNotice(
      `Updated @${displayHandle} → ${updatedRole} (${updatedStatus}). Effective immediately on their next refresh.`
    );
    onDataChanged?.();
  }

  function requestUpdate(user: ManagedUser, nextRole: string, nextStatus: string) {
    if (user.user_id === currentUserId) return;
    if (user.role_name === nextRole && user.status_name === nextStatus) return;

    // Confirm sensitive changes (Admin promotion/demotion or Suspending an account)
    const grantingAdmin = nextRole === "Admin" && user.role_name !== "Admin";
    const revokingAdmin = user.role_name === "Admin" && nextRole !== "Admin";
    const suspending = nextStatus === "Suspended" && user.status_name !== "Suspended";

    if (grantingAdmin) {
      setPendingConfirm({
        user,
        nextRole,
        nextStatus,
        title: `Grant Admin Role to ${user.full_name}?`,
        message: `Promoting @${user.username} to Admin grants full access to User Management, RBAC Admin Panel, Tournaments, Players, and Attendance immediately.`,
        confirmLabel: "Grant Admin",
      });
      return;
    }

    if (revokingAdmin) {
      setPendingConfirm({
        user,
        nextRole,
        nextStatus,
        title: `Change Admin Role for ${user.full_name}?`,
        message: `Changing @${user.username} from Admin to ${nextRole} will immediately revoke their Admin Panel privileges on next refresh.`,
        confirmLabel: `Switch to ${nextRole}`,
      });
      return;
    }

    if (suspending) {
      setPendingConfirm({
        user,
        nextRole,
        nextStatus,
        title: `Suspend ${user.full_name}?`,
        message: `Setting @${user.username} to Suspended will restrict their account access immediately.`,
        confirmLabel: "Suspend Account",
      });
      return;
    }

    void commitUpdate(user, nextRole, nextStatus);
  }

  // Strict Admin-only guard (mirrors backend role_id = 5 protection)
  if (!strictAdmin) {
    return (
      <div className="dash-card mx-auto max-w-lg rounded-2xl border border-rose-400/35 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/35">
          <ShieldLockIcon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-white">Access Denied</h2>
        <p className="mt-2 text-sm text-blue-200/80">
          Admin accounts only can view and change user roles and statuses.
        </p>
      </div>
    );
  }

  const startIdx = filteredUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredUsers.length);

  return (
    <div className="space-y-5">
      {/* ==================== STADIUM HERO BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#06184c] p-5 shadow-[0_16px_44px_-14px_rgba(37,99,235,0.55)]">
        <Image
          src={stadiumBg}
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="pointer-events-none object-cover object-right opacity-85"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041038]/92 via-[#072066]/68 to-[#040f33]/55" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/65 to-transparent" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700 text-white shadow-[0_0_24px_rgba(56,189,248,0.6)]">
              <UsersIcon className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  User Management
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/45 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  <CrownIcon className="h-3 w-3" />
                  Admin Only
                </span>
              </div>
              <p className="mt-0.5 text-xs text-blue-100/80 sm:text-sm">
                Assign club roles and manage member account status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/35 bg-[#051440]/85 px-3.5 py-2 text-xs font-bold text-blue-100 transition hover:border-sky-300 hover:bg-blue-800/60 hover:text-white disabled:opacity-55"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 4 COLORED-ACCENT KPI CARDS ==================== */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="dash-card relative overflow-hidden rounded-2xl p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-400 via-blue-500 to-transparent" />
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_0_16px_rgba(56,189,248,0.45)]">
              <UsersIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-200/75">Total Accounts</p>
              <p className="text-2xl font-extrabold leading-tight text-white">{roleCounts.byRole.All}</p>
              <p className="truncate text-[10px] text-sky-300/80">Registered club users</p>
            </div>
          </div>
        </div>

        <div className="dash-card relative overflow-hidden rounded-2xl p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-transparent" />
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-[0_0_16px_rgba(251,191,36,0.45)]">
              <CrownIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-200/75">Admins &amp; Coaches</p>
              <p className="text-2xl font-extrabold leading-tight text-white">
                {roleCounts.byRole.Admin + roleCounts.byRole.Coach}
              </p>
              <p className="truncate text-[10px] text-amber-300/85">
                {roleCounts.byRole.Admin} Admin • {roleCounts.byRole.Coach} Coach
              </p>
            </div>
          </div>
        </div>

        <div className="dash-card relative overflow-hidden rounded-2xl p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-transparent" />
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_0_16px_rgba(52,211,153,0.45)]">
              <UserIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-200/75">Parents</p>
              <p className="text-2xl font-extrabold leading-tight text-white">
                {roleCounts.byRole.Parent}
              </p>
              <p className="truncate text-[10px] text-emerald-300/85">
                Registered parent accounts
              </p>
            </div>
          </div>
        </div>

        <div className="dash-card relative overflow-hidden rounded-2xl p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-400 via-indigo-500 to-transparent" />
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 text-white shadow-[0_0_16px_rgba(167,139,250,0.45)]">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-200/75">Active Accounts</p>
              <p className="text-2xl font-extrabold leading-tight text-white">
                {roleCounts.activeCount}
              </p>
              <p className="truncate text-[10px] text-violet-200/80">
                {roleCounts.pendingOrRestricted} pending / restricted
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FEEDBACK BANNERS ==================== */}
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.2)]">
          <span className="flex items-center gap-2">
            <CheckIcon className="h-4 w-4 shrink-0 text-emerald-300" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            className="rounded-lg p-1 text-emerald-200 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-xs font-semibold text-rose-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="rounded-lg p-1 text-rose-200 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ==================== DIRECTORY CARD ==================== */}
      <div className="dash-card overflow-hidden rounded-2xl">
        {/* Top Toolbar: Role Filter Pills + Search + Status Filter */}
        <div className="space-y-3.5 border-b border-blue-400/15 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Role Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["All", ...MANAGED_ROLE_OPTIONS] as RoleFilter[]).map((role) => {
                const active = roleFilter === role;
                const count = roleCounts.byRole[role];
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRoleFilter(role);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      active
                        ? "bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white shadow-[0_0_16px_rgba(56,189,248,0.5)]"
                        : "border border-blue-400/25 bg-[#041034]/90 text-blue-200 hover:border-sky-400/50 hover:bg-blue-900/50 hover:text-white"
                    }`}
                  >
                    {role !== "All" && roleIcon(role)}
                    <span>{role}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        active ? "bg-white/20 text-white" : "bg-blue-900/80 text-blue-300"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Status Filter */}
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300/65" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, @username, email..."
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30]/95 py-2 pl-8 pr-3 text-xs text-white placeholder:text-blue-300/50 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <CustomSelect
                ariaLabel="Filter by account status"
                size="sm"
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val as StatusFilter);
                  setPage(1);
                }}
                className="w-full sm:w-40"
                menuMinWidth={165}
                options={statusFilterOptions}
              />
            </div>
          </div>
        </div>

        {/* Loading / Empty State */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-blue-200/80">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            Loading registered accounts...
          </div>
        ) : pageUsers.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-sky-300 ring-1 ring-blue-400/25">
              <UsersIcon className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-white">No matching users found</p>
            <p className="mt-1 text-xs text-blue-200/70">
              Try adjusting your role filter, status filter, or search term.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-blue-400/15 bg-[#041033]/70 text-[10px] font-bold uppercase tracking-wider text-blue-300/75">
                    <th className="px-5 py-3">User</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-5 py-3 text-right">Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-400/10">
                  {pageUsers.map((u) => {
                    const isSelf = u.user_id === currentUserId;
                    const isSaving = savingId === u.user_id;
                    return (
                      <tr
                        key={u.user_id}
                        className="transition hover:bg-blue-500/10"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-extrabold text-white ${roleAvatarGradient(u.role_name)}`}
                            >
                              {getInitials(u.full_name)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-bold text-white">
                                  {u.full_name}
                                </span>
                                {isSelf && (
                                  <span className="rounded-full border border-sky-400/45 bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-[11px] text-blue-300/75">
                                @{u.username || `user${u.user_id}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p className="flex items-center gap-1.5 text-blue-100">
                              <MailIcon className="h-3 w-3 shrink-0 text-sky-400/80" />
                              <span className="truncate">{u.email || "—"}</span>
                            </p>
                            {u.phone_number && (
                              <p className="flex items-center gap-1.5 text-[11px] text-blue-300/75">
                                <PhoneIcon className="h-3 w-3 shrink-0 text-blue-300/70" />
                                <span>{u.phone_number}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <CustomSelect
                            ariaLabel={`Change role for ${u.full_name}`}
                            size="sm"
                            disabled={isSelf || isSaving}
                            value={u.role_name}
                            onChange={(nextRole) => requestUpdate(u, nextRole, u.status_name)}
                            className="w-36"
                            menuMinWidth={155}
                            options={roleSelectOptions}
                          />
                        </td>

                        <td className="px-4 py-3.5">
                          <CustomSelect
                            ariaLabel={`Change status for ${u.full_name}`}
                            size="sm"
                            disabled={isSelf || isSaving}
                            value={u.status_name}
                            onChange={(nextStatus) => requestUpdate(u, u.role_name, nextStatus)}
                            className="w-36"
                            menuMinWidth={155}
                            options={statusSelectOptions}
                          />
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {isSaving ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/20 px-2.5 py-1 text-[10px] font-bold text-sky-200">
                              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
                              Saving
                            </span>
                          ) : isSelf ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-950/70 px-2.5 py-1 text-[10px] font-semibold text-blue-200/80">
                              <ShieldLockIcon className="h-3 w-3 text-sky-300" />
                              Protected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Live
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD LIST */}
            <div className="divide-y divide-blue-400/15 md:hidden">
              {pageUsers.map((u) => {
                const isSelf = u.user_id === currentUserId;
                const isSaving = savingId === u.user_id;
                return (
                  <div key={u.user_id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-extrabold text-white ${roleAvatarGradient(u.role_name)}`}
                        >
                          {getInitials(u.full_name)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-bold text-white">{u.full_name}</p>
                            {isSelf && (
                              <span className="rounded-full border border-sky-400/45 bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                                You
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-blue-300/75">
                            @{u.username} • {u.email || "—"}
                          </p>
                        </div>
                      </div>

                      {isSaving && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                          Saving...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">
                          Role
                        </p>
                        <CustomSelect
                          ariaLabel={`Change role for ${u.full_name}`}
                          size="sm"
                          disabled={isSelf || isSaving}
                          value={u.role_name}
                          onChange={(nextRole) => requestUpdate(u, nextRole, u.status_name)}
                          className="w-full"
                          options={roleSelectOptions}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">
                          Status
                        </p>
                        <CustomSelect
                          ariaLabel={`Change status for ${u.full_name}`}
                          size="sm"
                          disabled={isSelf || isSaving}
                          value={u.status_name}
                          onChange={(nextStatus) => requestUpdate(u, u.role_name, nextStatus)}
                          className="w-full"
                          options={statusSelectOptions}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION FOOTER */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-400/15 bg-[#040f32]/60 px-4 py-3 text-xs text-blue-200/80 sm:px-5">
              <p>
                Showing <strong className="text-white">{startIdx}–{endIdx}</strong> of{" "}
                <strong className="text-white">{filteredUsers.length}</strong> users
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-950/70 text-blue-200 hover:bg-blue-800/60 disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                  .map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                        p === safePage
                          ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                          : "border border-blue-400/20 bg-blue-950/70 text-blue-200 hover:bg-blue-800/60"
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
                <span>Rows:</span>
                <CustomSelect
                  ariaLabel="Users per page"
                  size="xs"
                  value={String(pageSize)}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                  className="w-[70px]"
                  menuMinWidth={88}
                  options={[10, 20, 50].map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal for sensitive role/status changes */}
      <ConfirmModal
        open={!!pendingConfirm}
        title={pendingConfirm?.title ?? "Confirm Account Update"}
        message={pendingConfirm?.message ?? ""}
        confirmLabel={pendingConfirm?.confirmLabel ?? "Confirm"}
        busy={savingId !== null}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (!pendingConfirm) return;
          const { user, nextRole, nextStatus } = pendingConfirm;
          setPendingConfirm(null);
          void commitUpdate(user, nextRole, nextStatus);
        }}
      />
    </div>
  );
}
