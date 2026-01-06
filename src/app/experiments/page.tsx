import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Server, DollarSign, ArrowRight, Network } from "lucide-react";

const labs = [
  {
    id: 'lab-vpc-networking',
    title: 'VPC Networking with Peering',
    domain: 'Domain 1',
    topic: 'Network Connectivity',
    difficulty: 'intermediate' as const,
    description: 'Deploy a multi-tier VPC architecture with VPC peering, security groups, NACLs, and route table configuration.',
    resources: '2 VPCs, 6 Subnets, NAT Gateway',
    costPerHour: 0.10,
    estimatedTime: 45,
    icon: Network,
  },
  // Future labs will be added here
];

export default function ExperimentsPage() {
  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Hands-on Labs</h1>
        <p className="text-muted-foreground">
          Practice with real AWS resources deployed via CDK
        </p>
      </div>

      <div className="mb-6 p-4 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950 rounded-r-lg">
        <p className="text-sm font-medium mb-1">💰 Important: Real AWS Costs</p>
        <p className="text-sm text-muted-foreground">
          Labs deploy real AWS resources that incur charges. Each lab shows estimated cost per hour.
          <strong className="block mt-1">Always destroy resources when finished to avoid ongoing charges!</strong>
        </p>
      </div>

      <div className="grid gap-6">
        {labs.map((lab) => (
          <Card key={lab.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <lab.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">{lab.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{lab.domain}</Badge>
                      <Badge variant="secondary">{lab.topic}</Badge>
                      <Badge variant="outline" className="capitalize">{lab.difficulty}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {lab.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Server className="h-4 w-4" />
                    {lab.resources}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    ~${lab.costPerHour.toFixed(2)}/hr
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4" />
                    ~{lab.estimatedTime} min
                  </span>
                </div>
                <Button asChild>
                  <Link href={`/experiments/${lab.id}`}>
                    Start Lab
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">More Labs Coming Soon</CardTitle>
            <CardDescription>
              Additional labs are being developed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Planned labs include:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• RDS Multi-AZ with Read Replicas</li>
              <li>• Lambda with API Gateway and DynamoDB</li>
              <li>• ECS Fargate with ALB</li>
              <li>• S3 with CloudFront Distribution</li>
              <li>• Step Functions Workflow Orchestration</li>
              <li>• EventBridge Event-Driven Architecture</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
