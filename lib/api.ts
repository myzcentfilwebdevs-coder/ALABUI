export const LOCAL_API_URL = "http://localhost:4000";
export const RENDER_API_URL = "https://alabfc.onrender.com";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? RENDER_API_URL : LOCAL_API_URL)
).replace(/\/+$/, "");

export const API_ENV: "local" | "main" =
  process.env.NEXT_PUBLIC_API_ENV === "main" ||
    API_BASE_URL.includes("onrender.com")
    ? "main"
    : "local";

export const AUTH_ENDPOINTS = {
  register: `${API_BASE_URL}/api/auth/register`,
  verifyOtp: `${API_BASE_URL}/api/auth/verify-otp`,
  login: `${API_BASE_URL}/api/auth/login`,
  forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
  me: `${API_BASE_URL}/api/auth/me`,
} as const;

export const DASHBOARD_ENDPOINTS = {
  dashboard: `${API_BASE_URL}/api/dashboard`,
  myAccess: `${API_BASE_URL}/api/rbac/my-access`,
  modules: `${API_BASE_URL}/api/rbac/modules`,
  roleAccess: `${API_BASE_URL}/api/rbac/role-access`,
  roleAccessByRole: (roleId: number) => `${API_BASE_URL}/api/rbac/role-access/${roleId}`,
  roleAccessToggle: (roleId: number) => `${API_BASE_URL}/api/rbac/role-access/${roleId}/toggle`,
  roleAccessRemoveModule: (roleId: number, moduleId: number) =>
    `${API_BASE_URL}/api/rbac/role-access/${roleId}/module/${moduleId}`,
  dailyAttendance: `${API_BASE_URL}/api/attendance/daily`,
  attendanceHistory: `${API_BASE_URL}/api/attendance/history`,
  playerAttendance: (playerUserId: number | string) =>
    `${API_BASE_URL}/api/attendance/player/${playerUserId}`,
  players: `${API_BASE_URL}/api/players`,
} as const;

const TOKEN_KEY = "token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  phone_number: string;
  address: string;
}

export interface LoginPayload {
  username_or_email?: string;
  identifier?: string;
  password: string;
}

export interface ForgotPasswordPayload {
  username_or_email: string;
  otp_code: string;
  new_password: string;
}

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  message: string;
}

export interface AuthenticatorSetup {
  qrCode?: string;
  secret?: string;
  otpauthUrl?: string;
  userId?: string | number;
}

export interface VerifyOtpPayload {
  username_or_email: string;
  otp_code: string;
}

export function extractAuthenticatorSetup(data: unknown): AuthenticatorSetup {
  const result: AuthenticatorSetup = {};
  const visited = new Set<unknown>();

  function scan(node: unknown, depth = 0) {
    if (!node || typeof node !== "object" || depth > 4 || visited.has(node)) return;
    visited.add(node);

    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed) continue;

        if (!result.qrCode && trimmed.startsWith("data:image/")) {
          result.qrCode = trimmed;
          continue;
        }

        if (!result.otpauthUrl && trimmed.startsWith("otpauth://")) {
          result.otpauthUrl = trimmed;
          if (!result.secret) {
            try {
              const parsed = new URL(trimmed);
              const s = parsed.searchParams.get("secret");
              if (s) result.secret = s;
            } catch {
              // ignore malformed URI
            }
          }
          continue;
        }

        if (!result.qrCode && /qr/i.test(key)) {
          if (/^https?:\/\//i.test(trimmed)) {
            result.qrCode = trimmed;
            continue;
          }
          if (trimmed.startsWith("iVBOR")) {
            result.qrCode = `data:image/png;base64,${trimmed}`;
            continue;
          }
          if (trimmed.startsWith("PHN2")) {
            result.qrCode = `data:image/svg+xml;base64,${trimmed}`;
            continue;
          }
        }

        if (
          !result.secret &&
          !/(qr|url|image|password|token)/i.test(key) &&
          /(secret|manual.*key|setup.*key|totp.*key|base32)/i.test(key)
        ) {
          result.secret = trimmed;
        }
      } else if (
        result.userId === undefined &&
        (typeof val === "number" || typeof val === "string") &&
        /^(user_?id|id)$/i.test(key)
      ) {
        result.userId = val;
      } else if (val && typeof val === "object") {
        scan(val, depth + 1);
      }
    }
  }

  scan(data);
  return result;
}

async function requestJson<T = unknown>(
  url: string,
  body: Record<string, unknown>
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    let data: unknown = null;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    const record =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};

    const message =
      (typeof record.message === "string" && record.message) ||
      (typeof record.error === "string" && record.error) ||
      (response.ok ? "Success." : "Something went wrong. Please try again.");

    return {
      ok: response.ok,
      status: response.status,
      data: data as T,
      message,
    };
  } catch (error) {
    console.error("API request failed:", url, error);
    return {
      ok: false,
      status: 0,
      data: null as T,
      message: "Unable to reach the server. Please check your connection and try again.",
    };
  }
}

export async function registerUser(payload: RegisterPayload) {
  return requestJson(AUTH_ENDPOINTS.register, {
    username: payload.username.trim(),
    email: payload.email.trim(),
    password: payload.password,
    first_name: payload.first_name.trim(),
    middle_name: payload.middle_name.trim(),
    last_name: payload.last_name.trim(),
    gender: payload.gender,
    phone_number: payload.phone_number.trim(),
    address: payload.address.trim(),
  });
}

export async function verifyRegistrationOtp(payload: VerifyOtpPayload) {
  return requestJson(AUTH_ENDPOINTS.verifyOtp, {
    username_or_email: (payload.username_or_email ?? "").trim(),
    otp_code: (payload.otp_code ?? "").trim(),
  });
}

export async function loginUser(payload: LoginPayload) {
  const value = (payload.username_or_email ?? payload.identifier ?? "").trim();
  return requestJson(AUTH_ENDPOINTS.login, {
    username_or_email: value,
    password: payload.password,
  });
}

export function extractAuthToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  for (const key of ["token", "accessToken", "access_token", "jwt"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  if (record.data && typeof record.data === "object") {
    return extractAuthToken(record.data);
  }
  return null;
}

export function isOtpRequiredResponse(data: unknown, message: string): boolean {
  if (extractAuthToken(data)) return false;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const flagKeys = [
      "requires_otp",
      "requiresOtp",
      "otp_required",
      "otpRequired",
      "requires_2fa",
      "requires2fa",
      "requires2FA",
      "two_factor_required",
      "twoFactorRequired",
      "mfa_required",
      "mfaRequired",
    ];
    for (const key of flagKeys) {
      if (record[key] === true) return true;
    }
    if (record.data && typeof record.data === "object") {
      if (isOtpRequiredResponse(record.data, "")) return true;
    }
  }
  return /\b(otp|2fa|authenticator|verification code)\b/i.test(message);
}

export async function forgotPasswordRequest(payload: ForgotPasswordPayload) {
  return requestJson(AUTH_ENDPOINTS.forgotPassword, {
    username_or_email: (payload.username_or_email ?? "").trim(),
    otp_code: (payload.otp_code ?? "").trim(),
    new_password: payload.new_password,
  });
}

/* ==================== Dashboard & RBAC API ==================== */

export interface RbacModule {
  id: number;
  name: string;
  code?: string;
  route?: string;
  category?: string;
  parent_id?: number | null;
  description?: string;
  raw: Record<string, unknown>;
}

export interface ModuleGroup {
  parent: RbacModule;
  actions: RbacModule[];
}

const ACTION_VERB_REGEX =
  /^(view|create|add|edit|update|delete|remove|manage|approve|reject|record|mark|generate|issue|pay|verify|send|upload|download|export|print|assign|reset|toggle|submit|list|configure|review)\b/i;

export function isActionPermissionName(name: string): boolean {
  return ACTION_VERB_REGEX.test(name.trim());
}

/**
 * Groups flat RBAC modules into top-level parent sidebar sections and their nested action permissions.
 * Uses explicit `parent_id` when present, and falls back to grouping action-verb rows
 * ("View ...", "Create ...", "Edit ...", "Delete ...", "Manage ...", etc.) under their parent module.
 */
export function groupModulesByParent(modules: RbacModule[]): ModuleGroup[] {
  if (modules.length === 0) return [];

  const hasExplicitParentIds = modules.some((m) => typeof m.parent_id === "number" && m.parent_id > 0);
  const groups: ModuleGroup[] = [];
  const byId = new Map<number, ModuleGroup>();

  if (hasExplicitParentIds) {
    for (const mod of modules) {
      if (!mod.parent_id) {
        const g: ModuleGroup = { parent: mod, actions: [] };
        groups.push(g);
        byId.set(mod.id, g);
      }
    }

    for (const mod of modules) {
      if (mod.parent_id) {
        const parentGroup = byId.get(mod.parent_id);
        if (parentGroup) {
          parentGroup.actions.push(mod);
        } else {
          // Orphan child whose parent module isn't selected — keep visible cleanly
          const g: ModuleGroup = { parent: mod, actions: [] };
          groups.push(g);
          byId.set(mod.id, g);
        }
      }
    }
    return groups;
  }

  // Fallback when DB returns sequential rows without parent_id
  let currentGroup: ModuleGroup | null = null;
  for (const mod of modules) {
    if (!isActionPermissionName(mod.name)) {
      const g: ModuleGroup = { parent: mod, actions: [] };
      groups.push(g);
      byId.set(mod.id, g);
      currentGroup = g;
    } else if (currentGroup) {
      currentGroup.actions.push(mod);
    } else {
      const g: ModuleGroup = { parent: mod, actions: [] };
      groups.push(g);
      byId.set(mod.id, g);
      currentGroup = g;
    }
  }

  return groups;
}

export interface RoleAccessRecord {
  role_id: number;
  role_name: string;
  module_ids: number[];
  module_ids_csv: string;
  modules: RbacModule[];
}

export interface DashboardUser {
  id?: number | string;
  username?: string;
  email?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  full_name?: string;
  phone_number?: string;
  address?: string;
  gender?: string;
  [key: string]: unknown;
}

export interface DashboardStats {
  upcoming_tournaments: number;
  total_players: number;
  pending_soa_count: number;
  total_balance: number;
}

export interface DashboardData {
  user: DashboardUser;
  role_id: number;
  role_name: string;
  has_dashboard_access: boolean;
  access: {
    module_ids: number[];
    module_ids_csv: string;
    modules: RbacModule[];
  };
  stats: DashboardStats;
  children: Record<string, unknown>[];
  upcoming_tournaments: Record<string, unknown>[];
  recent_attendance: Record<string, unknown>[];
  soas: Record<string, unknown>[];
}

export function parseModuleIds(input: unknown): number[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
    ).sort((a, b) => a - b);
  }
  if (typeof input === "string") {
    return Array.from(
      new Set(
        input
          .split(",")
          .map((part) => Number(part.trim()))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
    ).sort((a, b) => a - b);
  }
  return [];
}

export function normalizeModule(raw: unknown, fallbackIndex = 0, fallbackCategory?: string): RbacModule | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return {
      id: fallbackIndex + 1,
      name: trimmed,
      category: fallbackCategory,
      raw: { name: trimmed },
    };
  }

  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  let id = Number(
    r.id ??
      r.module_id ??
      r.modules_id ??
      r.mod_id ??
      r.ID ??
      r.ModuleID ??
      r.ModuleId ??
      r.ModulesID ??
      r.ModID
  );

  if (!Number.isInteger(id) || id <= 0) {
    for (const [k, v] of Object.entries(r)) {
      if (/(^id$|_id$|Id$|ID$)/.test(k) && !/parent|role/i.test(k)) {
        const parsed = Number(v);
        if (Number.isInteger(parsed) && parsed > 0) {
          id = parsed;
          break;
        }
      }
    }
  }

  if (!Number.isInteger(id) || id <= 0) {
    id = fallbackIndex + 1;
  }

  const nameCandidate =
    r.name ??
    r.module_name ??
    r.modules_name ??
    r.mod_name ??
    r.title ??
    r.label ??
    r.display_name ??
    r.Name ??
    r.ModuleName ??
    r.Title ??
    r.Label;

  let name = typeof nameCandidate === "string" && nameCandidate.trim() ? nameCandidate.trim() : "";

  if (!name) {
    for (const [k, v] of Object.entries(r)) {
      if (
        typeof v === "string" &&
        v.trim() &&
        !/(created|updated|deleted|path|route|url|icon)/i.test(k)
      ) {
        name = v.trim();
        break;
      }
    }
  }

  if (!name) name = `Module #${id}`;

  const codeVal = r.code ?? r.module_code ?? r.slug ?? r.Code ?? r.ModuleCode ?? r.Slug;
  const code = typeof codeVal === "string" && codeVal.trim() ? codeVal.trim() : undefined;

  const routeVal = r.route ?? r.path ?? r.url ?? r.href ?? r.Route ?? r.Path ?? r.URL;
  const route = typeof routeVal === "string" && routeVal.trim() ? routeVal.trim() : undefined;

  const catVal =
    r.category ??
    r.group ??
    r.group_name ??
    r.module_group ??
    r.section ??
    r.parent_module ??
    r.parent_name ??
    r.Category ??
    r.Group ??
    r.Section ??
    fallbackCategory;
  const category = typeof catVal === "string" && catVal.trim() ? catVal.trim() : undefined;

  const parentRaw = r.parent_id ?? r.ParentID ?? r.parentId;
  const parentNum = parentRaw !== null && parentRaw !== undefined ? Number(parentRaw) : null;
  const parent_id = parentNum && Number.isInteger(parentNum) && parentNum > 0 ? parentNum : null;

  const descVal = r.description ?? r.Description;
  const description = typeof descVal === "string" && descVal.trim() ? descVal.trim() : undefined;

  return { id, name, code, route, category, parent_id, description, raw: r };
}

function asObjectArray(val: unknown): Record<string, unknown>[] {
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

function normalizeModulesList(val: unknown): RbacModule[] {
  const results: RbacModule[] = [];
  const seen = new Set<string>();

  function pushMod(item: unknown, fallbackCategory?: string) {
    const mod = normalizeModule(item, results.length, fallbackCategory);
    if (!mod) return;
    const key = `${mod.id}:${mod.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(mod);
    }

    if (item && typeof item === "object") {
      const r = item as Record<string, unknown>;
      const nested = r.children ?? r.submodules ?? r.sub_modules ?? r.items ?? r.Children;
      if (Array.isArray(nested)) {
        for (const child of nested) {
          pushMod(child, mod.name);
        }
      }
    }
  }

  if (Array.isArray(val)) {
    for (const item of val) pushMod(item);
    return results;
  }

  if (val && typeof val === "object") {
    for (const [groupKey, groupVal] of Object.entries(val as Record<string, unknown>)) {
      if (Array.isArray(groupVal)) {
        for (const item of groupVal) pushMod(item, groupKey);
      }
    }
  }

  return results;
}

async function authRequest<T = unknown>(
  url: string,
  options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: Record<string, unknown> } = {}
): Promise<ApiResult<T>> {
  const token = getAuthToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      data: null as T,
      message: "Please log in to continue.",
    };
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const contentType = response.headers.get("content-type") || "";
    let data: unknown = null;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    const record =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};

    const message =
      (typeof record.message === "string" && record.message) ||
      (typeof record.error === "string" && record.error) ||
      (response.ok ? "Success." : `Request failed (HTTP ${response.status}).`);

    return {
      ok: response.ok,
      status: response.status,
      data: data as T,
      message,
    };
  } catch (error) {
    console.error("Authorized API request failed:", url, error);
    return {
      ok: false,
      status: 0,
      data: null as T,
      message: "Unable to reach the server. Please check your connection and try again.",
    };
  }
}

export async function fetchMyAccess(): Promise<
  ApiResult<{ module_ids: number[]; modules: RbacModule[] }>
> {
  const res = await authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.myAccess);
  if (!res.ok || !res.data || typeof res.data !== "object") {
    return { ...res, data: { module_ids: [], modules: [] } };
  }
  const root =
    res.data.data && typeof res.data.data === "object" && !Array.isArray(res.data.data)
      ? (res.data.data as Record<string, unknown>)
      : res.data;
  const modules = normalizeModulesList(
    root.modules ?? root.Modules ?? root.allowed_modules ?? root.sidebar_modules
  );
  const ids = parseModuleIds(root.module_ids ?? root.ModuleIDs ?? root.moduleIds);
  return {
    ...res,
    data: {
      module_ids: ids.length > 0 ? ids : modules.map((m) => m.id),
      modules,
    },
  };
}

export function hasDashboardModule(modules: RbacModule[], moduleIds: number[]): boolean {
  if (modules.some((m) => /^dashboard$/i.test(m.name.trim()) || m.id === 1)) {
    return true;
  }
  return modules.length === 0 && moduleIds.includes(1);
}

/**
 * Bootstraps the authenticated portal using GET /api/auth/me + GET /api/rbac/my-access
 * so the shell & sidebar ALWAYS load even when a role does NOT have Dashboard module access.
 * Only calls GET /api/dashboard when the user actually has Dashboard permission.
 */
export async function fetchPortalSession(): Promise<ApiResult<DashboardData | null>> {
  const [meRes, accessRes] = await Promise.all([
    authRequest<Record<string, unknown>>(AUTH_ENDPOINTS.me),
    fetchMyAccess(),
  ]);

  if (meRes.status === 401 || accessRes.status === 401) {
    return {
      ok: false,
      status: 401,
      data: null,
      message: "Session expired. Please log in again.",
    };
  }

  // Extract user & role from /api/auth/me (supports both flat user fields and nested { user, access })
  let user: DashboardUser = {};
  let roleId = 0;
  let roleName = "Member";
  let modules: RbacModule[] = [];
  let parsedIds: number[] = [];

  if (meRes.ok && meRes.data && typeof meRes.data === "object") {
    const root =
      meRes.data.data && typeof meRes.data.data === "object" && !Array.isArray(meRes.data.data)
        ? (meRes.data.data as Record<string, unknown>)
        : meRes.data;

    user = (
      root.user && typeof root.user === "object" ? root.user : root
    ) as DashboardUser;

    roleId = Number(root.role_id ?? root.RoleID ?? user.role_id ?? 0);
    roleName = String(root.role_name ?? root.RoleName ?? user.role_name ?? "Member");

    const accessRaw = (
      root.access && typeof root.access === "object" && !Array.isArray(root.access)
        ? root.access
        : root
    ) as Record<string, unknown>;

    modules = normalizeModulesList(
      accessRaw.modules ?? accessRaw.Modules ?? accessRaw.allowed_modules ?? root.modules
    );
    parsedIds = parseModuleIds(
      accessRaw.module_ids ?? accessRaw.ModuleIDs ?? root.module_ids ?? root.ModuleIDs
    );
  }

  // Merge / fallback from GET /api/rbac/my-access (authoritative RBAC endpoint)
  if (accessRes.ok) {
    if (accessRes.data.modules.length > 0) {
      modules = accessRes.data.modules;
    }
    if (accessRes.data.module_ids.length > 0) {
      parsedIds = accessRes.data.module_ids;
    }
  }

  // If neither /api/auth/me nor /api/rbac/my-access succeeded, fall back to /api/dashboard as last resort
  if (!meRes.ok && !accessRes.ok) {
    return fetchDashboard();
  }

  // If we have module_ids but no module objects yet, resolve via /api/rbac/modules
  if (modules.length === 0 && parsedIds.length > 0) {
    const allModRes = await fetchAllModules();
    if (allModRes.ok && allModRes.data.length > 0) {
      const idSet = new Set(parsedIds);
      modules = allModRes.data.filter((m) => idSet.has(m.id));
    }
  }

  const moduleIds = parsedIds.length > 0 ? parsedIds : modules.map((m) => m.id);
  let canViewDashboard = hasDashboardModule(modules, moduleIds);

  let stats: DashboardStats = {
    upcoming_tournaments: 0,
    total_players: 0,
    pending_soa_count: 0,
    total_balance: 0,
  };
  let children: Record<string, unknown>[] = [];
  let upcoming_tournaments: Record<string, unknown>[] = [];
  let recent_attendance: Record<string, unknown>[] = [];
  let soas: Record<string, unknown>[] = [];

  // Only fetch /api/dashboard if the user has Dashboard module permission
  if (canViewDashboard) {
    const dashRes = await fetchDashboard();
    if (dashRes.status === 401) {
      return { ...dashRes, data: null };
    }
    if (dashRes.status === 403) {
      // Backend denied Dashboard module — stay alive without Dashboard tab!
      canViewDashboard = false;
    } else if (dashRes.ok && dashRes.data) {
      if (dashRes.data.user && Object.keys(dashRes.data.user).length > 0) {
        user = { ...user, ...dashRes.data.user };
      }
      if (dashRes.data.role_id) roleId = dashRes.data.role_id;
      if (dashRes.data.role_name) roleName = dashRes.data.role_name;
      if (modules.length === 0 && dashRes.data.access.modules.length > 0) {
        modules = dashRes.data.access.modules;
      }
      stats = dashRes.data.stats;
      children = dashRes.data.children;
      upcoming_tournaments = dashRes.data.upcoming_tournaments;
      recent_attendance = dashRes.data.recent_attendance;
      soas = dashRes.data.soas;
    }
  }

  return {
    ok: true,
    status: 200,
    message: "Loaded.",
    data: {
      user,
      role_id: roleId,
      role_name: roleName,
      has_dashboard_access: canViewDashboard,
      access: {
        module_ids: moduleIds,
        module_ids_csv: moduleIds.join(","),
        modules,
      },
      stats,
      children,
      upcoming_tournaments,
      recent_attendance,
      soas,
    },
  };
}

export async function fetchDashboard(): Promise<ApiResult<DashboardData | null>> {
  const res = await authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.dashboard);
  if (!res.ok || !res.data || typeof res.data !== "object") {
    return { ...res, data: null };
  }

  const root =
    res.data.data && typeof res.data.data === "object" && !Array.isArray(res.data.data)
      ? (res.data.data as Record<string, unknown>)
      : res.data;

  const user = (root.user && typeof root.user === "object" ? root.user : {}) as DashboardUser;
  const roleId = Number(root.role_id ?? root.RoleID ?? user.role_id ?? 0);
  const roleName = String(root.role_name ?? root.RoleName ?? user.role_name ?? "Member");

  const accessRaw = (
    root.access && typeof root.access === "object" && !Array.isArray(root.access)
      ? root.access
      : root
  ) as Record<string, unknown>;

  let modules = normalizeModulesList(
    accessRaw.modules ??
      accessRaw.Modules ??
      accessRaw.allowed_modules ??
      accessRaw.sidebar_modules ??
      root.modules ??
      root.Modules ??
      root.allowed_modules ??
      (Array.isArray(root.access) ? root.access : undefined)
  );
  let parsedIds = parseModuleIds(
    accessRaw.module_ids ??
      accessRaw.ModuleIDs ??
      accessRaw.moduleIds ??
      root.module_ids ??
      root.ModuleIDs
  );

  if (modules.length === 0) {
    const myAccessRes = await fetchMyAccess();
    if (myAccessRes.ok) {
      if (myAccessRes.data.modules.length > 0) modules = myAccessRes.data.modules;
      if (parsedIds.length === 0 && myAccessRes.data.module_ids.length > 0) {
        parsedIds = myAccessRes.data.module_ids;
      }
    }
  }

  if (modules.length === 0 && parsedIds.length > 0) {
    const allModRes = await fetchAllModules();
    if (allModRes.ok && allModRes.data.length > 0) {
      const idSet = new Set(parsedIds);
      modules = allModRes.data.filter((m) => idSet.has(m.id));
    }
  }

  const moduleIds = parsedIds.length > 0 ? parsedIds : modules.map((m) => m.id);

  const statsRaw = (root.stats && typeof root.stats === "object" ? root.stats : {}) as Record<
    string,
    unknown
  >;

  return {
    ...res,
    data: {
      user,
      role_id: roleId,
      role_name: roleName,
      has_dashboard_access: true,
      access: {
        module_ids: moduleIds,
        module_ids_csv: moduleIds.join(","),
        modules,
      },
      stats: {
        upcoming_tournaments: Number(statsRaw.upcoming_tournaments ?? 0) || 0,
        total_players: Number(statsRaw.total_players ?? 0) || 0,
        pending_soa_count: Number(statsRaw.pending_soa_count ?? 0) || 0,
        total_balance: Number(statsRaw.total_balance ?? 0) || 0,
      },
      children: asObjectArray(root.children),
      upcoming_tournaments: asObjectArray(root.upcoming_tournaments),
      recent_attendance: asObjectArray(root.recent_attendance),
      soas: asObjectArray(root.soas),
    },
  };
}

export async function fetchAllModules(): Promise<ApiResult<RbacModule[]>> {
  const res = await authRequest<unknown>(DASHBOARD_ENDPOINTS.modules);
  if (!res.ok) return { ...res, data: [] };

  const list = Array.isArray(res.data)
    ? res.data
    : res.data && typeof res.data === "object"
    ? (res.data as Record<string, unknown>).modules ??
      (res.data as Record<string, unknown>).data ??
      []
    : [];

  return { ...res, data: normalizeModulesList(list) };
}

export async function fetchRoleAccessList(): Promise<ApiResult<RoleAccessRecord[]>> {
  const res = await authRequest<unknown>(DASHBOARD_ENDPOINTS.roleAccess);
  if (!res.ok) return { ...res, data: [] };

  const rawList = Array.isArray(res.data)
    ? res.data
    : res.data && typeof res.data === "object"
    ? (res.data as Record<string, unknown>).role_access ??
      (res.data as Record<string, unknown>).roles ??
      (res.data as Record<string, unknown>).data ??
      []
    : [];

  const ROLE_LABELS: Record<number, string> = {
    5: "Admin",
    6: "Coach",
    7: "Parent",
    8: "Player",
  };

  const normalized: RoleAccessRecord[] = asObjectArray(rawList).map((item) => {
    const roleId = Number(item.role_id ?? item.RoleID ?? item.id ?? 0);
    const ids = parseModuleIds(item.module_ids ?? item.ModuleIDs);
    return {
      role_id: roleId,
      role_name: String(item.role_name ?? item.RoleName ?? ROLE_LABELS[roleId] ?? `Role ${roleId}`),
      module_ids: ids,
      module_ids_csv: ids.join(","),
      modules: normalizeModulesList(item.modules),
    };
  });

  return { ...res, data: normalized };
}

function parseRoleAccessRecord(raw: unknown, fallbackRoleId: number): RoleAccessRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const root =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;

  const ROLE_LABELS: Record<number, string> = {
    5: "Admin",
    6: "Coach",
    7: "Parent",
    8: "Player",
  };

  const roleId = Number(root.role_id ?? root.RoleID ?? fallbackRoleId);
  const modules = normalizeModulesList(root.modules ?? root.Modules);
  const parsedIds = parseModuleIds(root.module_ids ?? root.ModuleIDs ?? root.ids);
  const ids = parsedIds.length > 0 ? parsedIds : modules.map((m) => m.id);

  return {
    role_id: roleId,
    role_name: String(root.role_name ?? root.RoleName ?? ROLE_LABELS[roleId] ?? `Role ${roleId}`),
    module_ids: ids,
    module_ids_csv: ids.join(","),
    modules,
  };
}

export async function fetchRoleAccessByRole(roleId: number): Promise<ApiResult<RoleAccessRecord | null>> {
  const res = await authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.roleAccessByRole(roleId));
  if (!res.ok) return { ...res, data: null };
  return { ...res, data: parseRoleAccessRecord(res.data, roleId) };
}

export async function updateRoleAccess(
  roleId: number,
  moduleIds: number[]
): Promise<ApiResult<RoleAccessRecord | null>> {
  const sortedUnique = Array.from(new Set(moduleIds))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);

  const res = await authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.roleAccessByRole(roleId), {
    method: "PUT",
    body: {
      ids: sortedUnique,
    },
  });

  if (!res.ok) return { ...res, data: null };
  return { ...res, data: parseRoleAccessRecord(res.data, roleId) };
}

export async function toggleRoleModule(
  roleId: number,
  moduleId: number
): Promise<ApiResult<RoleAccessRecord | null>> {
  const res = await authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.roleAccessToggle(roleId), {
    method: "PATCH",
    body: {
      module_id: moduleId,
    },
  });

  if (!res.ok) return { ...res, data: null };
  return { ...res, data: parseRoleAccessRecord(res.data, roleId) };
}

export async function removeRoleModule(
  roleId: number,
  moduleId: number
): Promise<ApiResult<RoleAccessRecord | null>> {
  const res = await authRequest<Record<string, unknown>>(
    DASHBOARD_ENDPOINTS.roleAccessRemoveModule(roleId, moduleId),
    {
      method: "DELETE",
    }
  );

  if (!res.ok) return { ...res, data: null };
  return { ...res, data: parseRoleAccessRecord(res.data, roleId) };
}

/* ==================== Daily Attendance & Players API ==================== */

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused" | "";

export interface DailyAttendanceSummary {
  total_players: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
}

export interface DailyAttendancePlayer {
  player_user_id: number;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  age_category: string;
  position: string;
  status: AttendanceStatus;
  attended: boolean;
  check_in_time: string | null;
  remarks: string;
}

export interface DailyAttendanceResponse {
  date: string;
  session_id: number | null;
  summary: DailyAttendanceSummary;
  players: DailyAttendancePlayer[];
}

export interface PlayerAttendanceRecord {
  attendance_id: number;
  session_id: number;
  date: string;
  session_title: string;
  status: AttendanceStatus;
  attended: boolean;
  check_in_time: string | null;
  remarks: string;
}

export interface PlayerAttendanceHistoryResponse {
  player_user_id: number;
  today: string;
  attended_today: boolean;
  today_status: AttendanceStatus;
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  records: PlayerAttendanceRecord[];
}

export interface CreatePlayerPayload {
  first_name: string;
  last_name: string;
  gender: string;
  age_category: string;
  position: string;
  jersey_number: number;
}

export interface AllHistoryPlayer {
  player_user_id: number;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  age_category: string;
  position: string;
  attended_today: boolean;
  today_status: AttendanceStatus;
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendance_rate: number;
  };
  history: PlayerAttendanceRecord[];
}

export interface AllAttendanceHistoryResponse {
  today: string;
  count: number;
  players: AllHistoryPlayer[];
}

function normalizeStatus(val: unknown): AttendanceStatus {
  const s = String(val ?? "").trim().toLowerCase();
  if (s === "present") return "Present";
  if (s === "absent") return "Absent";
  if (s === "late") return "Late";
  if (s === "excused") return "Excused";
  return "";
}

export function getLocalTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchDailyAttendance(params?: {
  date?: string;
  age_category?: string;
}): Promise<ApiResult<DailyAttendanceResponse | null>> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set("date", params.date);
  if (params?.age_category && params.age_category !== "all") {
    qs.set("age_category", params.age_category);
  }
  const query = qs.toString();
  const url = query
    ? `${DASHBOARD_ENDPOINTS.dailyAttendance}?${query}`
    : DASHBOARD_ENDPOINTS.dailyAttendance;

  const res = await authRequest<Record<string, unknown>>(url);
  if (!res.ok || !res.data || typeof res.data !== "object") {
    return { ...res, data: null };
  }

  const root =
    res.data.data && typeof res.data.data === "object" && !Array.isArray(res.data.data)
      ? (res.data.data as Record<string, unknown>)
      : res.data;

  const summaryRaw = (root.summary && typeof root.summary === "object" ? root.summary : {}) as Record<
    string,
    unknown
  >;

  const players: DailyAttendancePlayer[] = asObjectArray(root.players).map((p) => {
    const status = normalizeStatus(p.status);
    const attended =
      typeof p.attended === "boolean" ? p.attended : status === "Present" || status === "Late";
    const jersey = p.jersey_number !== null && p.jersey_number !== undefined ? Number(p.jersey_number) : null;
    return {
      player_user_id: Number(p.player_user_id ?? p.user_id ?? p.id ?? 0),
      first_name: String(p.first_name ?? ""),
      last_name: String(p.last_name ?? ""),
      jersey_number: jersey !== null && !Number.isNaN(jersey) ? jersey : null,
      age_category: String(p.age_category ?? ""),
      position: String(p.position ?? ""),
      status,
      attended,
      check_in_time: typeof p.check_in_time === "string" ? p.check_in_time : null,
      remarks: String(p.remarks ?? ""),
    };
  });

  const summary: DailyAttendanceSummary = {
    total_players: Number(summaryRaw.total_players ?? players.length) || 0,
    present: Number(summaryRaw.present ?? 0) || 0,
    absent: Number(summaryRaw.absent ?? 0) || 0,
    late: Number(summaryRaw.late ?? 0) || 0,
    excused: Number(summaryRaw.excused ?? 0) || 0,
    unmarked: Number(summaryRaw.unmarked ?? 0) || 0,
  };

  return {
    ...res,
    data: {
      date: String(root.date ?? params?.date ?? getLocalTodayISO()),
      session_id: root.session_id ? Number(root.session_id) : null,
      summary,
      players,
    },
  };
}

export async function markSingleDailyAttendance(payload: {
  date?: string;
  player_user_id: number;
  status: Exclude<AttendanceStatus, "">;
  remarks?: string;
}) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.dailyAttendance, {
    method: "POST",
    body: {
      ...(payload.date ? { date: payload.date } : {}),
      player_user_id: payload.player_user_id,
      status: payload.status,
      remarks: payload.remarks ?? "",
    },
  });
}

export async function markBulkDailyAttendance(payload: {
  date?: string;
  records: Array<{
    player_user_id: number;
    status: Exclude<AttendanceStatus, "">;
    remarks?: string;
  }>;
}) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.dailyAttendance, {
    method: "POST",
    body: {
      ...(payload.date ? { date: payload.date } : {}),
      records: payload.records.map((r) => ({
        player_user_id: r.player_user_id,
        status: r.status,
        remarks: r.remarks ?? "",
      })),
    },
  });
}

export async function fetchPlayerAttendanceHistory(
  playerUserId: number | string,
  date?: string
): Promise<ApiResult<PlayerAttendanceHistoryResponse | null>> {
  const base = DASHBOARD_ENDPOINTS.playerAttendance(playerUserId);
  const url = date ? `${base}?date=${encodeURIComponent(date)}` : base;

  const res = await authRequest<Record<string, unknown>>(url);
  if (!res.ok || !res.data || typeof res.data !== "object") {
    return { ...res, data: null };
  }

  const root =
    res.data.data && typeof res.data.data === "object" && !Array.isArray(res.data.data)
      ? (res.data.data as Record<string, unknown>)
      : res.data;

  const summaryRaw = (root.summary && typeof root.summary === "object" ? root.summary : {}) as Record<
    string,
    unknown
  >;

  const records: PlayerAttendanceRecord[] = asObjectArray(root.records).map((r, idx) => {
    const status = normalizeStatus(r.status);
    return {
      attendance_id: Number(r.attendance_id ?? r.id ?? idx + 1),
      session_id: Number(r.session_id ?? 0),
      date: String(r.date ?? ""),
      session_title: String(r.session_title ?? `Daily Training - ${r.date ?? ""}`),
      status,
      attended: typeof r.attended === "boolean" ? r.attended : status === "Present" || status === "Late",
      check_in_time: typeof r.check_in_time === "string" ? r.check_in_time : null,
      remarks: String(r.remarks ?? ""),
    };
  });

  const todayStatus = normalizeStatus(root.today_status);

  return {
    ...res,
    data: {
      player_user_id: Number(root.player_user_id ?? playerUserId),
      today: String(root.today ?? getLocalTodayISO()),
      attended_today:
        typeof root.attended_today === "boolean"
          ? root.attended_today
          : todayStatus === "Present" || todayStatus === "Late",
      today_status: todayStatus,
      summary: {
        total: Number(summaryRaw.total ?? records.length) || 0,
        present: Number(summaryRaw.present ?? 0) || 0,
        absent: Number(summaryRaw.absent ?? 0) || 0,
        late: Number(summaryRaw.late ?? 0) || 0,
        excused: Number(summaryRaw.excused ?? 0) || 0,
      },
      records,
    },
  };
}

export async function createPlayer(payload: CreatePlayerPayload) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.players, {
    method: "POST",
    body: {
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      gender: payload.gender,
      age_category: payload.age_category.trim(),
      position: payload.position.trim(),
      jersey_number: Number(payload.jersey_number),
    },
  });
}

export async function fetchAllAttendanceHistory(params?: {
  age_category?: string;
  month?: string;
  from?: string;
  to?: string;
}): Promise<ApiResult<AllAttendanceHistoryResponse | null>> {
  const qs = new URLSearchParams();
  if (params?.age_category && params.age_category !== "all") {
    qs.set("age_category", params.age_category);
  }
  if (params?.month) {
    qs.set("month", params.month);
  } else {
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
  }
  const query = qs.toString();
  const url = query
    ? `${DASHBOARD_ENDPOINTS.attendanceHistory}?${query}`
    : DASHBOARD_ENDPOINTS.attendanceHistory;

  const res = await authRequest<Record<string, unknown>>(url);
  if (!res.ok || !res.data || typeof res.data !== "object") {
    return { ...res, data: null };
  }

  const root =
    res.data.data && typeof res.data.data === "object" && !Array.isArray(res.data.data)
      ? (res.data.data as Record<string, unknown>)
      : res.data;

  const players: AllHistoryPlayer[] = asObjectArray(root.players).map((p) => {
    const todayStatus = normalizeStatus(p.today_status);
    const jersey =
      p.jersey_number !== null && p.jersey_number !== undefined ? Number(p.jersey_number) : null;
    const sumRaw = (p.summary && typeof p.summary === "object" ? p.summary : {}) as Record<
      string,
      unknown
    >;
    const hist: PlayerAttendanceRecord[] = asObjectArray(p.history ?? p.records).map((r, idx) => {
      const st = normalizeStatus(r.status);
      return {
        attendance_id: Number(r.attendance_id ?? r.id ?? idx + 1),
        session_id: Number(r.session_id ?? 0),
        date: String(r.date ?? ""),
        session_title: String(r.session_title ?? `Daily Training - ${r.date ?? ""}`),
        status: st,
        attended: typeof r.attended === "boolean" ? r.attended : st === "Present" || st === "Late",
        check_in_time: typeof r.check_in_time === "string" ? r.check_in_time : null,
        remarks: String(r.remarks ?? ""),
      };
    });

    const total = Number(sumRaw.total ?? hist.length) || 0;
    const present = Number(sumRaw.present ?? 0) || 0;
    const late = Number(sumRaw.late ?? 0) || 0;
    const rateRaw = sumRaw.attendance_rate;
    const rate =
      rateRaw !== undefined && rateRaw !== null && !Number.isNaN(Number(rateRaw))
        ? Math.round(Number(rateRaw))
        : total > 0
        ? Math.round(((present + late) / total) * 100)
        : 0;

    return {
      player_user_id: Number(p.player_user_id ?? p.user_id ?? p.id ?? 0),
      first_name: String(p.first_name ?? ""),
      last_name: String(p.last_name ?? ""),
      jersey_number: jersey !== null && !Number.isNaN(jersey) ? jersey : null,
      age_category: String(p.age_category ?? ""),
      position: String(p.position ?? ""),
      attended_today:
        typeof p.attended_today === "boolean"
          ? p.attended_today
          : todayStatus === "Present" || todayStatus === "Late",
      today_status: todayStatus,
      summary: {
        total,
        present,
        absent: Number(sumRaw.absent ?? 0) || 0,
        late,
        excused: Number(sumRaw.excused ?? 0) || 0,
        attendance_rate: rate,
      },
      history: hist,
    };
  });

  return {
    ...res,
    data: {
      today: String(root.today ?? getLocalTodayISO()),
      count: Number(root.count ?? players.length) || players.length,
      players,
    },
  };
}
