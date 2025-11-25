export const LoadingDots = () => (
  <span className="inline-flex gap-1">
    {[0, 1, 2].map((dot) => (
      <span
        key={dot}
        className="h-2 w-2 animate-pulse rounded-full bg-indigo-400"
        style={{ animationDelay: `${dot * 120}ms` }}
      />
    ))}
  </span>
)
