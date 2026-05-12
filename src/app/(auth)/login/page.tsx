"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import Link from "next/link";
import { Button } from "@/components/ui/button";

import { apiClient } from "@/lib/axios";
import { pb } from "@/lib/pocketbase";
import { ClientResponseError } from "pocketbase";

import { isCompanyEmail } from "@/lib/company-email";
import { logCustomEvent } from "@/services/dashboard.service";

export default function LoginPage() {
  const router = useRouter();
  const [oauthBusy, setOauthBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("denied") === "domain") {
        toast.error("Access denied", {
          description:
            "Only company accounts (@infracom-tech.com) may use this app.",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleMicrosoft() {
    setOauthBusy(true);
    try {
      const authData = await pb.collection("users").authWithOAuth2({ provider: "microsoft" });

      const email = pb.authStore.record?.email as string | undefined;
      const avatarUrl = authData.meta?.avatarUrl;

      if (avatarUrl && authData.record?.id) {
        try {
          await pb.collection("users").update(authData.record.id, {
            avatarUrl: avatarUrl
          });
        } catch (updateErr) {
          console.error("Failed to update user avatarUrl in PocketBase:", updateErr);
        }
      }
      if (!isCompanyEmail(email)) {
        pb.authStore.clear();
        toast.error("Access denied", {
          description:
            "Sign in with your company Microsoft account (@infracom-tech.com).",
        });
        return;
      }

      toast.success("Signed in successfully");
      try {
        await logCustomEvent("auth.login", "user", { method: "microsoft", email });
      } catch (e) {
        console.error("Failed to log login event", e);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ClientResponseError ? err.message : "OAuth failed";
      const low = String(msg).toLowerCase();
      if (!low.includes("autocancel") && !low.includes("abort")) {
        toast.error("Microsoft sign-in failed", { description: msg });
      }
    } finally {
      setOauthBusy(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdBusy(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    try {
      const { data } = await apiClient.post("/v1/auth/login", { email, password });
      
      // Save Token & Record directly from our custom API
      pb.authStore.save(data.token, data.record);

      toast.success("Signed in successfully");
      try {
        await logCustomEvent("auth.login", "user", { method: "password", email });
      } catch (e) {
        console.error("Failed to log login event", e);
      }
      router.push("/");
      router.refresh();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Please check your email and password.";
      toast.error("Sign in failed", { description: msg });
      pb.authStore.clear();
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-[#0a1628]">
          Welcome back
        </h2>
        <p className="mt-2 text-[15px] text-[#64748b]">
          Please enter your details to sign in.
        </p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#334155]" htmlFor="email">
            Corporate Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="size-5 text-[#94a3b8]" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@infracom-tech.com"
              className="h-12 w-full rounded-lg border border-[#e2e8f0] bg-white pl-11 pr-4 text-[15px] text-[#0f172a] shadow-sm transition-all focus:border-[#0ea5e9] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] placeholder:text-[#94a3b8]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#334155]" htmlFor="password">
              Password
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="size-5 text-[#94a3b8]" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 w-full rounded-lg border border-[#e2e8f0] bg-white pl-11 pr-4 text-[15px] text-[#0f172a] shadow-sm transition-all focus:border-[#0ea5e9] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] placeholder:text-[#94a3b8]"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-2 h-12 w-full rounded-lg bg-[#0a1628] text-[15px] font-semibold text-white shadow hover:bg-[#162d50] active:scale-[0.98] transition-all"
          disabled={pwdBusy || oauthBusy}
        >
          {pwdBusy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              Sign in <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#e2e8f0]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-[#64748b] font-medium tracking-wide">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-3 rounded-lg border-[#e2e8f0] bg-white text-[15px] font-medium text-[#334155] shadow-sm hover:bg-[#f8fafc] hover:text-[#0f172a] transition-all"
        disabled={oauthBusy || pwdBusy}
        onClick={handleMicrosoft}
      >
        {oauthBusy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Image
            src="/assets/microsoft-logo.svg"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
          />
        )}
        Microsoft Entra ID
      </Button>

      <div className="mt-10 pt-6 border-t border-[#f1f5f9]">
        <p className="text-center text-sm text-[#64748b]">
          Need an account? Contact your administrator.
        </p>
        {process.env.NEXT_PUBLIC_DISABLE_SELF_REGISTER !== "true" && (
          <p className="mt-2 text-center text-sm">
            <Link
              href="/register"
              className="font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
            >
              Request Access
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
