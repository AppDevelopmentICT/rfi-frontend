"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import Link from "next/link";
import { Button } from "@/components/ui/button";

import { pb } from "@/lib/pocketbase";
import { ClientResponseError } from "pocketbase";

import { isCompanyEmail } from "@/lib/company-email";
import { logCustomEvent } from "@/services/dashboard.service";

const SHOW_PASSWORD_LOGIN =
  process.env.NEXT_PUBLIC_SHOW_PASSWORD_LOGIN === "true";

export default function LoginPage() {
  const router = useRouter();
  const [oauthBusy, setOauthBusy] = useState(false);

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

      toast.success("Signed in");
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
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    try {
      await pb.collection("users").authWithPassword(email, password);

      if (!isCompanyEmail(pb.authStore.record?.email)) {
        pb.authStore.clear();
        toast.error("Access denied", {
          description:
            "Only company accounts (@infracom-tech.com) may use this app.",
        });
        return;
      }

      toast.success("Signed in");
      try {
        await logCustomEvent("auth.login", "user", { method: "password", email });
      } catch (e) {
        console.error("Failed to log login event", e);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ClientResponseError
          ? err.message
          : "Please check your email and password.";
      toast.error("Sign in failed", { description: msg });
    }
  }

  const pocketBaseUrl =
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090";

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-[#0a1628]">
          Sign in
        </h2>
        <p className="mt-1.5 text-sm text-[#64748b]">
          Use your InfraCom Microsoft account. In Entra ID, add redirect URI{" "}
          <span className="break-all font-mono text-[11px] text-[#334155]">
            {pocketBaseUrl.replace(/\/$/, "")}/api/oauth2-redirect
          </span>
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mb-6 w-full h-11 border-[#e2e8f0]"
        disabled={oauthBusy}
        onClick={handleMicrosoft}
      >
        {oauthBusy ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : null}
        Continue with Microsoft
      </Button>

      {SHOW_PASSWORD_LOGIN ? (
        <>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#e2e8f0]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[#94a3b8]">Dev — email</span>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="grid gap-4">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@infracom-tech.com"
              className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm"
            />
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              className="h-11 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm"
            />
            <Button
              type="submit"
              size="lg"
              className="h-11 bg-[#0a1628] hover:bg-[#162d50] text-white"
            >
              Sign in with password
            </Button>
          </form>
        </>
      ) : null}

      <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
        <p className="text-center text-sm text-[#94a3b8]">
          Need an account? Contact your administrator — self-registration may be
          disabled.
        </p>
        {process.env.NEXT_PUBLIC_DISABLE_SELF_REGISTER !== "true" ? (
          <p className="mt-2 text-center text-sm">
            <Link
              href="/register"
              className="font-semibold text-[#0ea5e9] hover:text-[#0284c7]"
            >
              Create account
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
