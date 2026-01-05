import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default function StudyPage() {
  const domains = [
    {
      id: 'domain-1',
      name: 'Design Solutions for Organizational Complexity',
      weight: 26,
      color: 'blue',
      topics: 5,
    },
    {
      id: 'domain-2',
      name: 'Design for New Solutions',
      weight: 29,
      color: 'green',
      topics: 6,
    },
    {
      id: 'domain-3',
      name: 'Continuous Improvement for Existing Solutions',
      weight: 25,
      color: 'amber',
      topics: 5,
    },
    {
      id: 'domain-4',
      name: 'Accelerate Workload Migration and Modernization',
      weight: 20,
      color: 'purple',
      topics: 4,
    },
  ];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Study Materials</h1>
        <p className="text-muted-foreground">
          Browse study content organized by SAP-C02 exam domains
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {domains.map((domain) => (
          <Card key={domain.id} className={`border-l-4 border-l-${domain.color}-500`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{domain.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {domain.topics} topics • {domain.weight}% exam weight
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline">{domain.weight}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Content loading will be implemented in the next phase
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
