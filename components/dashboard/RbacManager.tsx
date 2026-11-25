"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import stadiumBg from "@/app/logo/backgoundimage.png";
import {
  fetchAllModules,
  fetchRoleAccessByRole,
  fetchRoleAccessList,
  groupModulesByParent,
  toggleRoleModule,
  updateRoleAccess,
  type RbacModule,
} from "@/lib/api";
import {
  BallIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CrownIcon,
  InfoIcon,
  JerseyIcon,
  MegaphoneIcon,
  ReceiptIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  ShieldLockIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  WhistleIcon,
} from "@/components/icons";

const ROLES = [
  { id: 5, name: "Admin" },
  { id: 6, name: "Coach" },
  { id: 7, name: "Parent" },
  { id: 8, name: "Player" },
] as const;

type FilterMode = "all" | "enabled" | "disabled";

interface RbacManagerProps {
  currentUserRoleId: number;
  onSelfAccessUpdated?: () => void;
}

function RoleIcon({ roleId, className }: { roleId: number; className?: string }) {
  if (roleId === 5) return <UsersIcon className={className} />;
  if (roleId === 6) return <WhistleIcon className={className} />;
  if (roleId === 7) return <UsersIcon className={className} />;
  return <BallIcon className={className} />;
}

function GroupModuleIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (/dashboard|home/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/30">
        <TrophyIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/tournament|match|fixture|event/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/30">
        <TrophyIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/attendance|training|schedule/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30">
        <CalendarIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/soa|bill|payment|finance|fee/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/30">
        <ReceiptIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/player|child|roster|team/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30">
        <JerseyIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/user|member|account/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">
        <UsersIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/profile/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/30">
        <UserIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/announcement|news/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/30">
        <MegaphoneIcon className="h-5 w-5" />
      </span>
    );
  }
  if (/setting|config/.test(n)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-400/15 text-slate-200 ring-1 ring-slate-400/30">
        <SettingsIcon className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-sky-300 ring-1 ring-blue-400/30">
      <ShieldIcon className="h-5 w-5" />
    </span>
  );
}

function getGroupSubtitle(mod: RbacModule): string {
  if (mod.description) return mod.description;
  const n = mod.name.toLowerCase();
  if (/dashboard|home/.test(n)) return "Access to dashboard and reports";
  if (/tournament|match|fixture/.test(n)) return "Manage tournaments and related features";
  if (/attendance|training/.test(n)) return "Manage attendance sessions and records";
  if (/soa|bill|payment|finance/.test(n)) return "View and manage billing and payments";
  if (/player|child|roster|team/.test(n)) return "Manage player information and rosters";
  if (/user|member/.test(n)) return "Manage club users and accounts";
  if (/profile/.test(n)) return "View and update personal profile settings";
  if (/rbac|role|permission|access|admin/.test(n)) return "Configure role access and system permissions";
  return `Manage ${mod.name.toLowerCase()} permissions`;
}

export default function RbacManager({ currentUserRoleId, onSelfAccessUpdated }: RbacManagerProps) {
  const [modules, setModules] = useState<RbacModule[]>([]);
  const [roleAccessMap, setRoleAccessMap] = useState<Record<number, number[]>>({});
  const [selectedRoleId, setSelectedRoleId] = useState<number>(5);

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [busyModuleIds, setBusyModuleIds] = useState<Set<number>>(new Set());
  const [bulkBusyGroupId, setBulkBusyGroupId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setToast(null);

    const [modRes, accessRes] = await Promise.all([fetchAllModules(), fetchRoleAccessList()]);

    if (!modRes.ok) {
      setToast({ type: "error", message: modRes.message || "Failed to load modules." });
      setLoading(false);
      return;
    }

    setModules(modRes.data);

    // Open the first multi-item module group by default (matches clean mockup preview)
    const grouped = groupModulesByParent(modRes.data);
    const firstMulti = grouped.find((g) => g.actions.length > 0);
    if (firstMulti) {
      setExpandedGroupIds(new Set([firstMulti.parent.id]));
    }

    const map: Record<number, number[]> = {};
    if (accessRes.ok && accessRes.data.length > 0) {
      for (const rec of accessRes.data) {
        map[rec.role_id] = rec.module_ids;
      }
    } else {
      const individual = await Promise.all(ROLES.map((r) => fetchRoleAccessByRole(r.id)));
      individual.forEach((res, idx) => {
        if (res.ok && res.data) {
          map[ROLES[idx].id] = res.data.module_ids;
        }
      });
    }

    setRoleAccessMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const activeSet = useMemo(
    () => new Set(roleAccessMap[selectedRoleId] ?? []),
    [roleAccessMap, selectedRoleId]
  );

  const allGroups = useMemo(() => groupModulesByParent(modules), [modules]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allGroups
      .map((group) => {
        const allItems = [group.parent, ...group.actions];
        const visibleItems = allItems.filter((item) => {
          const matchesQuery =
            !q ||
            item.name.toLowerCase().includes(q) ||
            group.parent.name.toLowerCase().includes(q);
          if (!matchesQuery) return false;

          const enabled = activeSet.has(item.id);
          if (filterMode === "enabled") return enabled;
          if (filterMode === "disabled") return !enabled;
          return true;
        });

        if (visibleItems.length === 0) return null;
        return {
          parent: group.parent,
          allItems,
          visibleItems,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [allGroups, search, filterMode, activeSet]);

  function toggleExpand(groupId: number) {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function handleReset() {
    setSearch("");
    setFilterMode("all");
    void loadData();
  }

  function applyRoleUpdate(roleId: number, nextIds: number[], message?: string) {
    setRoleAccessMap((prev) => ({ ...prev, [roleId]: nextIds }));
    if (message) setToast({ type: "success", message });
    if (roleId === currentUserRoleId && onSelfAccessUpdated) {
      onSelfAccessUpdated();
    }
  }

  async function handleToggleSingle(mod: RbacModule) {
    if (busyModuleIds.has(mod.id) || bulkBusyGroupId !== null) return;
    const roleId = selectedRoleId;
    const prevIds = roleAccessMap[roleId] ?? [];
    const wasEnabled = prevIds.includes(mod.id);
    const optimisticIds = wasEnabled
      ? prevIds.filter((id) => id !== mod.id)
      : [...prevIds, mod.id].sort((a, b) => a - b);

    setRoleAccessMap((prev) => ({ ...prev, [roleId]: optimisticIds }));
    setBusyModuleIds((prev) => new Set(prev).add(mod.id));

    const res = await toggleRoleModule(roleId, mod.id);

    setBusyModuleIds((prev) => {
      const next = new Set(prev);
      next.delete(mod.id);
      return next;
    });

    if (res.ok) {
      const updatedIds = res.data?.module_ids ?? optimisticIds;
      applyRoleUpdate(roleId, updatedIds);
    } else {
      setRoleAccessMap((prev) => ({ ...prev, [roleId]: prevIds }));
      setToast({ type: "error", message: res.message || `Failed to update ${mod.name}.` });
    }
  }

  async function handleToggleGroup(groupId: number, groupItems: RbacModule[], groupName: string) {
    if (bulkBusyGroupId !== null) return;
    const roleId = selectedRoleId;
    const prevIds = roleAccessMap[roleId] ?? [];
    const groupIds = groupItems.map((m) => m.id);
    const anyEnabled = groupIds.some((id) => prevIds.includes(id));

    // If any item is enabled, toggle the whole group OFF; if all disabled, turn whole group ON
    // (When only 1 item in group, use PATCH /toggle directly; otherwise PUT { ids })
    if (groupIds.length === 1) {
      await handleToggleSingle(groupItems[0]);
      return;
    }

    const nextIds = anyEnabled
      ? prevIds.filter((id) => !groupIds.includes(id))
      : Array.from(new Set([...prevIds, ...groupIds])).sort((a, b) => a - b);

    setBulkBusyGroupId(groupId);
    setRoleAccessMap((prev) => ({ ...prev, [roleId]: nextIds }));

    const res = await updateRoleAccess(roleId, nextIds);
    setBulkBusyGroupId(null);

    if (res.ok) {
      applyRoleUpdate(
        roleId,
        res.data?.module_ids ?? nextIds,
        `${groupName} ${anyEnabled ? "disabled" : "enabled"}.`
      );
    } else {
      setRoleAccessMap((prev) => ({ ...prev, [roleId]: prevIds }));
      setToast({ type: "error", message: res.message || `Failed to update ${groupName}.` });
    }
  }

  const isFiltering = search.trim().length > 0 || filterMode !== "all";

  return (
    <div className="space-y-4">
      {/* Top Glowing Header Card + 4 Role Cards */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-400/35 bg-[#06184c] p-5 shadow-[0_16px_44px_-14px_rgba(37,99,235,0.5)] backdrop-blur-md">
        <Image
          src={stadiumBg}
          alt=""
          fill
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="pointer-events-none object-cover object-right opacity-40"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#04113a]/88 via-[#071a52]/82 to-[#040f33]/92" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/55 to-transparent" />

        {/* Title Row */}
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700 text-white shadow-[0_0_24px_rgba(56,189,248,0.55)]">
              <ShieldLockIcon className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Role Permissions</h2>
              <p className="text-xs text-blue-200/80 sm:text-sm">
                Manage module permissions for each user role.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[#031426]">
                <CheckIcon className="h-3 w-3" />
              </span>
              Auto-save Enabled
            </span>
            <span
              title="Every toggle immediately updates role permissions in the database."
              className="flex h-7 w-7 items-center justify-center rounded-full text-blue-200/70 transition hover:bg-white/10 hover:text-white"
            >
              <InfoIcon className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* 4 Role Cards */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ROLES.map((role) => {
            const active = selectedRoleId === role.id;
            const count = (roleAccessMap[role.id] ?? []).length;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setSelectedRoleId(role.id);
                  setToast(null);
                }}
                className={`group relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-3 text-left transition-all sm:gap-3.5 sm:px-4 sm:py-3.5 ${
                  active
                    ? "border-sky-400 bg-gradient-to-br from-blue-600/55 via-blue-700/40 to-sky-500/20 shadow-[0_0_24px_rgba(56,189,248,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]"
                    : "border-blue-400/20 bg-[#051136]/75 hover:border-blue-400/45 hover:bg-[#081a4f]/80"
                }`}
              >
                {role.id === 5 && (
                  <CrownIcon
                    className={`absolute right-2.5 top-2 h-3.5 w-3.5 sm:right-3 sm:top-2.5 ${
                      active ? "text-sky-300" : "text-blue-300/40"
                    }`}
                  />
                )}
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition sm:h-10 sm:w-10 ${
                    active
                      ? "bg-sky-400/20 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.45)]"
                      : "bg-blue-900/50 text-blue-200/80 group-hover:text-white"
                  }`}
                >
                  <RoleIcon roleId={role.id} className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white sm:text-base">{role.name}</span>
                  <span className={`block truncate text-[11px] sm:text-xs ${active ? "text-blue-100" : "text-blue-200/70"}`}>
                    {count} {count === 1 ? "Permission" : "Permissions"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Filter Pills + Reset Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/65" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions..."
              className="w-full rounded-xl border border-blue-400/25 bg-[#051136]/80 py-2 pl-10 pr-3.5 text-sm text-white placeholder:text-blue-300/55 transition focus:border-sky-400 focus:bg-[#07184a] focus:outline-none focus:ring-2 focus:ring-sky-400/25"
            />
          </div>

          <div className="inline-flex items-center gap-1.5">
            {(["all", "enabled", "disabled"] as const).map((mode) => {
              const active = filterMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_0_16px_rgba(59,130,246,0.65)]"
                      : "border border-blue-400/20 bg-[#051136]/75 text-blue-200/80 hover:border-blue-400/40 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-400/25 bg-[#061540]/85 px-4 py-2 text-xs font-bold text-blue-100 transition hover:border-blue-400/50 hover:bg-blue-900/60 disabled:opacity-50"
        >
          <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Reset
        </button>
      </div>

      {/* Subtle Toast (only on error or group bulk update) */}
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
          <button
            type="button"
            onClick={() => setToast(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Collapsible Module Accordion Cards */}
      {loading ? (
        <div className="dash-card rounded-2xl py-14 text-center text-sm text-blue-200/70">
          Loading permissions...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="dash-card rounded-2xl py-14 text-center text-sm text-blue-200/70">
          No permissions match your filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const enabledCount = group.allItems.filter((item) => activeSet.has(item.id)).length;
            const totalCount = group.allItems.length;
            const groupActive = enabledCount > 0;
            const hasMultiple = group.visibleItems.length > 1 || totalCount > 1;
            const isExpanded = hasMultiple && (isFiltering || expandedGroupIds.has(group.parent.id));
            const groupBusy =
              bulkBusyGroupId === group.parent.id ||
              (totalCount === 1 && busyModuleIds.has(group.parent.id));

            return (
              <div
                key={group.parent.id}
                className="overflow-hidden rounded-2xl border border-blue-400/30 bg-gradient-to-r from-[#0a2263]/95 via-[#07184a]/95 to-[#0b2569]/95 shadow-[0_10px_28px_-14px_rgba(2,8,28,0.9)] transition hover:border-blue-400/45"
              >
                {/* Module Card Header */}
                <div className="flex items-center justify-between gap-2.5 px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasMultiple) toggleExpand(group.parent.id);
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3.5 ${
                      hasMultiple ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-blue-200/80 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      } ${!hasMultiple ? "opacity-40" : ""}`}
                    />
                    <GroupModuleIcon name={group.parent.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white sm:text-base">
                        {group.parent.name}
                      </p>
                      <p className="hidden truncate text-xs text-blue-200/70 sm:block">
                        {getGroupSubtitle(group.parent)}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <span className="rounded-full border border-blue-400/25 bg-[#040e2e]/85 px-2.5 py-0.5 text-[11px] font-bold text-blue-100 sm:px-3 sm:py-1 sm:text-xs">
                      {enabledCount} / {totalCount}
                    </span>

                    {/* Group Master Toggle Switch */}
                    <ToggleSwitch
                      checked={groupActive}
                      disabled={groupBusy}
                      size="lg"
                      label={`Toggle all ${group.parent.name} permissions`}
                      onChange={() =>
                        void handleToggleGroup(group.parent.id, group.allItems, group.parent.name)
                      }
                    />
                  </div>
                </div>

                {/* Expanded Dark Inset Permission List */}
                {isExpanded && (
                  <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-blue-400/15 bg-[#030b24]/90 sm:mx-4 sm:mb-4">
                    <div className="divide-y divide-blue-400/10">
                      {group.visibleItems.map((item) => {
                        const enabled = activeSet.has(item.id);
                        const isBusy = busyModuleIds.has(item.id) || bulkBusyGroupId === group.parent.id;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition hover:bg-blue-500/[0.06] sm:gap-4 sm:px-5"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
                                  enabled
                                    ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]"
                                    : "bg-slate-600"
                                }`}
                              />
                              <span
                                className={`truncate text-sm ${
                                  enabled ? "font-medium text-white" : "text-blue-100/70"
                                }`}
                              >
                                {item.name}
                              </span>
                            </div>

                            <ToggleSwitch
                              checked={enabled}
                              disabled={isBusy}
                              size="sm"
                              label={`Toggle ${item.name}`}
                              onChange={() => void handleToggleSingle(item)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  size = "sm",
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  size?: "sm" | "lg";
  label: string;
  onChange: () => void;
}) {
  const track = size === "lg" ? "h-7 w-12" : "h-5 w-10";
  const thumb = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  const translate =
    size === "lg"
      ? checked
        ? "translate-x-6"
        : "translate-x-1"
      : checked
      ? "translate-x-5"
      : "translate-x-1";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex ${track} shrink-0 cursor-pointer items-center rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:cursor-wait disabled:opacity-60 ${
        checked
          ? "border-sky-300/60 bg-gradient-to-r from-blue-600 to-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.65)]"
          : "border-blue-300/20 bg-slate-700/90"
      }`}
    >
      <span
        className={`inline-block ${thumb} transform rounded-full bg-white shadow-sm transition-transform ${translate}`}
      />
    </button>
  );
}
