"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, RefreshCw } from "lucide-react";
import type { Tip } from "@/lib/dashboard/tips";

interface TipCardProps {
  initialTips: Tip[];  // Category-filtered tips for initial display
  allTips: Tip[];      // All tips for refresh functionality
}

/**
 * Select a random tip, optionally excluding a specific tip ID
 */
function selectRandomTip(tips: Tip[], excludeId?: string): Tip {
  let availableTips = tips;

  if (excludeId && tips.length > 1) {
    availableTips = tips.filter((tip) => tip.id !== excludeId);
  }

  const randomIndex = Math.floor(Math.random() * availableTips.length);
  return availableTips[randomIndex];
}

export function TipCard({ initialTips, allTips }: TipCardProps) {
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);

  // Select initial random tip from category-filtered tips on mount
  useEffect(() => {
    setCurrentTip(selectRandomTip(initialTips));
  }, [initialTips]);

  // Refresh shows any tip from all tips
  const handleRefresh = () => {
    setCurrentTip(selectRandomTip(allTips, currentTip?.id));
  };

  // Show nothing until client-side hydration completes
  if (!currentTip) {
    return null;
  }

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="p-6">
        <div className="flex gap-3">
          <div className="shrink-0 pt-0.5">
            <Lightbulb className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm">{currentTip.title}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={handleRefresh}
                title="Show another tip"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{currentTip.content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
