export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] animate-pulse">
      <div className="hidden w-64 border-r bg-muted/30 md:block" />
      <div className="flex flex-1 flex-col">
        <div className="border-b p-4">
          <div className="h-10 w-40 rounded bg-muted" />
        </div>
        <div className="flex-1" />
        <div className="border-t p-4">
          <div className="mx-auto h-11 max-w-3xl rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
