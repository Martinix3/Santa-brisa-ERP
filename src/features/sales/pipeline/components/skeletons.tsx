// src/features/sales/pipeline/components/skeletons.tsx

function CardSkeleton() {
    return (
        <div className="border bg-card rounded-lg p-3 space-y-2">
            <div className="h-4 bg-secondary rounded w-3/4"></div>
            <div className="h-3 bg-secondary rounded w-1/2"></div>
            <div className="h-5 bg-secondary rounded w-1/4 mt-2"></div>
        </div>
    )
}

export function PipelineSkeleton() {
  return (
    <div className="flex-1 overflow-x-auto p-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4 min-w-[1200px] h-full">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-secondary rounded-lg">
                <div className="p-3"><div className="h-5 bg-muted rounded w-1/2"></div></div>
                <div className="p-2 space-y-2">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        ))}
        </div>
    </div>
  );
}
