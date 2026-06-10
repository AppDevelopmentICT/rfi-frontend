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
  sql_id?: number;
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

export function PocketBaseAuthProvider({ children }: { children: ReactNode }) {
  // Never initialize from PocketBase/localStorage synchronously — that differs SSR vs browser
  // and causes hydration mismatches. Restore session only after mount.
  const [user, setUser] = useState<AuthModel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const hydrateAdminProfile = useCallback(async () => {
    if (!pb.authStore.token || !pb.authStore.record) {
      setUser(pb.authStore.record as AuthModel | null);
      return;
    }

    try {
      const { data } = await apiClient.get<{ id: number; is_admin: boolean }>("/v1/auth/me");
      setUser({
        ...(pb.authStore.record as AuthModel),
        sql_id: data.id,
        is_admin: data.is_admin,
      });
    } catch {
      setUser(pb.authStore.record as AuthModel | null);
    }
  }, []);

  useEffect(() => {
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
