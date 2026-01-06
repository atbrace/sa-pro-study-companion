'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Terminal, Code2, Info, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';

interface LabPageProps {
  params: { lab: string };
}

// Lab metadata
const labsMetadata: Record<string, {
  name: string;
  stackFile: string;
  stackClass: string;
  estimatedCost: string;
  estimatedTime: number;
}> = {
  'lab-vpc-networking': {
    name: 'VPC Networking with Peering',
    stackFile: 'lab-vpc-networking.ts',
    stackClass: 'VpcNetworkingLabStack',
    estimatedCost: '~$0.10/hour',
    estimatedTime: 45,
  },
};

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="absolute top-2 right-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}

export default function LabPage({ params }: LabPageProps) {
  const { lab: labId } = params;

  const [labGuide, setLabGuide] = useState<string>('');
  const [stackCode, setStackCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const labMeta = labsMetadata[labId];

  // Load lab guide and stack code
  useEffect(() => {
    Promise.all([
      fetch(`/content/experiments/${labId}/README.md`).then(res => {
        if (!res.ok) throw new Error('Lab guide not found');
        return res.text();
      }),
      fetch(`/content/experiments/${labId}/stack.ts`).then(async res => {
        // If stack file doesn't exist in public, we'll show a placeholder
        if (!res.ok) {
          return `// Stack code for ${labMeta?.name}\n// See cdk/lib/stacks/${labMeta?.stackFile} in the repository`;
        }
        return res.text();
      }),
    ])
      .then(([guide, code]) => {
        setLabGuide(guide);
        setStackCode(code);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load lab:', err);
        setError('Lab not found');
        setLoading(false);
      });
  }, [labId, labMeta]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !labMeta) {
    notFound();
  }

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
        <h1 className="text-3xl font-bold tracking-tight mb-2">{labMeta.name}</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{labMeta.estimatedCost}</Badge>
          <Badge variant="outline">~{labMeta.estimatedTime} min</Badge>
        </div>
      </div>

      {/* Prerequisites */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Prerequisites</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
            <li>AWS Account with administrative access</li>
            <li>AWS CLI configured with credentials (<code className="text-xs bg-muted px-1 py-0.5 rounded">aws configure</code>)</li>
            <li>Node.js 18+ and pnpm installed</li>
            <li>AWS CDK familiarity (recommended)</li>
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <a
              href="https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline hover:text-primary"
            >
              AWS CDK Getting Started Guide
            </a>
          </div>
        </AlertDescription>
      </Alert>

      {/* Cost Warning */}
      <Alert variant="destructive" className="mb-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>⚠️ Real AWS Costs</AlertTitle>
        <AlertDescription>
          This lab deploys real AWS resources that incur charges ({labMeta.estimatedCost}).
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
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{setupCommands}</code>
            </pre>
            <CopyButton text={setupCommands} />
          </div>
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
              Location: <code className="bg-muted px-1 py-0.5 rounded">cdk/lib/stacks/{labMeta.stackFile}</code>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
              <code className="language-typescript">{stackCode}</code>
            </pre>
            <CopyButton text={stackCode} label="Copy Code" />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <strong>Note:</strong> This code is already included in the repository.
            You can modify it locally to experiment with different configurations.
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Lab Guide */}
      <div className="prose prose-sm lg:prose-base dark:prose-invert max-w-none">
        <ReactMarkdown>{labGuide}</ReactMarkdown>
      </div>
    </div>
  );
}
