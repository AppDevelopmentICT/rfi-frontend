"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { pb } from "@/lib/pocketbase";
import { ClientResponseError } from "pocketbase";

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

    try {
      await pb.collection("users").create({
        email,
        password,
        passwordConfirm: password,
        name,
      });
      toast.success("Account created", {
        description: "You can now sign in.",
      });
      router.push("/login");
    } catch (err) {
      const msg =
        err instanceof ClientResponseError ? err.message : "Registration failed";
      toast.error("Registration failed", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-[#0a1628]">
          Create an account
        </h2>
        <p className="mt-1.5 text-sm text-[#64748b]">
          Users are stored in PocketBase and synced to the app database on first API login.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-sm font-medium text-[#334155]">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="h-11 border-[#e2e8f0] bg-[#f8fafc]"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#334155]">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="h-11 border-[#e2e8f0] bg-[#f8fafc]"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="h-11"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className="h-11"
          />
        </div>

        <Button type="submit" size="lg" disabled={isLoading} className="mt-2 h-11 bg-[#0a1628] text-white">
          {isLoading && <Loader2 className="size-4 animate-spin mr-2" />}
          {isLoading ? "Creating..." : "Create account"}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#e2e8f0] text-center text-sm text-[#94a3b8]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#0ea5e9]">
          Sign in
        </Link>
      </div>
    </div>
  );
}
