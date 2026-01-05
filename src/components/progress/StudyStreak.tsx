"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import type { RecentActivity } from "@/lib/progress/calculator";

interface StudyStreakProps {
  recentActivity: RecentActivity[];
  studyTimeMinutes: number;
}

export function StudyStreak({ recentActivity, studyTimeMinutes }: StudyStreakProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatStudyTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Your latest study sessions and assessments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Total Study Time</span>
            </div>
            <span className="text-lg font-bold">{formatStudyTime(studyTimeMinutes)}</span>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Start studying or take an assessment to track your progress</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-2 border-l-2 border-l-primary/30 pl-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">{activity.type}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
