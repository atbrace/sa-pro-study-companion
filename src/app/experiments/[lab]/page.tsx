import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Terminal, Code2, Info, ExternalLink, AlertCircle } from 'lucide-react';
import { StudyContent } from '@/components/study/StudyContent';
import { getLabById, labExists } from '@/lib/content/experiments';
import { LabCodeBlocks } from './LabCodeBlocks';

interface LabPageProps {
  params: Promise<{ lab: string }>;
}

export default async function LabPage({ params }: LabPageProps) {
  const { lab: labId } = await params;

  // Validate lab exists
  if (!labExists(labId)) {
    notFound();
  }

  // Load lab data from filesystem
  const lab = getLabById(labId);

  if (!lab) {
    // Lab metadata exists but content couldn't be loaded
    return (
      <div className="container py-8 max-w-5xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Lab</AlertTitle>
          <AlertDescription>
            The lab content could not be loaded. This may indicate a problem with the content files.
            Please check that the lab files exist in the content directory.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { meta, guide, stackCode } = lab;

  const setupCommands = `# Clone the repository (if you haven't already)
git clone https://github.com/atbrace/sa-pro-study-companion.git
cd sa-pro-study-companion

# Install dependencies
cd cdk
pnpm install

# Bootstrap your AWS account (first time only)
pnpm cdk bootstrap

# Deploy the lab
pnpm cdk deploy -c labId=${labId} --require-approval never

# When you're done, destroy resources to avoid charges
pnpm cdk destroy -c labId=${labId} --force`;

  return (
    <div className="container py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{meta.name}</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{meta.estimatedCost}</Badge>
          <Badge variant="outline">~{meta.estimatedTime} min</Badge>
        </div>
      </div>

      {/* Prerequisites */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Prerequisites</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
            <li>AWS Account with administrative access</li>
            <li>AWS CLI configured with credentials (<code className="text-xs bg-code px-1 py-0.5 rounded border border-code-border">aws configure</code>)</li>
            <li>Node.js 18+ and pnpm installed</li>
            <li>AWS CDK familiarity (recommended)</li>
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <a
              href="https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline hover:text-muted-foreground"
            >
              AWS CDK Getting Started Guide
            </a>
          </div>
        </AlertDescription>
      </Alert>

      {/* Cost Warning */}
      <Alert variant="destructive" className="mb-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Real AWS Costs</AlertTitle>
        <AlertDescription>
          This lab deploys real AWS resources that incur charges ({meta.estimatedCost}).
          <strong className="block mt-1">Always run <code className="bg-destructive/20 px-1 py-0.5 rounded">cdk destroy</code> when finished to avoid ongoing charges!</strong>
        </AlertDescription>
      </Alert>

      <Separator className="my-6" />

      {/* Setup & Deployment Commands */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <CardTitle>Setup & Deployment</CardTitle>
          </div>
          <CardDescription>
            Run these commands to deploy the lab infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LabCodeBlocks code={setupCommands} language="bash" />
        </CardContent>
      </Card>

      {/* CDK Stack Code */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            <CardTitle>CDK Stack Code</CardTitle>
          </div>
          <CardDescription>
            TypeScript CDK stack that defines the infrastructure
            <span className="block mt-1 text-xs">
              Location: <code className="bg-code px-1 py-0.5 rounded border border-code-border">cdk/lib/stacks/{meta.stackFile}</code>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <LabCodeBlocks code={stackCode} language="typescript" />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <strong>Note:</strong> This code is already included in the repository.
            You can modify it locally to experiment with different configurations.
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Lab Guide */}
      <div className="max-w-none">
        <StudyContent content={guide} />
      </div>
    </div>
  );
}
