"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BookOpen, ArrowRight } from "lucide-react";
import type { DomainProgress } from "@/lib/progress/calculator";

interface WeakAreasListProps {
  domains: DomainProgress[];
}

export function WeakAreasList({ domains }: WeakAreasListProps) {
  // Collect all weak areas from all domains
  const allWeakAreas = domains.flatMap((domain) =>
    domain.weakAreas.map((area) => ({
      area,
      domainId: domain.domainId,
      domainName: domain.domainName,
    }))
  );

  if (allWeakAreas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weak Areas</CardTitle>
          <CardDescription>Topics that need more attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No weak areas identified yet.</p>
            <p className="text-xs mt-2">Complete more assessments to identify areas for improvement.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Weak Areas
        </CardTitle>
        <CardDescription>
          {allWeakAreas.length} topic{allWeakAreas.length !== 1 ? 's' : ''} identified for review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allWeakAreas.slice(0, 10).map((item, idx) => (
            <div
              key={`${item.domainId}-${item.area}-${idx}`}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{item.area}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.domainName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Review
                </Badge>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/study/${item.domainId}`}>
                    <BookOpen className="h-3 w-3 mr-1" />
                    Study
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {allWeakAreas.length > 10 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              + {allWeakAreas.length - 10} more weak areas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
