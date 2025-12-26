import { Skeleton } from "@/components/ui/skeleton"

export default function PortalSkeleton() { 
  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-700">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-5 w-1/4 rounded-md" />
      </div>

      {/* Category Pills Skeleton */}
      <div className="flex gap-3 overflow-hidden mask-fade-right">
        <Skeleton className="h-10 w-28 rounded-full shrink-0" />
        <Skeleton className="h-10 w-28 rounded-full shrink-0" />
        <Skeleton className="h-10 w-28 rounded-full shrink-0" />
        <Skeleton className="h-10 w-28 rounded-full shrink-0" />
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
           <div key={i} className="space-y-4">
             {/* Image area */}
             <Skeleton className="h-48 w-full rounded-3xl" />
             {/* Text area */}
             <div className="space-y-2 px-2">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
             </div>
           </div>
        ))}
      </div>
    </div>
  ) 
}