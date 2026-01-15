import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Server,
  DollarSign,
  ArrowRight,
  Network,
  Database,
  Zap,
  Cloud,
  Container,
  Workflow,
  Cpu,
  BarChart3,
  GitBranch,
  Settings,
  Eye,
  Scale,
  Layers,
  Sparkles,
  Package,
  type LucideIcon
} from "lucide-react";
import { validateExamId } from "@/lib/content/exam-loader";
import { getLabsForExam, getLabsDescription, type LabDisplay } from "@/lib/content/labs";

interface PageProps {
  params: Promise<{ exam: string }>;
}

const ICON_MAP: Record<string, LucideIcon> = {
  'network': Network,
  'database': Database,
  'zap': Zap,
  'cloud': Cloud,
  'container': Container,
  'workflow': Workflow,
  'cpu': Cpu,
  'bar-chart': BarChart3,
  'git-branch': GitBranch,
  'settings': Settings,
  'eye': Eye,
  'scale': Scale,
  'layers': Layers,
  'sparkles': Sparkles,
  'package': Package,
};

function LabCard({ lab, examId }: { lab: LabDisplay; examId: string }) {
  const Icon = ICON_MAP[lab.iconKey] || FlaskConical;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Icon className="h-6 w-6 text-primary" />
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
            <Link href={`/${examId}/experiments/${lab.id}`}>
              View Lab
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function LabsPage({ params }: PageProps) {
  const { exam } = await params;

  if (!validateExamId(exam)) {
    notFound();
  }

  const labs = getLabsForExam(exam);
  const examDescription = getLabsDescription(exam);

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Hands-on Labs</h1>
        <p className="text-muted-foreground">
          {examDescription}
        </p>
      </div>

      <div className="mb-6 p-4 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950 rounded-r-lg">
        <p className="text-sm font-medium mb-1">Important: Real AWS Costs</p>
        <p className="text-sm text-muted-foreground">
          These labs use AWS CDK to deploy real infrastructure to your AWS account. Each lab includes setup commands and estimated costs.
          <strong className="block mt-1">Always run <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-xs">cdk destroy</code> when finished to avoid ongoing charges!</strong>
        </p>
      </div>

      <div className="grid gap-6">
        {labs.map((lab) => (
          <LabCard key={lab.id} lab={lab} examId={exam} />
        ))}
      </div>
    </div>
  );
}
