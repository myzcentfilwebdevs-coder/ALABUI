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
  registrationStatus: `${API_BASE_URL}/api/auth/registration-status`,
  verifyOtp: `${API_BASE_URL}/api/auth/verify-otp`,
  login: `${API_BASE_URL}/api/auth/login`,
  forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
  me: `${API_BASE_URL}/api/auth/me`,
  profile: `${API_BASE_URL}/api/profile`,
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
  parents: `${API_BASE_URL}/api/parents`,
  myPlayers: `${API_BASE_URL}/api/my-players`,
  parentPlayers: (parentId: number | string) => `${API_BASE_URL}/api/parents/${parentId}/players`,
  linkParentPlayer: `${API_BASE_URL}/api/parents/link-player`,
  unlinkParentPlayer: (linkId: number | string) =>
    `${API_BASE_URL}/api/parents/link-player/${linkId}`,
  tournaments: `${API_BASE_URL}/api/tournaments`,
  tournamentById: (id: number | string) => `${API_BASE_URL}/api/tournaments/${id}`,
  tournamentMatches: (id: number | string) => `${API_BASE_URL}/api/tournaments/${id}/matches`,
  tournamentMatchById: (matchId: number | string) =>
    `${API_BASE_URL}/api/tournaments/matches/${matchId}`,
  tournamentRoster: (id: number | string) => `${API_BASE_URL}/api/tournaments/${id}/roster`,
  tournamentRosterById: (rosterId: number | string) =>
    `${API_BASE_URL}/api/tournaments/roster/${rosterId}`,
  tournamentRosterConsent: (rosterId: number | string) =>
    `${API_BASE_URL}/api/tournaments/roster/${rosterId}/consent`,
  users: `${API_BASE_URL}/api/users`,
  userRole: (userId: number | string) => `${API_BASE_URL}/api/users/${userId}/role`,
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
  endpoint?: string;
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
          if (trimmed.startsWith("/")) {
            result.qrCode = `${API_BASE_URL}${trimmed}`;
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

function extractRawErrorText(record: Record<string, unknown>): string {
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  if (record.error && typeof record.error === "object") {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim();
  }
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    const first = record.errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof (first as Record<string, unknown>).message === "string") {
      return String((first as Record<string, unknown>).message);
    }
  }
  if (record.errors && typeof record.errors === "object" && !Array.isArray(record.errors)) {
    const vals = Object.values(record.errors as Record<string, unknown>)
      .flat()
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (vals.length > 0) return vals[0];
  }
  if (typeof record.details === "string" && record.details.trim()) return record.details.trim();
  if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
  return "";
}

function getEndpointPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

async function parseApiResponse<T>(
  response: Response,
  method: string,
  url: string
): Promise<ApiResult<T>> {
  const endpoint = `${method} ${getEndpointPath(url)}`;
  const contentType = response.headers.get("content-type") || "";
  let data: unknown = null;
  let plainText = "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      plainText = await response.text().catch(() => "");
      data = plainText ? { message: plainText } : {};
    }
  } else {
    plainText = (await response.text().catch(() => "")).trim();
    if (plainText.startsWith("{") || plainText.startsWith("[")) {
      try {
        data = JSON.parse(plainText);
      } catch {
        data = { message: plainText };
      }
    } else {
      data = plainText ? { message: plainText } : {};
    }
  }

  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  // Catch backend errors even if the server accidentally returned HTTP 200
  const hasExplicitBodyError =
    (typeof record.error === "string" && record.error.trim().length > 0) ||
    (record.error !== undefined && record.error !== null && typeof record.error === "object") ||
    record.success === false ||
    record.ok === false ||
    (typeof record.status === "string" && /^(error|fail|failed)$/i.test(record.status)) ||
    /^(method not allowed|cannot (get|post|put|patch|delete)\b|not found|internal server error|unauthorized|forbidden)/i.test(
      plainText
    );

  const ok = response.ok && !hasExplicitBodyError;
  const rawMessage = extractRawErrorText(record) || plainText;

  if (ok) {
    return {
      ok: true,
      status: response.status,
      data: data as T,
      message: (typeof record.message === "string" && record.message.trim()) || "Success.",
      endpoint,
    };
  }

  let message = rawMessage;
  if (response.status === 405 || /^method not allowed$/i.test(rawMessage)) {
    message = `Method Not Allowed (405): ${endpoint} is not enabled on ${API_BASE_URL}. Check if this route is registered/deployed on your backend.`;
  } else if (response.status === 404) {
    message = rawMessage && !/^cannot /i.test(rawMessage) && !/^not found$/i.test(rawMessage)
      ? rawMessage
      : `Endpoint not found (404): ${endpoint} on ${API_BASE_URL}.`;
  } else if (response.status === 403) {
    message = rawMessage || "Access denied (403): You do not have permission for this action.";
  } else if (response.status === 401) {
    message = rawMessage || "Unauthorized (401): Please log in again.";
  } else if (response.status >= 500) {
    message = rawMessage
      ? `Server Error (${response.status}): ${rawMessage}`
      : `Server Error (${response.status}): Please check your backend logs.`;
  } else if (!message) {
    message = `Request failed (HTTP ${response.status}).`;
  }

  return {
    ok: false,
    status: response.status,
    data: data as T,
    message,
    endpoint,
  };
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

    return parseApiResponse<T>(response, "POST", url);
  } catch (error) {
    console.error("API request failed:", url, error);
    return {
      ok: false,
      status: 0,
      data: null as T,
      message: `Unable to reach ${API_BASE_URL}. Make sure your backend server is running and CORS is enabled.`,
      endpoint: `POST ${getEndpointPath(url)}`,
    };
  }
}

export function extractEmailVerifiedFlag(data: unknown): boolean | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  for (const key of ["email_verified", "emailVerified", "is_email_verified", "verified"]) {
    if (typeof record[key] === "boolean") return record[key] as boolean;
  }
  if (record.data && typeof record.data === "object") {
    return extractEmailVerifiedFlag(record.data);
  }
  return null;
}

export interface RegistrationStatusData {
  email_verified: boolean;
  authSetup: AuthenticatorSetup;
  message: string;
}

export async function fetchRegistrationStatus(
  usernameOrEmail: string
): Promise<ApiResult<RegistrationStatusData>> {
  const qs = new URLSearchParams({ username_or_email: usernameOrEmail.trim() });
  const url = `${AUTH_ENDPOINTS.registrationStatus}?${qs.toString()}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const parsed = await parseApiResponse<Record<string, unknown>>(response, "GET", url);
    const raw = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
    const flag = extractEmailVerifiedFlag(raw);
    const authSetup = extractAuthenticatorSetup(raw);
    const emailVerified = flag === true || Boolean(authSetup.qrCode || authSetup.secret);

    return {
      ...parsed,
      data: {
        email_verified: emailVerified,
        authSetup,
        message: parsed.message,
      },
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { email_verified: false, authSetup: {}, message: "Unable to check verification status." },
      message: `Unable to reach ${API_BASE_URL}. Make sure your backend server is running.`,
      endpoint: `GET ${getEndpointPath(url)}`,
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
  /^(view|create|add|edit|update|delete|remove|manage|approve|reject|record|mark|generate|issue|pay|verify|send|upload|download|export|print|assign|reset|toggle|submit|list|configure|review|link|unlink|change|enroll|check)\b/i;

export function isActionPermissionName(name: string): boolean {
  return ACTION_VERB_REGEX.test(name.trim());
}

type ModuleDomainKey =
  | "dashboard"
  | "rbac"
  | "tournaments"
  | "attendance"
  | "soa"
  | "players"
  | "profile"
  | "users"
  | "announcements"
  | "gallery"
  | "settings";

const DOMAIN_FALLBACK_LABELS: Record<ModuleDomainKey, string> = {
  dashboard: "Dashboard",
  rbac: "RBAC",
  tournaments: "Tournaments",
  attendance: "Attendance",
  soa: "SOA & Billing",
  players: "Players",
  profile: "Profile",
  users: "User Management",
  announcements: "Announcements",
  gallery: "Gallery",
  settings: "Settings",
};

function inferModuleDomain(mod: RbacModule): ModuleDomainKey | null {
  const haystack = `${mod.name} ${mod.category ?? ""} ${mod.code ?? ""}`.toLowerCase();
  if (/\bdashboard\b/.test(haystack)) return "dashboard";
  if (/(rbac|role\s*access|role\s*permission|\broles?\b)/.test(haystack)) return "rbac";
  if (/(own\s*profile|\bprofile\b|my\s*account|password)/.test(haystack)) return "profile";
  if (/(attendance|training|session|check.?in)/.test(haystack)) return "attendance";
  if (/(soa|bill|payment|invoice|fee|receipt)/.test(haystack)) return "soa";
  if (/(tournament|match|fixture|standing|league|event)/.test(haystack)) return "tournaments";
  if (/(player|child|parent.?link|roster|team)/.test(haystack)) return "players";
  if (/(user\s*management|\busers?\b|\bmembers?\b|\bcoaches?\b|\bparents?\b)/.test(haystack)) {
    return "users";
  }
  if (/(announcement|news|notice)/.test(haystack)) return "announcements";
  if (/(gallery|photo|media)/.test(haystack)) return "gallery";
  if (/(setting|config)/.test(haystack)) return "settings";
  return null;
}

/**
 * Groups flat RBAC modules into top-level parent sidebar sections and their nested action permissions.
 * Ensures action-verb rows ("View Players", "View Own Profile", "Edit Own Profile", "View SOA",
 * "Submit Payment", "View Training Sessions", etc.) ALWAYS nest under their parent module —
 * even when the backend returns parent_id = null or omits the parent row for a role.
 */
export function groupModulesByParent(
  modules: RbacModule[],
  options?: { collapseOrphans?: boolean }
): ModuleGroup[] {
  if (modules.length === 0) return [];

  const collapseOrphans = options?.collapseOrphans ?? false;
  const groups: ModuleGroup[] = [];
  const byId = new Map<number, ModuleGroup>();
  const byDomain = new Map<ModuleDomainKey, ModuleGroup>();
  const byNameLower = new Map<string, ModuleGroup>();
  const childrenQueue: RbacModule[] = [];

  // Pass 1: Collect true top-level parent modules (no parent_id and not an action verb)
  for (const mod of modules) {
    const isAction = isActionPermissionName(mod.name);
    if (!mod.parent_id && !isAction) {
      const g: ModuleGroup = { parent: mod, actions: [] };
      groups.push(g);
      byId.set(mod.id, g);
      byNameLower.set(mod.name.trim().toLowerCase(), g);
      const dom = inferModuleDomain(mod);
      if (dom && !byDomain.has(dom)) {
        byDomain.set(dom, g);
      }
    } else {
      childrenQueue.push(mod);
    }
  }

  // Pass 2: Attach every action/sub-module to its parent via parent_id -> category -> domain inference
  for (const mod of childrenQueue) {
    // 1) Direct parent_id match
    if (mod.parent_id && byId.has(mod.parent_id)) {
      byId.get(mod.parent_id)!.actions.push(mod);
      continue;
    }

    // 2) Explicit category/parent_name match
    const catKey = mod.category?.trim().toLowerCase();
    if (catKey && byNameLower.has(catKey)) {
      byNameLower.get(catKey)!.actions.push(mod);
      continue;
    }

    // 3) Domain match (e.g. "View Players" -> Players, "View Own Profile" -> Profile, "View SOA" -> SOA & Billing)
    const dom = inferModuleDomain(mod);
    if (dom && byDomain.has(dom)) {
      byDomain.get(dom)!.actions.push(mod);
      continue;
    }

    // 4) Orphan action whose parent module wasn't enabled for this role:
    // For the sidebar (collapseOrphans=true), fold all orphans of the same domain into ONE clean menu item.
    if (collapseOrphans && dom) {
      const syntheticParent: RbacModule = {
        ...mod,
        name: DOMAIN_FALLBACK_LABELS[dom],
        parent_id: null,
      };
      const g: ModuleGroup = { parent: syntheticParent, actions: [mod] };
      groups.push(g);
      byId.set(mod.id, g);
      byDomain.set(dom, g);
      byNameLower.set(syntheticParent.name.toLowerCase(), g);
      continue;
    }

    // Fallback: keep accessible rather than dropping it
    const g: ModuleGroup = { parent: mod, actions: [] };
    groups.push(g);
    byId.set(mod.id, g);
    if (dom && !byDomain.has(dom)) {
      byDomain.set(dom, g);
    }
  }

  return groups;
}

export interface UpdateOwnProfilePayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  phone_number?: string;
  address?: string;
  email?: string;
}

export async function updateOwnProfile(payload: UpdateOwnProfilePayload) {
  const body = {
    first_name: payload.first_name.trim(),
    middle_name: (payload.middle_name ?? "").trim(),
    last_name: payload.last_name.trim(),
    gender: (payload.gender ?? "").trim(),
    phone_number: (payload.phone_number ?? "").trim(),
    address: (payload.address ?? "").trim(),
    ...(payload.email?.trim() ? { email: payload.email.trim() } : {}),
  };

  const candidates = [
    AUTH_ENDPOINTS.profile,
    `${API_BASE_URL}/api/auth/profile`,
    `${API_BASE_URL}/api/users/profile`,
  ];

  let lastResult: ApiResult<Record<string, unknown>> = {
    ok: false,
    status: 404,
    data: {},
    message: "Profile update endpoint is not available yet.",
  };

  for (const url of candidates) {
    const res = await authRequest<Record<string, unknown>>(url, {
      method: "PUT",
      body,
    });
    if (res.ok) return res;
    lastResult = res;
    if (res.status !== 404 && res.status !== 405) {
      return res;
    }
  }

  return lastResult;
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
  const method = options.method ?? "GET";
  const token = getAuthToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      data: null as T,
      message: "Please log in to continue.",
      endpoint: `${method} ${getEndpointPath(url)}`,
    };
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    return parseApiResponse<T>(response, method, url);
  } catch (error) {
    console.error("Authorized API request failed:", url, error);
    return {
      ok: false,
      status: 0,
      data: null as T,
      message: `Unable to reach ${API_BASE_URL}. Make sure your backend server is running and CORS is enabled.`,
      endpoint: `${method} ${getEndpointPath(url)}`,
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

function normalizeRecordDate(rawVal: unknown): string {
  if (!rawVal) return "";
  const str = String(rawVal).trim();
  const isoMatch = str.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return str;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

  const rawList =
    root.records ??
    root.history ??
    root.attendance ??
    root.attendance_records ??
    root.sessions ??
    root.logs ??
    [];

  let records: PlayerAttendanceRecord[] = asObjectArray(rawList).map((r, idx) => {
    const status = normalizeStatus(r.status ?? r.attendance_status);
    const recDate = normalizeRecordDate(
      r.date ?? r.session_date ?? r.attendance_date ?? r.created_at
    );
    return {
      attendance_id: Number(r.attendance_id ?? r.id ?? idx + 1),
      session_id: Number(r.session_id ?? 0),
      date: recDate,
      session_title: String(
        r.session_title ?? r.title ?? r.session_name ?? (recDate ? `Daily Training - ${recDate}` : "Training Session")
      ),
      status,
      attended:
        typeof r.attended === "boolean" ? r.attended : status === "Present" || status === "Late",
      check_in_time: typeof r.check_in_time === "string" ? r.check_in_time : null,
      remarks: String(r.remarks ?? r.notes ?? ""),
    };
  });

  const totalCount = Number(summaryRaw.total ?? records.length) || 0;
  const resolvedPlayerId = Number(root.player_user_id ?? playerUserId);
  const todayStr = normalizeRecordDate(root.today) || getLocalTodayISO();
  const todayStatus = normalizeStatus(root.today_status);

  // Fallback: if /api/attendance/player/:id returned summary counts without the array, hydrate from /api/attendance/history
  if (records.length === 0 && totalCount > 0) {
    const allRes = await fetchAllAttendanceHistory();
    if (allRes.ok && allRes.data) {
      const match = allRes.data.players.find((p) => p.player_user_id === resolvedPlayerId);
      if (match && match.history.length > 0) {
        records = match.history.map((rec) => ({
          ...rec,
          date: normalizeRecordDate(rec.date),
        }));
      }
    }
  }

  // Ensure today's status is visible on the calendar if backend reported today_status but omitted today's row
  if (todayStatus && !records.some((r) => r.date === todayStr)) {
    records = [
      {
        attendance_id: -1,
        session_id: 0,
        date: todayStr,
        session_title: `Daily Training - ${todayStr}`,
        status: todayStatus,
        attended: todayStatus === "Present" || todayStatus === "Late",
        check_in_time: null,
        remarks: "",
      },
      ...records,
    ];
  }

  return {
    ...res,
    data: {
      player_user_id: resolvedPlayerId,
      today: todayStr,
      attended_today:
        typeof root.attended_today === "boolean"
          ? root.attended_today
          : todayStatus === "Present" || todayStatus === "Late",
      today_status: todayStatus,
      summary: {
        total: totalCount || records.length,
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

/* ==================== Parent–Player Linking & Roster API ==================== */

export const RELATIONSHIP_OPTIONS = [
  { id: 15, label: "Father" },
  { id: 16, label: "Mother" },
  { id: 17, label: "Guardian" },
  { id: 18, label: "Relative" },
] as const;

export const RELATIONSHIP_LABELS: Record<number, string> = {
  15: "Father",
  16: "Mother",
  17: "Guardian",
  18: "Relative",
};

export interface ParentOption {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
}

export interface LinkedPlayer {
  link_id: number | null;
  parent_user_id: number | null;
  parent_name: string;
  player_user_id: number;
  relationship_id: number | null;
  relationship: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string;
  age: number | null;
  age_category: string;
  position: string;
  jersey_number: number | null;
  status: string;
}

export interface LinkParentPlayersPayload {
  parent_name: string;
  relationship: string;
  player_user_ids: number[];
}

function normalizeLinkedPlayer(raw: Record<string, unknown>): LinkedPlayer {
  const nestedPlayer = (
    raw.player && typeof raw.player === "object"
      ? raw.player
      : raw.user && typeof raw.user === "object"
      ? raw.user
      : raw
  ) as Record<string, unknown>;

  const nestedProfile = (
    raw.player_profile && typeof raw.player_profile === "object"
      ? raw.player_profile
      : nestedPlayer.player_profile && typeof nestedPlayer.player_profile === "object"
      ? nestedPlayer.player_profile
      : raw.profile && typeof raw.profile === "object"
      ? raw.profile
      : nestedPlayer
  ) as Record<string, unknown>;

  const linkIdRaw = raw.link_id ?? raw.parent_player_id ?? (raw.player_user_id ? raw.id : null);
  const linkId = linkIdRaw !== null && linkIdRaw !== undefined ? Number(linkIdRaw) : null;

  const playerUserId = Number(
    raw.player_user_id ?? nestedPlayer.user_id ?? nestedPlayer.id ?? raw.id ?? 0
  );

  const parentUserIdRaw = raw.parent_user_id ?? null;
  const parentUserId =
    parentUserIdRaw !== null && parentUserIdRaw !== undefined ? Number(parentUserIdRaw) : null;

  const relIdRaw = raw.relationship_id ?? null;
  const relId = relIdRaw !== null && relIdRaw !== undefined ? Number(relIdRaw) : null;

  const relLabel = String(
    raw.relationship ??
      raw.relationship_name ??
      (relId && RELATIONSHIP_LABELS[relId] ? RELATIONSHIP_LABELS[relId] : "")
  );

  const jerseyRaw =
    raw.jersey_number ?? nestedProfile.jersey_number ?? nestedPlayer.jersey_number ?? null;
  const jersey = jerseyRaw !== null && jerseyRaw !== undefined ? Number(jerseyRaw) : null;

  const firstName = String(
    raw.first_name ?? nestedProfile.first_name ?? nestedPlayer.first_name ?? ""
  ).trim();
  const lastName = String(
    raw.last_name ?? nestedProfile.last_name ?? nestedPlayer.last_name ?? ""
  ).trim();
  const rawFullName = String(
    raw.full_name ?? nestedProfile.full_name ?? nestedPlayer.full_name ?? ""
  ).trim();
  const fullName = rawFullName || [firstName, lastName].filter(Boolean).join(" ");

  const parentObj =
    raw.parent && typeof raw.parent === "object" ? (raw.parent as Record<string, unknown>) : null;
  const parentName = String(
    raw.parent_name ??
      parentObj?.full_name ??
      [parentObj?.first_name, parentObj?.last_name].filter(Boolean).join(" ") ??
      ""
  ).trim();

  const ageRaw = raw.age ?? nestedProfile.age ?? nestedPlayer.age ?? null;
  const ageNum = ageRaw !== null && ageRaw !== undefined && String(ageRaw).trim() !== "" ? Number(ageRaw) : null;

  const statusStr = String(raw.status ?? nestedProfile.status ?? nestedPlayer.status ?? "").trim();

  return {
    link_id: linkId !== null && !Number.isNaN(linkId) && linkId > 0 ? linkId : null,
    parent_user_id:
      parentUserId !== null && !Number.isNaN(parentUserId) && parentUserId > 0
        ? parentUserId
        : null,
    parent_name: parentName,
    player_user_id: !Number.isNaN(playerUserId) ? playerUserId : 0,
    relationship_id: relId !== null && !Number.isNaN(relId) && relId > 0 ? relId : null,
    relationship: relLabel,
    first_name: firstName || fullName.split(/\s+/)[0] || "",
    last_name: lastName || fullName.split(/\s+/).slice(1).join(" ") || "",
    full_name: fullName,
    gender: String(raw.gender ?? nestedProfile.gender ?? nestedPlayer.gender ?? ""),
    age: ageNum !== null && !Number.isNaN(ageNum) && ageNum > 0 ? ageNum : null,
    age_category: String(
      raw.age_category ?? nestedProfile.age_category ?? nestedPlayer.age_category ?? ""
    ),
    position: String(raw.position ?? nestedProfile.position ?? nestedPlayer.position ?? ""),
    jersey_number: jersey !== null && !Number.isNaN(jersey) ? jersey : null,
    status: statusStr,
  };
}

function extractPlayersArray(data: unknown): LinkedPlayer[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object"
    ? (data as Record<string, unknown>).players ??
      (data as Record<string, unknown>).children ??
      (data as Record<string, unknown>).data ??
      []
    : [];
  return asObjectArray(list).map(normalizeLinkedPlayer);
}

export async function fetchParents(search?: string): Promise<ApiResult<ParentOption[]>> {
  const url = search?.trim()
    ? `${DASHBOARD_ENDPOINTS.parents}?search=${encodeURIComponent(search.trim())}`
    : DASHBOARD_ENDPOINTS.parents;

  const res = await authRequest<unknown>(url);
  if (!res.ok) return { ...res, data: [] };

  const rawList = Array.isArray(res.data)
    ? res.data
    : res.data && typeof res.data === "object"
    ? (res.data as Record<string, unknown>).parents ??
      (res.data as Record<string, unknown>).data ??
      []
    : [];

  const parents: ParentOption[] = asObjectArray(rawList).map((p) => {
    const first = String(p.first_name ?? "").trim();
    const last = String(p.last_name ?? "").trim();
    const full = String(p.full_name ?? "").trim() || [first, last].filter(Boolean).join(" ");
    return {
      user_id: Number(p.user_id ?? p.id ?? 0),
      username: String(p.username ?? ""),
      email: String(p.email ?? ""),
      first_name: first,
      last_name: last,
      full_name: full || String(p.username ?? `Parent #${p.user_id ?? p.id ?? ""}`),
      phone_number: String(p.phone_number ?? ""),
    };
  });

  return { ...res, data: parents };
}

export async function fetchMyPlayers(): Promise<ApiResult<LinkedPlayer[]>> {
  const res = await authRequest<unknown>(DASHBOARD_ENDPOINTS.myPlayers);
  if (!res.ok) return { ...res, data: [] };
  return { ...res, data: extractPlayersArray(res.data) };
}

export async function fetchParentPlayers(
  parentId: number | string
): Promise<ApiResult<LinkedPlayer[]>> {
  const res = await authRequest<unknown>(DASHBOARD_ENDPOINTS.parentPlayers(parentId));
  if (!res.ok) return { ...res, data: [] };
  return { ...res, data: extractPlayersArray(res.data) };
}

export async function fetchAllPlayersRoster(): Promise<ApiResult<LinkedPlayer[]>> {
  const res = await authRequest<unknown>(DASHBOARD_ENDPOINTS.players);
  if (res.ok) {
    const parsed = extractPlayersArray(res.data);
    if (parsed.length > 0) return { ...res, data: parsed };
  }

  // Fallback to GET /api/attendance/daily which always returns the full players roster
  const dailyRes = await fetchDailyAttendance();
  if (dailyRes.ok && dailyRes.data) {
    return {
      ok: true,
      status: 200,
      message: "Loaded.",
      data: dailyRes.data.players.map((p) => ({
        link_id: null,
        parent_user_id: null,
        parent_name: "",
        player_user_id: p.player_user_id,
        relationship_id: null,
        relationship: "",
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: [p.first_name, p.last_name].filter(Boolean).join(" "),
        gender: "",
        age: null,
        age_category: p.age_category,
        position: p.position,
        jersey_number: p.jersey_number,
        status: "",
      })),
    };
  }

  return { ...res, data: [] };
}

export async function linkParentPlayers(payload: LinkParentPlayersPayload) {
  const uniqueIds = Array.from(new Set(payload.player_user_ids)).filter(
    (id) => Number.isInteger(id) && id > 0
  );

  return authRequest<{
    message?: string;
    parent_user_id?: number;
    parent_name?: string;
    linked_count?: number;
    data?: unknown;
  }>(DASHBOARD_ENDPOINTS.linkParentPlayer, {
    method: "POST",
    body: {
      parent_name: payload.parent_name.trim(),
      relationship: payload.relationship.trim(),
      player_user_ids: uniqueIds,
    },
  });
}

export async function unlinkParentPlayer(linkId: number | string) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.unlinkParentPlayer(linkId), {
    method: "DELETE",
  });
}

/* ==================== Tournaments, Match Schedules & Roster API ==================== */

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  age_category: string;
  game_label: string;
  home_team: string;
  opponent: string;
  match_date: string;
  match_time: string;
  pitch: string;
  alab_score: number | null;
  opponent_score: number | null;
  status: string;
  remarks: string;
}

export interface TournamentRosterItem {
  id: number;
  tournament_id: number;
  player_user_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  age_category: string;
  position: string;
  jersey_number: number | null;
  parent_consent: boolean;
  remarks: string;
}

export interface TournamentItem {
  id: number;
  title: string;
  description: string;
  venue: string;
  start_date: string;
  end_date: string;
  age_categories: string[];
  status: string;
  registration_fee: number;
  match_count: number;
  roster_count: number;
}

export interface TournamentDetail extends TournamentItem {
  matches: TournamentMatch[];
  matches_by_category: Record<string, TournamentMatch[]>;
  rosters: TournamentRosterItem[];
}

export interface CreateMatchPayload {
  age_category: string;
  game_label: string;
  home_team?: string;
  opponent: string;
  match_date: string;
  match_time: string;
  pitch?: string;
  remarks?: string;
}

export interface UpdateMatchPayload {
  age_category?: string;
  game_label?: string;
  home_team?: string;
  opponent?: string;
  match_date?: string;
  match_time?: string;
  pitch?: string;
  alab_score?: number | null;
  opponent_score?: number | null;
  status?: string;
  remarks?: string;
}

export interface CreateTournamentPayload {
  title: string;
  description?: string;
  venue: string;
  start_date: string;
  end_date: string;
  age_categories: string[];
  status?: string;
  registration_fee?: number;
  matches?: CreateMatchPayload[];
}

function parseAgeCategories(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(raw.map((v) => String(v ?? "").trim()).filter(Boolean))
    );
  }
  if (typeof raw === "string" && raw.trim()) {
    return Array.from(
      new Set(
        raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }
  return [];
}

function normalizeMatchTime(val: unknown): string {
  const s = String(val ?? "").trim();
  if (!s) return "";
  // Normalize "08:00" -> "08:00:00" when sending, keep clean HH:MM:SS or HH:MM when displaying
  return s;
}

function ensureHHMMSS(val: string): string {
  const s = val.trim();
  if (!s) return "";
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

function encodeOpponentForBackend(homeTeam: string | undefined, opponent: string, ageCategory?: string): string {
  const cleanOpp = opponent.trim();
  const cleanHome = (homeTeam ?? "").trim();
  if (!cleanHome) return cleanOpp;
  const defaultAlab = ageCategory ? `ALAB FC ${ageCategory}` : "ALAB FC";
  if (
    cleanHome.toLowerCase() === "alab fc" ||
    cleanHome.toLowerCase() === "alab" ||
    cleanHome.toLowerCase() === defaultAlab.toLowerCase()
  ) {
    return cleanOpp;
  }
  return `${cleanHome} vs ${cleanOpp}`;
}

function normalizeTournamentMatch(raw: Record<string, unknown>, fallbackTournamentId = 0): TournamentMatch {
  const alabRaw = raw.alab_score;
  const oppRaw = raw.opponent_score;
  const alabScore =
    alabRaw !== null && alabRaw !== undefined && String(alabRaw).trim() !== ""
      ? Number(alabRaw)
      : null;
  const oppScore =
    oppRaw !== null && oppRaw !== undefined && String(oppRaw).trim() !== ""
      ? Number(oppRaw)
      : null;

  const ageCategory = String(raw.age_category ?? "").trim();
  const rawHome = String(raw.home_team ?? raw.team_a ?? "").trim();
  const rawOpp = String(raw.opponent ?? raw.opponent_name ?? raw.team_b ?? "").trim();

  let homeTeam = rawHome;
  let opponent = rawOpp;

  if (!homeTeam && /\s+vs\.?\s+/i.test(rawOpp)) {
    const splitMatch = rawOpp.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    if (splitMatch) {
      homeTeam = splitMatch[1].trim();
      opponent = splitMatch[2].trim();
    }
  }

  if (!homeTeam) {
    homeTeam = ageCategory ? `ALAB FC ${ageCategory}` : "ALAB FC";
  }

  return {
    id: Number(raw.id ?? raw.match_id ?? 0),
    tournament_id: Number(raw.tournament_id ?? fallbackTournamentId),
    age_category: ageCategory,
    game_label: String(raw.game_label ?? raw.round ?? "Game").trim(),
    home_team: homeTeam,
    opponent: opponent || "TBA",
    match_date: normalizeRecordDate(raw.match_date ?? raw.date),
    match_time: normalizeMatchTime(raw.match_time ?? raw.kickoff_time ?? raw.time),
    pitch: String(raw.pitch ?? raw.field ?? "").trim(),
    alab_score: alabScore !== null && !Number.isNaN(alabScore) ? alabScore : null,
    opponent_score: oppScore !== null && !Number.isNaN(oppScore) ? oppScore : null,
    status: String(raw.status ?? "Scheduled").trim() || "Scheduled",
    remarks: String(raw.remarks ?? raw.notes ?? "").trim(),
  };
}

function normalizeTournamentRosterItem(
  raw: Record<string, unknown>,
  fallbackTournamentId = 0
): TournamentRosterItem {
  const nestedPlayer =
    raw.player && typeof raw.player === "object"
      ? (raw.player as Record<string, unknown>)
      : raw.user && typeof raw.user === "object"
      ? (raw.user as Record<string, unknown>)
      : null;
  const nestedProfile =
    raw.player_profile && typeof raw.player_profile === "object"
      ? (raw.player_profile as Record<string, unknown>)
      : nestedPlayer?.player_profile && typeof nestedPlayer.player_profile === "object"
      ? (nestedPlayer.player_profile as Record<string, unknown>)
      : raw.profile && typeof raw.profile === "object"
      ? (raw.profile as Record<string, unknown>)
      : null;

  const first = String(
    raw.first_name ?? nestedProfile?.first_name ?? nestedPlayer?.first_name ?? ""
  ).trim();
  const last = String(
    raw.last_name ?? nestedProfile?.last_name ?? nestedPlayer?.last_name ?? ""
  ).trim();
  const rawFull = String(
    raw.full_name ?? raw.player_name ?? nestedProfile?.full_name ?? nestedPlayer?.full_name ?? ""
  ).trim();
  const full = rawFull || [first, last].filter(Boolean).join(" ");

  const jerseyRaw =
    raw.jersey_number ?? nestedProfile?.jersey_number ?? nestedPlayer?.jersey_number ?? null;
  const jersey = jerseyRaw !== null && jerseyRaw !== undefined ? Number(jerseyRaw) : null;

  const playerUserId = Number(
    raw.player_user_id ?? nestedPlayer?.user_id ?? nestedPlayer?.id ?? 0
  );

  return {
    id: Number(raw.id ?? raw.roster_id ?? 0),
    tournament_id: Number(raw.tournament_id ?? fallbackTournamentId),
    player_user_id: !Number.isNaN(playerUserId) ? playerUserId : 0,
    first_name: first || full.split(/\s+/)[0] || "",
    last_name: last || full.split(/\s+/).slice(1).join(" ") || "",
    full_name: full || `Player #${playerUserId}`,
    age_category: String(
      raw.age_category ?? nestedProfile?.age_category ?? nestedPlayer?.age_category ?? ""
    ).trim(),
    position: String(
      raw.position ?? nestedProfile?.position ?? nestedPlayer?.position ?? ""
    ).trim(),
    jersey_number: jersey !== null && !Number.isNaN(jersey) ? jersey : null,
    parent_consent: Boolean(raw.parent_consent),
    remarks: String(raw.remarks ?? raw.notes ?? "").trim(),
  };
}

function normalizeTournamentItem(raw: Record<string, unknown>): TournamentItem {
  const id = Number(raw.id ?? raw.tournament_id ?? 0);
  const fee = Number(raw.registration_fee ?? raw.fee ?? 0);
  const cats = parseAgeCategories(raw.age_categories ?? raw.categories ?? raw.age_category);
  const matchesArr = asObjectArray(raw.matches);
  const rostersArr = asObjectArray(raw.rosters ?? raw.roster);

  return {
    id,
    title: String(raw.title ?? raw.name ?? raw.tournament_name ?? `Tournament #${id}`).trim(),
    description: String(raw.description ?? "").trim(),
    venue: String(raw.venue ?? raw.location ?? "TBA").trim(),
    start_date: normalizeRecordDate(raw.start_date ?? raw.date),
    end_date: normalizeRecordDate(raw.end_date ?? raw.start_date ?? raw.date),
    age_categories: cats,
    status: String(raw.status ?? "Upcoming").trim() || "Upcoming",
    registration_fee: Number.isNaN(fee) ? 0 : fee,
    match_count: Number(raw.match_count ?? matchesArr.length) || 0,
    roster_count: Number(raw.roster_count ?? rostersArr.length) || 0,
  };
}

export async function fetchTournaments(params?: {
  status?: string;
  age_category?: string;
}): Promise<ApiResult<TournamentItem[]>> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.age_category && params.age_category !== "all") {
    qs.set("age_category", params.age_category);
  }
  const query = qs.toString();
  const url = query ? `${DASHBOARD_ENDPOINTS.tournaments}?${query}` : DASHBOARD_ENDPOINTS.tournaments;

  const token = getAuthToken();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const res = await parseApiResponse<unknown>(response, "GET", url);
    if (!res.ok) return { ...res, data: [] };

    const rawList = Array.isArray(res.data)
      ? res.data
      : res.data && typeof res.data === "object"
      ? (res.data as Record<string, unknown>).tournaments ??
        (res.data as Record<string, unknown>).data ??
        []
      : [];

    return { ...res, data: asObjectArray(rawList).map(normalizeTournamentItem) };
  } catch (error) {
    console.error("Failed to fetch tournaments:", error);
    return {
      ok: false,
      status: 0,
      data: [],
      message: `Unable to reach ${API_BASE_URL}. Make sure your backend server is running.`,
    };
  }
}

export async function fetchTournamentDetail(
  id: number | string,
  ageCategory?: string
): Promise<ApiResult<TournamentDetail | null>> {
  const base = DASHBOARD_ENDPOINTS.tournamentById(id);
  const url =
    ageCategory && ageCategory !== "all"
      ? `${base}?age_category=${encodeURIComponent(ageCategory)}`
      : base;

  const token = getAuthToken();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const res = await parseApiResponse<Record<string, unknown>>(response, "GET", url);
    if (!res.ok || !res.data || typeof res.data !== "object") {
      return { ...res, data: null };
    }

    const root =
      res.data.data && typeof res.data.data === "object" && !Array.isArray(res.data.data)
        ? (res.data.data as Record<string, unknown>)
        : res.data;

    const tournamentRaw =
      root.tournament && typeof root.tournament === "object"
        ? (root.tournament as Record<string, unknown>)
        : root;

    const baseItem = normalizeTournamentItem({
      ...tournamentRaw,
      age_categories:
        root.age_categories ?? tournamentRaw.age_categories ?? tournamentRaw.categories,
    });

    const matches = asObjectArray(root.matches ?? tournamentRaw.matches).map((m) =>
      normalizeTournamentMatch(m, baseItem.id)
    );

    const matchesByCat: Record<string, TournamentMatch[]> = {};
    const rawGrouped = root.matches_by_category;
    if (rawGrouped && typeof rawGrouped === "object" && !Array.isArray(rawGrouped)) {
      for (const [cat, list] of Object.entries(rawGrouped as Record<string, unknown>)) {
        matchesByCat[cat] = asObjectArray(list).map((m) =>
          normalizeTournamentMatch(m, baseItem.id)
        );
      }
    } else {
      for (const m of matches) {
        const key = m.age_category || "General";
        if (!matchesByCat[key]) matchesByCat[key] = [];
        matchesByCat[key].push(m);
      }
    }

    const rosters = asObjectArray(
      root.rosters ?? root.roster ?? tournamentRaw.rosters ?? tournamentRaw.roster
    ).map((r) => normalizeTournamentRosterItem(r, baseItem.id));

    // Merge any category discovered from matches/rosters into age_categories
    const catSet = new Set(baseItem.age_categories);
    for (const m of matches) if (m.age_category) catSet.add(m.age_category);
    for (const key of Object.keys(matchesByCat)) if (key) catSet.add(key);

    return {
      ...res,
      data: {
        ...baseItem,
        age_categories: Array.from(catSet),
        match_count: matches.length,
        roster_count: rosters.length,
        matches,
        matches_by_category: matchesByCat,
        rosters,
      },
    };
  } catch (error) {
    console.error("Failed to fetch tournament detail:", error);
    return {
      ok: false,
      status: 0,
      data: null,
      message: `Unable to reach ${API_BASE_URL}.`,
    };
  }
}

export async function createTournament(payload: CreateTournamentPayload) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournaments, {
    method: "POST",
    body: {
      title: payload.title.trim(),
      description: (payload.description ?? "").trim(),
      venue: payload.venue.trim(),
      start_date: payload.start_date,
      end_date: payload.end_date || payload.start_date,
      age_categories: payload.age_categories,
      status: payload.status || "Upcoming",
      registration_fee: Number(payload.registration_fee ?? 0) || 0,
      ...(payload.matches && payload.matches.length > 0
        ? {
            matches: payload.matches.map((m) => ({
              age_category: m.age_category.trim(),
              game_label: m.game_label.trim(),
              ...(m.home_team?.trim() ? { home_team: m.home_team.trim() } : {}),
              opponent: encodeOpponentForBackend(m.home_team, m.opponent, m.age_category),
              match_date: m.match_date,
              match_time: ensureHHMMSS(m.match_time),
              pitch: (m.pitch ?? "").trim(),
              remarks: (m.remarks ?? "").trim(),
            })),
          }
        : {}),
    },
  });
}

export async function updateTournament(
  id: number | string,
  payload: Partial<CreateTournamentPayload>
) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentById(id), {
    method: "PUT",
    body: {
      ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
      ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
      ...(payload.venue !== undefined ? { venue: payload.venue.trim() } : {}),
      ...(payload.start_date !== undefined ? { start_date: payload.start_date } : {}),
      ...(payload.end_date !== undefined ? { end_date: payload.end_date } : {}),
      ...(payload.age_categories !== undefined ? { age_categories: payload.age_categories } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.registration_fee !== undefined
        ? { registration_fee: Number(payload.registration_fee) || 0 }
        : {}),
    },
  });
}

export async function deleteTournament(id: number | string) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentById(id), {
    method: "DELETE",
  });
}

export async function addTournamentMatches(
  tournamentId: number | string,
  matches: CreateMatchPayload[]
) {
  const formatted = matches.map((m) => ({
    age_category: m.age_category.trim(),
    game_label: m.game_label.trim(),
    ...(m.home_team?.trim() ? { home_team: m.home_team.trim() } : {}),
    opponent: encodeOpponentForBackend(m.home_team, m.opponent, m.age_category),
    match_date: m.match_date,
    match_time: ensureHHMMSS(m.match_time),
    pitch: (m.pitch ?? "").trim(),
    remarks: (m.remarks ?? "").trim(),
  }));

  const body: Record<string, unknown> =
    formatted.length === 1 ? formatted[0] : { matches: formatted };

  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentMatches(tournamentId), {
    method: "POST",
    body,
  });
}

export async function updateTournamentMatch(
  matchId: number | string,
  payload: UpdateMatchPayload
) {
  const encodedOpponent =
    payload.opponent !== undefined
      ? encodeOpponentForBackend(payload.home_team, payload.opponent, payload.age_category)
      : undefined;

  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentMatchById(matchId), {
    method: "PUT",
    body: {
      ...(payload.age_category !== undefined ? { age_category: payload.age_category.trim() } : {}),
      ...(payload.game_label !== undefined ? { game_label: payload.game_label.trim() } : {}),
      ...(payload.home_team !== undefined ? { home_team: payload.home_team.trim() } : {}),
      ...(encodedOpponent !== undefined ? { opponent: encodedOpponent } : {}),
      ...(payload.match_date !== undefined ? { match_date: payload.match_date } : {}),
      ...(payload.match_time !== undefined ? { match_time: ensureHHMMSS(payload.match_time) } : {}),
      ...(payload.pitch !== undefined ? { pitch: payload.pitch.trim() } : {}),
      ...(payload.alab_score !== undefined ? { alab_score: payload.alab_score } : {}),
      ...(payload.opponent_score !== undefined ? { opponent_score: payload.opponent_score } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.remarks !== undefined ? { remarks: payload.remarks.trim() } : {}),
    },
  });
}

export async function deleteTournamentMatch(matchId: number | string) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentMatchById(matchId), {
    method: "DELETE",
  });
}

export async function addPlayersToTournamentRoster(
  tournamentId: number | string,
  payload: { player_user_ids: number[]; remarks?: string }
) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentRoster(tournamentId), {
    method: "POST",
    body: {
      player_user_ids: Array.from(new Set(payload.player_user_ids)).filter(
        (id) => Number.isInteger(id) && id > 0
      ),
      remarks: (payload.remarks ?? "").trim(),
    },
  });
}

export async function updateRosterParentConsent(
  rosterId: number | string,
  payload: { parent_consent: boolean; remarks?: string }
) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentRosterConsent(rosterId), {
    method: "PATCH",
    body: {
      parent_consent: payload.parent_consent,
      ...(payload.remarks !== undefined ? { remarks: payload.remarks.trim() } : {}),
    },
  });
}

export async function removeRosterPlayer(rosterId: number | string) {
  return authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.tournamentRosterById(rosterId), {
    method: "DELETE",
  });
}

/* ==================== ADMIN USER ROLE MANAGEMENT API ==================== */

export const USER_ROLE_OPTIONS = ["Admin", "Coach", "Parent", "Player"] as const;
export const USER_STATUS_OPTIONS = ["Active", "Inactive", "Pending", "Suspended"] as const;

export interface ManagedUser {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  role_id: number;
  role_name: string;
  status_id: number;
  status_name: string;
  created_at?: string;
}

function normalizeManagedUser(raw: Record<string, unknown>): ManagedUser | null {
  const userId = Number(raw.user_id ?? raw.id ?? raw.UserID ?? raw.ID ?? 0);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const first = String(raw.first_name ?? raw.FirstName ?? "").trim();
  const middle = String(raw.middle_name ?? raw.MiddleName ?? "").trim();
  const last = String(raw.last_name ?? raw.LastName ?? "").trim();
  const rawFull = String(raw.full_name ?? raw.FullName ?? raw.name ?? "").trim();
  const computedFull = [first, middle, last].filter(Boolean).join(" ").trim();
  const username = String(raw.username ?? raw.Username ?? "").trim();

  const roleId = Number(raw.role_id ?? raw.RoleID ?? 0);
  const roleNameRaw = String(raw.role_name ?? raw.RoleName ?? raw.role ?? "").trim();
  const roleName =
    roleNameRaw ||
    (roleId === 5
      ? "Admin"
      : roleId === 6
      ? "Coach"
      : roleId === 7
      ? "Parent"
      : roleId === 8
      ? "Player"
      : "Parent");

  const statusId = Number(raw.status_id ?? raw.StatusID ?? 0);
  const statusName =
    String(raw.status_name ?? raw.StatusName ?? raw.status ?? "").trim() || "Active";

  return {
    user_id: userId,
    username,
    email: String(raw.email ?? raw.Email ?? "").trim(),
    first_name: first,
    middle_name: middle,
    last_name: last,
    full_name: rawFull || computedFull || username || `User #${userId}`,
    phone_number: String(raw.phone_number ?? raw.PhoneNumber ?? "").trim(),
    role_id: roleId,
    role_name: roleName,
    status_id: statusId,
    status_name: statusName,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  };
}

export async function fetchAdminUsers(params?: {
  role?: string;
  search?: string;
}): Promise<ApiResult<ManagedUser[]>> {
  const qs = new URLSearchParams();
  if (params?.role && params.role !== "All" && params.role !== "all") {
    qs.set("role", params.role);
  }
  if (params?.search?.trim()) {
    qs.set("search", params.search.trim());
  }
  const url = `${DASHBOARD_ENDPOINTS.users}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await authRequest<unknown>(url);
  if (!res.ok) return { ...res, data: [] };

  const rawList = Array.isArray(res.data)
    ? res.data
    : res.data && typeof res.data === "object"
    ? (res.data as Record<string, unknown>).users ??
      (res.data as Record<string, unknown>).data ??
      []
    : [];

  const users = asObjectArray(rawList)
    .map(normalizeManagedUser)
    .filter((u): u is ManagedUser => u !== null);

  return { ...res, data: users };
}

export interface UpdateUserRoleResponse {
  user_id?: number;
  username?: string;
  role_id?: number;
  role_name?: string;
  status_id?: number;
  status_name?: string;
  message?: string;
  error?: string;
}

export async function verifyAuthSession(): Promise<{ valid: boolean; expired: boolean }> {
  const token = getAuthToken();
  if (!token) return { valid: false, expired: false };

  const res = await authRequest<Record<string, unknown>>(AUTH_ENDPOINTS.me);
  if (res.ok) return { valid: true, expired: false };
  if (res.status === 401 || res.status === 403) {
    clearAuthToken();
    return { valid: false, expired: true };
  }
  return { valid: false, expired: false };
}

export async function updateAdminUserRole(
  userId: number,
  payload: { role: string; status: string }
): Promise<ApiResult<UpdateUserRoleResponse>> {
  const res = await authRequest<Record<string, unknown>>(DASHBOARD_ENDPOINTS.userRole(userId), {
    method: "PUT",
    body: {
      role: payload.role,
      status: payload.status,
    },
  });

  const root =
    res.data && typeof res.data === "object"
      ? ((res.data.user && typeof res.data.user === "object"
          ? res.data.user
          : res.data.data && typeof res.data.data === "object"
          ? res.data.data
          : res.data) as Record<string, unknown>)
      : {};

  return {
    ...res,
    data: {
      user_id: Number(root.user_id ?? root.id ?? userId) || userId,
      username: typeof root.username === "string" ? root.username : undefined,
      role_id: root.role_id !== undefined ? Number(root.role_id) : undefined,
      role_name: typeof root.role_name === "string" ? root.role_name : payload.role,
      status_id: root.status_id !== undefined ? Number(root.status_id) : undefined,
      status_name: typeof root.status_name === "string" ? root.status_name : payload.status,
      message: typeof res.data?.message === "string" ? res.data.message : undefined,
      error: typeof res.data?.error === "string" ? res.data.error : undefined,
    },
  };
}
