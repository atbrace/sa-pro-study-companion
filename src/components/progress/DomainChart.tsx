"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { DomainProgress } from "@/lib/progress/calculator";

interface DomainChartProps {
  domains: DomainProgress[];
}

export function DomainRadarChart({ domains }: DomainChartProps) {
  const data = domains.map((domain) => ({
    domain: domain.domainName,
    mastery: Math.round(domain.masteryScore),
    target: 85,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Mastery Overview</CardTitle>
        <CardDescription>Your progress across all SAP-C02 domains</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="domain" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="Your Mastery"
              dataKey="mastery"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
            <Radar
              name="Target (85%)"
              dataKey="target"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.2}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DomainBarChart({ domains }: DomainChartProps) {
  const data = domains.map((domain) => ({
    name: domain.domainName,
    mastery: Math.round(domain.masteryScore),
    weight: domain.weight,
    questions: domain.questionsAttempted,
    accuracy: domain.questionsAttempted > 0
      ? Math.round((domain.questionsCorrect / domain.questionsAttempted) * 100)
      : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Performance</CardTitle>
        <CardDescription>Mastery score and accuracy by domain</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="mastery" fill="hsl(var(--primary))" name="Mastery %" />
            <Bar dataKey="accuracy" fill="hsl(var(--chart-2))" name="Accuracy %" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
