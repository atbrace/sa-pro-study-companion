import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '@/lib/db/client';
import path from 'path';

const execAsync = promisify(exec);

interface DestroyRequest {
  labId: string;
  deploymentId?: number;
}

/**
 * POST /api/experiments/destroy
 * Destroy a CDK lab stack
 */
export async function POST(request: NextRequest) {
  try {
    const body: DestroyRequest = await request.json();
    const { labId, deploymentId } = body;

    if (!labId) {
      return NextResponse.json(
        { error: 'Lab ID is required' },
        { status: 400 }
      );
    }

    // Find the deployment to destroy
    let deployment;
    if (deploymentId) {
      deployment = db.prepare(`
        SELECT id, stack_name, status, lab_id
        FROM experiment_deployments
        WHERE id = ?
      `).get(deploymentId) as { id: number; stack_name: string; status: string; lab_id: string } | undefined;
    } else {
      // Find the most recent deployed instance
      deployment = db.prepare(`
        SELECT id, stack_name, status, lab_id
        FROM experiment_deployments
        WHERE lab_id = ? AND status = 'deployed'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(labId) as { id: number; stack_name: string; status: string; lab_id: string } | undefined;
    }

    if (!deployment) {
      return NextResponse.json(
        { error: 'No deployment found to destroy' },
        { status: 404 }
      );
    }

    if (deployment.status === 'destroying') {
      return NextResponse.json({
        message: 'Lab is already being destroyed',
        deploymentId: deployment.id,
      });
    }

    // Update status to destroying
    db.prepare(`
      UPDATE experiment_deployments
      SET status = 'destroying'
      WHERE id = ?
    `).run(deployment.id);

    // Execute CDK destroy in background
    const cdkDir = path.join(process.cwd(), 'cdk');

    executeCdkDestroy(deployment.id, deployment.lab_id, deployment.stack_name, cdkDir).catch(error => {
      console.error('CDK destroy failed:', error);

      // Update database with failure
      db.prepare(`
        UPDATE experiment_deployments
        SET status = ?,
            error_message = ?
        WHERE id = ?
      `).run('destroy-failed', error.message, deployment.id);
    });

    return NextResponse.json({
      message: 'Destruction started',
      deploymentId: deployment.id,
      labId: deployment.lab_id,
      stackName: deployment.stack_name,
      status: 'destroying',
    });

  } catch (error) {
    console.error('Destroy API error:', error);
    return NextResponse.json(
      { error: 'Failed to start destruction' },
      { status: 500 }
    );
  }
}

/**
 * Execute CDK destroy command
 */
async function executeCdkDestroy(
  deploymentId: number,
  labId: string,
  stackName: string,
  cdkDir: string
): Promise<void> {
  try {
    console.log(`[${deploymentId}] Destroying CDK stack: ${stackName}`);

    const destroyCommand = `pnpm cdk destroy -c labId=${labId} --force`;
    const { stdout, stderr } = await execAsync(destroyCommand, {
      cwd: cdkDir,
      env: {
        ...process.env,
        LAB_ID: labId,
      },
      maxBuffer: 10 * 1024 * 1024,
    });

    console.log(`[${deploymentId}] CDK destroy stdout:`, stdout);
    if (stderr) {
      console.warn(`[${deploymentId}] CDK destroy stderr:`, stderr);
    }

    // Update deployment record
    db.prepare(`
      UPDATE experiment_deployments
      SET status = 'destroyed',
          destroyed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(deploymentId);

    console.log(`[${deploymentId}] Destruction completed successfully`);

  } catch (error: any) {
    console.error(`[${deploymentId}] Destruction failed:`, error);
    throw error;
  }
}
