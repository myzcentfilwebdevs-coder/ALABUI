"use client";

import { useState, type FormEvent } from "react";
import { createPlayer } from "@/lib/api";
import { CloseIcon, JerseyIcon, PlusIcon } from "@/components/icons";

const AGE_CATEGORIES = ["U-8", "U-10", "U-12", "U-14", "U-16", "U-18", "Senior"] as const;
const POSITIONS = ["Forward", "Midfielder", "Defender", "Goalkeeper"] as const;
const GENDERS = ["Male", "Female"] as const;

interface AddPlayerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddPlayerModal({ open, onClose, onCreated }: AddPlayerModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<string>("Male");
  const [ageCategory, setAgeCategory] = useState<string>("U-12");
  const [position, setPosition] = useState<string>("Midfielder");
  const [jerseyNumber, setJerseyNumber] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    const jerseyNum = Number(jerseyNumber);
    if (!jerseyNumber.trim() || !Number.isInteger(jerseyNum) || jerseyNum < 0 || jerseyNum > 99) {
      setError("Enter a valid jersey number (0–99).");
      return;
    }

    setSaving(true);
    const res = await createPlayer({
      first_name: firstName,
      last_name: lastName,
      gender,
      age_category: ageCategory,
      position,
      jersey_number: jerseyNum,
    });
    setSaving(false);

    if (res.ok) {
      setFirstName("");
      setLastName("");
      setJerseyNumber("");
      onCreated();
      onClose();
    } else {
      setError(res.message || "Failed to add player.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs" onClick={onClose} />
      <div className="dash-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-sky-400/35 shadow-2xl">
        <div className="flex items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-[#0a2368] to-[#07184a] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/25 text-sky-300 ring-1 ring-sky-400/35">
              <JerseyIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Add New Player</h3>
              <p className="text-xs text-blue-200/75">Enroll a player into ALAB FC roster</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form method="post" onSubmit={handleSubmit} noValidate className="space-y-3.5 p-5">
          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3.5 py-2.5 text-xs font-medium text-rose-200">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-blue-200">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Miguel"
                className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-blue-200">Last Name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
                className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-blue-200">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g} className="bg-[#051238]">
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-blue-200">Age Category</label>
              <select
                value={ageCategory}
                onChange={(e) => setAgeCategory(e.target.value)}
                className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              >
                {AGE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#051238]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-blue-200">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos} className="bg-[#051238]">
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-blue-200">Jersey Number</label>
              <input
                type="number"
                min={0}
                max={99}
                required
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="10"
                className="w-full rounded-xl border border-blue-400/25 bg-[#040f30] px-3.5 py-2 text-sm text-white placeholder:text-blue-300/45 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-blue-400/25 bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(56,189,248,0.55)] transition hover:from-blue-500 hover:to-sky-400 disabled:opacity-60"
            >
              <PlusIcon className="h-4 w-4" />
              {saving ? "Adding..." : "Add Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
