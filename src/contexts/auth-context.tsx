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
import { pb } from "@/lib/pocketbase";
import { clearAuthIfWrongCompanyDomain } from "@/lib/clear-invalid-auth";
import type { RecordModel } from "pocketbase";

type AuthModel = RecordModel;

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

  useEffect(() => {
    clearAuthIfWrongCompanyDomain();

    setUser(pb.authStore.record);
    setToken(pb.authStore.token);
    syncAuthCookie(pb.authStore.token);
    setReady(true);

    return pb.authStore.onChange(() => {
      clearAuthIfWrongCompanyDomain();

      setUser(pb.authStore.record);
      setToken(pb.authStore.token);
      syncAuthCookie(pb.authStore.token);
    });
  }, []);

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
