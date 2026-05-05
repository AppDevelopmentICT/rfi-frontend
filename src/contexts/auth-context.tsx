"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Cookies from "js-cookie";

import { PB_AUTH_COOKIE } from "@/constants/auth";
import { apiClient } from "@/lib/axios";
import { pb } from "@/lib/pocketbase";
import { clearAuthIfWrongCompanyDomain } from "@/lib/clear-invalid-auth";
import type { RecordModel } from "pocketbase";

type AuthModel = RecordModel & {
  is_admin?: boolean;
};

type AuthContextValue = {
  user: AuthModel | null;
  token: string | null;
  ready: boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function syncAuthCookie(token: string | null) {
  if (token) {
    Cookies.set(PB_AUTH_COOKIE, token, {
      expires: 14,
      path: "/",
      sameSite: "lax",
    });
  } else {
    Cookies.remove(PB_AUTH_COOKIE, { path: "/" });
  }
}

const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";
const BYPASS_USER: AuthModel = {
  id: "bypass-temp-user",
  email: "temporary-admin-email@infracom-tech.com",
  name: "Temporary Admin",
  is_admin: true,
  verified: true,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  collectionId: "",
  collectionName: "users",
};

export function PocketBaseAuthProvider({ children }: { children: ReactNode }) {
  // Never initialize from PocketBase/localStorage synchronously — that differs SSR vs browser
  // and causes hydration mismatches. Restore session only after mount.
  const [user, setUser] = useState<AuthModel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const hydrateAdminProfile = useCallback(async () => {
    if (AUTH_BYPASS) {
      setUser(BYPASS_USER);
      return;
    }
    if (!pb.authStore.token || !pb.authStore.record) {
      setUser(pb.authStore.record as AuthModel | null);
      return;
    }

    try {
      const { data } = await apiClient.get<{ is_admin: boolean }>("/v1/auth/me");
      setUser({
        ...(pb.authStore.record as AuthModel),
        is_admin: data.is_admin,
      });
    } catch {
      setUser(pb.authStore.record as AuthModel | null);
    }
  }, []);

  useEffect(() => {
    if (AUTH_BYPASS) {
      setToken("bypass");
      setReady(true);
      hydrateAdminProfile();
      return;
    }

    clearAuthIfWrongCompanyDomain();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    hydrateAdminProfile();
    setToken(pb.authStore.token);
    syncAuthCookie(pb.authStore.token);
    setReady(true);

    return pb.authStore.onChange(() => {
      clearAuthIfWrongCompanyDomain();

      setToken(pb.authStore.token);
      syncAuthCookie(pb.authStore.token);
      hydrateAdminProfile();
    });
  }, [hydrateAdminProfile]);

  const signOut = useCallback(() => {
    if (AUTH_BYPASS) return; // bypass mode: sign out is a no-op
    pb.authStore.clear();
    syncAuthCookie(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      signOut,
    }),
    [user, token, ready, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within PocketBaseAuthProvider");
  }
  return ctx;
}
