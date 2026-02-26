export default function DocumentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="h-5 w-56 rounded bg-muted" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 rounded bg-muted/30" />
        <div className="h-10 w-36 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
