export default function VideoLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-5 w-72 rounded bg-muted" />
      </div>
      <div className="space-y-4">
        <div className="h-24 rounded-lg border bg-muted/30" />
        <div className="h-10 w-full rounded bg-muted/30" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-lg border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
