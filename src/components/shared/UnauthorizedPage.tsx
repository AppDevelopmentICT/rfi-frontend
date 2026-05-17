"use client";

import { ArrowLeft, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UnauthorizedPageProps {
  resource?: string;
}

export function UnauthorizedPage({
  resource = "this page",
}: UnauthorizedPageProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

        <div className="flex flex-col items-center px-8 pb-10 pt-14 text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
            <ShieldAlert
              className="size-16 text-destructive"
              strokeWidth={1.5}
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Access Restricted
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You do not have the required permissions to view {resource}. This
            area is reserved for administrators only. If you believe this is an
            error, please contact your system administrator.
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className="flex-1 sm:flex-none">
              <Button size="default" className="w-full gap-1.5">
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
