"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        An unexpected error occurred.
      </p>
      <Button onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  );
}
