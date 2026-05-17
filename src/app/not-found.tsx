"use client";

import { ArrowLeft, FileQuestion, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full mx-auto p-8 flex flex-col items-center justify-center text-center bg-card rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400" />

        <div className="relative mb-6 flex items-center justify-center">
          <span className="select-none text-[8rem] font-extrabold leading-none text-gray-100 dark:text-gray-800/60">
            404
          </span>
          <FileQuestion
            className="absolute size-20 text-muted-foreground/60"
            strokeWidth={1.5}
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Page Not Found
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page or document you are looking for doesn&apos;t exist or has
          been moved.
        </p>

        <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full gap-1.5">
              <LayoutDashboard className="size-4" />
              Back to Dashboard
            </Button>
          </Link>

          <Button
            variant="outline"
            className="w-full sm:w-auto gap-1.5"
            onClick={() => router.back()}
          >
            <ArrowLeft className="size-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
