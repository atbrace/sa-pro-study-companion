import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Server, DollarSign } from "lucide-react";

export default function ExperimentsPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Hands-on Labs</h1>
        <p className="text-muted-foreground">
          Practice with real AWS resources deployed via CDK
        </p>
      </div>

      <div className="mb-6 p-4 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950 rounded-r-lg">
        <p className="text-sm font-medium">Important</p>
        <p className="text-sm text-muted-foreground mt-1">
          Labs deploy real AWS resources that may incur costs. Always destroy resources when finished.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <FlaskConical className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>VPC Peering Configuration</CardTitle>
                  <CardDescription className="mt-1">
                    Domain 1 • Network Connectivity • Beginner
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">Not Started</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Set up VPC peering between two VPCs and configure route tables for cross-VPC communication.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Server className="h-4 w-4" />
                2 VPCs
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ~$0.10/hr
              </span>
              <span>~30 minutes</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lab Infrastructure</CardTitle>
            <CardDescription>
              CDK stacks and experiments will be implemented in Phase 4
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              8-12 guided experiments covering key SAP-C02 services and scenarios
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
