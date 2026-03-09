export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-5 w-72" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-14" />
        ))}
      </div>
    </div>
  )
}
