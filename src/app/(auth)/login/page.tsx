"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setIsLoading(false);
      toast.error("Invalid credentials", {
        description: "Please check your email and password.",
      });
      return;
    }

    router.push("/");
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-[#0a1628]">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-[#64748b]">
          Sign in to your workspace to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#334155]">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
            className="h-11 border-[#e2e8f0] bg-[#f8fafc] focus:border-[#0ea5e9] focus:bg-white focus:ring-[#0ea5e9]/20 transition-colors"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-[#334155]">
              Password
            </Label>
            <button
              type="button"
              className="text-xs font-medium text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isLoading}
            className="h-11 border-[#e2e8f0] bg-[#f8fafc] focus:border-[#0ea5e9] focus:bg-white focus:ring-[#0ea5e9]/20 transition-colors"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="mt-2 h-11 bg-[#0a1628] hover:bg-[#162d50] text-white font-medium transition-colors"
        >
          {isLoading && <Loader2 className="size-4 animate-spin mr-2" />}
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
        <p className="text-center text-sm text-[#94a3b8]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
