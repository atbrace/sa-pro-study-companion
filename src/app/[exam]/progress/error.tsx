'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export default function ProgressError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Progress page error:', error);
  }, [error]);

  const isDbError = error.message?.includes('no such table') ||
    error.message?.includes('no such column') ||
    error.message?.includes('SQLITE_ERROR');

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Your Progress</h1>
        <p className="text-muted-foreground">
          Track your study progress and exam readiness across all domains
        </p>
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Could not load progress data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            There was a problem loading your progress.
            {isDbError
              ? ' This usually means the database needs to be initialized or migrated.'
              : ' An unexpected error occurred.'}
          </p>
          {isDbError && (
            <div className="rounded-md bg-muted p-3 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Suggested fix
                </span>
              </div>
              <code className="text-sm font-mono">pnpm db:migrate</code>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
