export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-sand/70 dark:bg-indigo-700/50 ${className}`} />;
}

export function PageLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
