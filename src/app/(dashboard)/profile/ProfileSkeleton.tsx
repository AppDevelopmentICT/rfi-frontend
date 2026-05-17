import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function ProfileSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-6 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-9 w-48" />
          </div>
          <Skeleton className="mt-1.5 h-4 w-72" />
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-5 w-28" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-56" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <Skeleton className="size-28 rounded-full" />
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
                <div className="mt-1 flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-5 w-40" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-60" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-5 w-36" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-52" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-5 rounded" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-9 w-52 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
