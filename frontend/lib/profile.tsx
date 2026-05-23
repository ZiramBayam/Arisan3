"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Profile = {
  name: string;
  email: string;
  /** Base64 data URL or empty string to fall back to blockie. */
  avatarDataUrl: string;
};

const EMPTY_PROFILE: Profile = { name: "", email: "", avatarDataUrl: "" };
const STORAGE_KEY = "arisan3:profile";

type ProfileContextValue = {
  profile: Profile;
  save: (next: Profile) => void;
  reset: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readProfile(): Profile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      name: parsed.name ?? "",
      email: parsed.email ?? "",
      avatarDataUrl: parsed.avatarDataUrl ?? "",
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  useEffect(() => {
    setProfile(readProfile());
  }, []);

  const save = useCallback((next: Profile) => {
    setProfile(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const reset = useCallback(() => {
    setProfile(EMPTY_PROFILE);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, save, reset }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
