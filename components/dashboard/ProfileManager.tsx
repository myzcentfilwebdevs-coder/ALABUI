"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import crest from "@/app/logo/logoALAB.png";
import stadiumBg from "@/app/logo/backgoundimage.png";
import {
  fetchMyPlayers,
  updateOwnProfile,
  type DashboardUser,
  type LinkedPlayer,
  type RbacModule,
} from "@/lib/api";
import {
  AtIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  EyeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  ShieldLockIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import CustomSelect from "@/components/ui/CustomSelect";

type ProfileTab = "view" | "edit";

interface ProfileManagerProps {
  user: DashboardUser;
  roleId: number;
  roleName: string;
  isAdmin: boolean;
  actions: RbacModule[];
  onProfileUpdated: () => void;
}

function strVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProfileManager({
  user,
  roleId,
  roleName,
  isAdmin,
  actions,
  onProfileUpdated,
}: ProfileManagerProps) {
  const canEdit =
    isAdmin || actions.some((a) => /(edit|update|manage)/i.test(a.name));

  const [activeTab, setActiveTab] = useState<ProfileTab>("view");
  const [linkedChildren, setLinkedChildren] = useState<LinkedPlayer[]>([]);

  // Form fields for Edit Own Profile
  const [firstName, setFirstName] = useState<string>(() => strVal(user.first_name));
  const [middleName, setMiddleName] = useState<string>(() => strVal(user.middle_name));
  const [lastName, setLastName] = useState<string>(() => strVal(user.last_name));
  const [gender, setGender] = useState<string>(() => strVal(user.gender) || "Male");
  const [phoneNumber, setPhoneNumber] = useState<string>(() => strVal(user.phone_number));
  const [address, setAddress] = useState<string>(() => strVal(user.address));
  const [email, setEmail] = useState<string>(() => strVal(user.email));

  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string; status?: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load linked children if Parent account (or any user with linked players)
  useEffect(() => {
    if (roleId !== 7) return;
    let active = true;
    const timer = setTimeout(() => {
      void fetchMyPlayers().then((res) => {
        if (active && res.ok) {
          setLinkedChildren(res.data);
        }
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [roleId]);

  const fullName =
    strVal(user.full_name) ||
    [strVal(user.first_name), strVal(user.middle_name), strVal(user.last_name)]
      .filter(Boolean)
      .join(" ") ||
    strVal(user.username) ||
    roleName;

  const username = strVal(user.username);
  const userEmail = strVal(user.email);
  const userPhone = strVal(user.phone_number);
  const userGender = strVal(user.gender);
  const userAddress = strVal(user.address);

  function openEditTab() {
    setFirstName(strVal(user.first_name));
    setMiddleName(strVal(user.middle_name));
    setLastName(strVal(user.last_name));
    setGender(strVal(user.gender) || "Male");
    setPhoneNumber(strVal(user.phone_number));
    setAddress(strVal(user.address));
    setEmail(strVal(user.email));
    setToast(null);
    setActiveTab("edit");
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setToast({ type: "error", message: "First name and last name are required." });
      return;
    }

    setSaving(true);
    setToast(null);
    const res = await updateOwnProfile({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      gender,
      phone_number: phoneNumber,
      address,
      email,
    });
    setSaving(false);

    if (res.ok) {
      setToast({ type: "success", message: "Profile updated successfully!" });
      setActiveTab("view");
      onProfileUpdated();
    } else {
      setToast({
        type: "error",
        status: res.status,
        message: res.message || "Failed to update profile.",
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* ==================== STADIUM PROFILE HERO BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#06184c] px-5 py-6 shadow-[0_16px_44px_-14px_rgba(37,99,235,0.55)] sm:px-6">
        <Image
          src={stadiumBg}
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="pointer-events-none object-cover object-right opacity-85"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041038]/94 via-[#072066]/68 to-[#040f33]/55" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-300/60 bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-900 text-2xl font-extrabold text-white shadow-[0_0_28px_rgba(56,189,248,0.6)]">
              {getInitials(fullName)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {fullName}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/45 bg-sky-500/20 px-2.5 py-0.5 text-xs font-bold text-sky-200">
                  <ShieldIcon className="h-3 w-3" />
                  {roleName}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-blue-100/85 sm:text-sm">
                {[username ? `@${username}` : "", userEmail].filter(Boolean).join(" • ") ||
                  "ALAB Football Club Member Profile"}
              </p>
            </div>
          </div>

          {/* Segmented View Own Profile / Edit Own Profile Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("view")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "view"
                  ? "bg-gradient-to-r from-blue-600 to-sky-400 text-white shadow-[0_0_20px_rgba(56,189,248,0.6)]"
                  : "border border-sky-300/35 bg-[#051542]/80 text-blue-100 backdrop-blur-md hover:border-sky-300 hover:text-white"
              }`}
            >
              <EyeIcon className="h-4 w-4" />
              View Profile
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={openEditTab}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activeTab === "edit"
                    ? "bg-gradient-to-r from-blue-600 to-sky-400 text-white shadow-[0_0_20px_rgba(56,189,248,0.6)]"
                    : "border border-sky-300/35 bg-[#051542]/80 text-blue-100 backdrop-blur-md hover:border-sky-300 hover:text-white"
                }`}
              >
                <EditIcon className="h-4 w-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-semibold ${
            toast.type === "success"
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
              : "border-rose-400/45 bg-rose-500/15 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.status && toast.status > 0 && toast.type === "error" && (
              <span className="rounded bg-rose-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-100">
                HTTP {toast.status}
              </span>
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ==================== MAIN CONTENT GRID ==================== */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* LEFT (8/12): View Own Profile OR Edit Own Profile */}
        <div className="dash-card rounded-2xl p-5 sm:p-6 lg:col-span-8">
          {activeTab === "view" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-400/15 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Personal Information</h3>
                    <p className="text-xs text-blue-200/70">
                      Your registered ALAB Football Club account details.
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={openEditTab}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3.5 py-1.5 text-xs font-bold text-sky-200 transition hover:bg-sky-500/30 hover:text-white"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit Own Profile
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoField
                  icon={<UserIcon className="h-4 w-4" />}
                  label="Full Name"
                  value={fullName || "—"}
                />
                <InfoField
                  icon={<AtIcon className="h-4 w-4" />}
                  label="Username"
                  value={username ? `@${username}` : "—"}
                />
                <InfoField
                  icon={<MailIcon className="h-4 w-4" />}
                  label="Email Address"
                  value={userEmail || "—"}
                />
                <InfoField
                  icon={<PhoneIcon className="h-4 w-4" />}
                  label="Phone Number"
                  value={userPhone || "Not provided"}
                />
                <InfoField
                  icon={<UserIcon className="h-4 w-4" />}
                  label="Gender"
                  value={userGender || "Not specified"}
                />
                <InfoField
                  icon={<ShieldIcon className="h-4 w-4" />}
                  label="Club Role"
                  value={roleName}
                />
                <div className="sm:col-span-2">
                  <InfoField
                    icon={<MapPinIcon className="h-4 w-4" />}
                    label="Address"
                    value={userAddress || "Not provided"}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ==================== EDIT OWN PROFILE FORM ==================== */
            <form method="post" onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-400/15 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                    <EditIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Own Profile</h3>
                    <p className="text-xs text-blue-200/70">
                      Update your personal contact details below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0917-xxx-xxxx"
                    className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Gender</label>
                  <CustomSelect
                    ariaLabel="Gender"
                    value={gender}
                    onChange={setGender}
                    leadingIcon={<UserIcon className="h-4 w-4" />}
                    className="w-full"
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-blue-200">Username</label>
                  <input
                    type="text"
                    disabled
                    value={username ? `@${username}` : "—"}
                    className="w-full rounded-xl border border-blue-400/15 bg-[#030b24]/70 px-3.5 py-2 text-sm text-blue-300/65"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-blue-200">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Barangay, City"
                  className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-blue-400/15 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("view")}
                  className="rounded-xl border border-blue-400/25 bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] transition hover:from-blue-500 hover:to-sky-400 disabled:opacity-60"
                >
                  <CheckIcon className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* RIGHT (4/12): Account Security & Profile Permissions */}
        <div className="space-y-5 lg:col-span-4">
          <div className="dash-card rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2.5 border-b border-blue-400/15 pb-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                <ShieldLockIcon className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-white">Account Status</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-blue-400/15 bg-[#040f30]/75 px-3.5 py-2.5">
                <span className="text-blue-200/75">Membership</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-blue-400/15 bg-[#040f30]/75 px-3.5 py-2.5">
                <span className="text-blue-200/75">Role</span>
                <span className="font-bold text-white">{roleName}</span>
              </div>
            </div>

            {actions.length > 0 && (
              <div className="mt-4 border-t border-blue-400/15 pt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-blue-300/70">
                  Profile Permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((act) => (
                    <span
                      key={act.id}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-200"
                    >
                      <CheckIcon className="h-3 w-3 text-emerald-300" />
                      {act.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {roleId === 7 && (
            <div className="dash-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/35">
                  <UsersIcon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-white">
                  My Linked Children ({linkedChildren.length})
                </h3>
              </div>

              {linkedChildren.length === 0 ? (
                <p className="text-xs text-blue-200/70">
                  No children linked to your parent account yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedChildren.map((child) => (
                    <div
                      key={`${child.link_id ?? child.player_user_id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-blue-400/15 bg-[#040f30]/75 px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Image src={crest} alt="ALAB" className="h-5 w-auto shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {child.full_name || `${child.first_name} ${child.last_name}`.trim()}
                          </p>
                          <p className="text-[10px] text-blue-200/70">
                            {[child.age_category, child.position].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                      </div>
                      {child.relationship && (
                        <span className="shrink-0 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          {child.relationship}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-blue-400/20 bg-[#040f30]/75 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-300/70">
        <span className="text-sky-400">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-1.5 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}
