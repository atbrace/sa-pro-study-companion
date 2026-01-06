'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Play, Trash2, ExternalLink, Loader2, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';

interface LabPageProps {
  params: { lab: string };
}

interface DeploymentStatus {
  deployed: boolean;
  deployment: {
    id: number;
    labId: string;
    stackName: string;
    status: 'deploying' | 'deployed' | 'destroying' | 'destroyed' | 'failed' | 'destroy-failed';
    resourceArns: string[];
    consoleUrls: Record<string, string>;
    outputs: Record<string, any>;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
    destroyedAt: string | null;
  } | null;
}

export default function LabPage({ params }: LabPageProps) {
  const router = useRouter();
  const { lab: labId } = params;

  const [labGuide, setLabGuide] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load lab guide
  useEffect(() => {
    fetch(`/content/experiments/${labId}/README.md`)
      .then(res => {
        if (!res.ok) throw new Error('Lab not found');
        return res.text();
      })
      .then(content => {
        setLabGuide(content);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load lab guide:', err);
        setError('Lab not found');
        setLoading(false);
      });
  }, [labId]);

  // Poll deployment status
  useEffect(() => {
    if (loading) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/experiments/status?labId=${labId}`);
        const data: DeploymentStatus = await res.json();
        setDeployStatus(data);
      } catch (err) {
        console.error('Failed to check status:', err);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 10 seconds if deploying or destroying
    const interval = setInterval(() => {
      if (deployStatus?.deployment?.status === 'deploying' ||
          deployStatus?.deployment?.status === 'destroying') {
        checkStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [labId, loading, deployStatus?.deployment?.status]);

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);

    try {
      const res = await fetch('/api/experiments/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to deploy');
      }

      const data = await res.json();
      setDeployStatus({
        deployed: false,
        deployment: {
          ...data,
          resourceArns: [],
          consoleUrls: {},
          outputs: {},
          errorMessage: null,
          completedAt: null,
          destroyedAt: null,
        },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const handleDestroy = async () => {
    if (!confirm('Are you sure you want to destroy this lab? All resources will be deleted.')) {
      return;
    }

    setDestroying(true);
    setError(null);

    try {
      const res = await fetch('/api/experiments/destroy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to destroy');
      }

      const data = await res.json();
      if (deployStatus) {
        setDeployStatus({
          ...deployStatus,
          deployment: deployStatus.deployment ? {
            ...deployStatus.deployment,
            status: 'destroying',
          } : null,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDestroying(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error && !labGuide) {
    notFound();
  }

  const status = deployStatus?.deployment?.status;
  const isDeploying = status === 'deploying';
  const isDeployed = status === 'deployed';
  const isDestroying = status === 'destroying';
  const hasFailed = status === 'failed' || status === 'destroy-failed';

  return (
    <div className="container py-8 max-w-5xl">
      {/* Status Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Lab Status</h2>
                {!deployStatus?.deployment && (
                  <p className="text-sm text-muted-foreground">Not deployed</p>
                )}
                {isDeploying && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deploying infrastructure...
                  </div>
                )}
                {isDeployed && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Deployed and ready
                  </div>
                )}
                {isDestroying && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Destroying resources...
                  </div>
                )}
                {hasFailed && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    {status === 'failed' ? 'Deployment failed' : 'Destruction failed'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDeploy}
                disabled={deploying || isDeploying || isDeployed || isDestroying}
                size="lg"
              >
                {deploying || isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Deploy Lab
                  </>
                )}
              </Button>

              {(isDeployed || hasFailed) && (
                <Button
                  onClick={handleDestroy}
                  disabled={destroying || isDestroying}
                  variant="destructive"
                  size="lg"
                >
                  {destroying || isDestroying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Destroying...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cleanup Lab
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {deployStatus?.deployment?.errorMessage && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Deployment Error</div>
                <div className="text-sm">{deployStatus.deployment.errorMessage}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Console URLs */}
      {isDeployed && deployStatus?.deployment && Object.keys(deployStatus.deployment.consoleUrls).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AWS Console Links</CardTitle>
            <CardDescription>
              Quick access to deployed resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(deployStatus.deployment.consoleUrls).map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm">{name.replace(/ConsoleUrl$/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Warning */}
      {isDeployed && (
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Resources are running</div>
            <div className="text-sm">
              This lab has estimated costs of <strong>~$0.10/hour</strong>. Remember to destroy resources when you're done!
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Separator className="my-6" />

      {/* Lab Guide */}
      <div className="prose prose-sm lg:prose-base dark:prose-invert max-w-none">
        <ReactMarkdown>{labGuide}</ReactMarkdown>
      </div>
    </div>
  );
}
