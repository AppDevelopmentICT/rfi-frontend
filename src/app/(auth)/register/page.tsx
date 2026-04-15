"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are identical.",
      });
      return;
    }

    setIsLoading(true);

    // TODO: Replace with actual register API call
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }

      toast.success("Account created", {
        description: "You can now sign in with your credentials.",
      });
      router.push("/login");
    } catch (err) {
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-[#0a1628]">
          Create your account
        </h2>
        <p className="mt-1.5 text-sm text-[#64748b]">
          Get started with RFI / RFP Automation
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-sm font-medium text-[#334155]">
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={isLoading}
            className="h-11 border-[#e2e8f0] bg-[#f8fafc] focus:border-[#0ea5e9] focus:bg-white focus:ring-[#0ea5e9]/20 transition-colors"
          />
        </div>

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
          <Label
            htmlFor="password"
            className="text-sm font-medium text-[#334155]"
          >
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading}
            minLength={8}
            className="h-11 border-[#e2e8f0] bg-[#f8fafc] focus:border-[#0ea5e9] focus:bg-white focus:ring-[#0ea5e9]/20 transition-colors"
          />
        </div>

        <div className="grid gap-2">
          <Label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-[#334155]"
          >
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading}
            minLength={8}
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
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
        <p className="text-center text-sm text-[#94a3b8]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
