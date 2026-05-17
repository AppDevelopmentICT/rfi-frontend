import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCardSkeleton() {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="size-9 rounded-xl" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-16" />
        <Skeleton className="mt-1 h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="flex min-h-[280px] max-h-[480px] xl:max-h-none xl:min-h-0 flex-col border-border/70 shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </CardTitle>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-3.5 w-[30%]" />
            <Skeleton className="h-3.5 w-[12%]" />
            <Skeleton className="h-3.5 w-[12%]" />
            <Skeleton className="h-3.5 w-[14%]" />
            <Skeleton className="ml-auto h-3.5 w-[10%]" />
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-[30%]" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-[14%]" />
              <div className="ml-auto flex gap-2">
                <Skeleton className="h-7 w-14 rounded-md" />
                <Skeleton className="size-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <Card className="flex min-h-[280px] max-h-[420px] xl:max-h-none xl:min-h-0 flex-col border-border/70 shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </CardTitle>
        <Skeleton className="h-3 w-20" />
      </CardHeader>
      <CardContent className="scrollbar-thin min-h-0 flex-1 overflow-hidden">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
            >
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-1 h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 sm:gap-6 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="shrink-0 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-56 sm:h-9 sm:w-64 lg:h-10 lg:w-72" />
          <Skeleton className="mt-1.5 h-4 w-72 sm:w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      <div className="grid shrink-0 gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TableSkeleton />
        <ActivitySkeleton />
      </div>
    </div>
  );
}
