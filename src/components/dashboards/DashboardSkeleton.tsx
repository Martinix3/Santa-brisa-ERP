import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 p-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Executive KPIs Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card text-card-foreground shadow p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                        <div>
                            <Skeleton className="h-8 w-32 mb-2" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Department Summary Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
                        <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-5" />
                        </div>
                        <div className="p-6 pt-4 space-y-4">
                            {Array.from({ length: 3 }).map((_, j) => (
                                <div key={j} className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts & Widgets Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 pb-0">
                        <Skeleton className="h-6 w-48" />
                    </div>
                    <div className="p-6">
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 pb-0">
                        <Skeleton className="h-6 w-48" />
                    </div>
                    <div className="p-6">
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
