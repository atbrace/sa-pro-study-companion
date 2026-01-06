import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

interface Deployment {
  id: number;
  lab_id: string;
  stack_name: string;
  status: string;
  resource_arns: string | null;
  console_urls: string | null;
  outputs: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  destroyed_at: string | null;
}

/**
 * GET /api/experiments/status?labId=xxx
 * Get deployment status for a lab
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const labId = searchParams.get('labId');
    const deploymentId = searchParams.get('deploymentId');

    if (!labId && !deploymentId) {
      return NextResponse.json(
        { error: 'Lab ID or deployment ID is required' },
        { status: 400 }
      );
    }

    let deployment: Deployment | undefined;

    if (deploymentId) {
      // Get specific deployment
      deployment = db.prepare(`
        SELECT
          id,
          lab_id,
          stack_name,
          status,
          resource_arns,
          console_urls,
          outputs,
          error_message,
          started_at,
          completed_at,
          destroyed_at
        FROM experiment_deployments
        WHERE id = ?
      `).get(parseInt(deploymentId)) as Deployment | undefined;
    } else if (labId) {
      // Get most recent deployment for lab
      deployment = db.prepare(`
        SELECT
          id,
          lab_id,
          stack_name,
          status,
          resource_arns,
          console_urls,
          outputs,
          error_message,
          started_at,
          completed_at,
          destroyed_at
        FROM experiment_deployments
        WHERE lab_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(labId) as Deployment | undefined;
    }

    if (!deployment) {
      return NextResponse.json({
        deployed: false,
        labId: labId || null,
        deployment: null,
      });
    }

    // Parse JSON fields
    const resourceArns = deployment.resource_arns
      ? JSON.parse(deployment.resource_arns)
      : [];

    const consoleUrls = deployment.console_urls
      ? JSON.parse(deployment.console_urls)
      : {};

    const outputs = deployment.outputs
      ? JSON.parse(deployment.outputs)
      : {};

    return NextResponse.json({
      deployed: deployment.status === 'deployed',
      deployment: {
        id: deployment.id,
        labId: deployment.lab_id,
        stackName: deployment.stack_name,
        status: deployment.status,
        resourceArns,
        consoleUrls,
        outputs,
        errorMessage: deployment.error_message,
        startedAt: deployment.started_at,
        completedAt: deployment.completed_at,
        destroyedAt: deployment.destroyed_at,
      },
    });

  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/experiments/status/all
 * Get all active deployments
 */
export async function OPTIONS(request: NextRequest) {
  try {
    const deployments = db.prepare(`
      SELECT
        id,
        lab_id,
        stack_name,
        status,
        started_at,
        completed_at,
        destroyed_at
      FROM experiment_deployments
      WHERE status IN ('deploying', 'deployed', 'destroying')
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as Deployment[];

    return NextResponse.json({
      deployments: deployments.map(d => ({
        id: d.id,
        labId: d.lab_id,
        stackName: d.stack_name,
        status: d.status,
        startedAt: d.started_at,
        completedAt: d.completed_at,
        destroyedAt: d.destroyed_at,
      })),
    });

  } catch (error) {
    console.error('Status all API error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployments' },
      { status: 500 }
    );
  }
}
