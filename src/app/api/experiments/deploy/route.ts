import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '@/lib/db/client';
import path from 'path';

const execAsync = promisify(exec);

interface DeployRequest {
  labId: string;
}

/**
 * POST /api/experiments/deploy
 * Deploy a CDK lab stack
 */
export async function POST(request: NextRequest) {
  try {
    const body: DeployRequest = await request.json();
    const { labId } = body;

    if (!labId) {
      return NextResponse.json(
        { error: 'Lab ID is required' },
        { status: 400 }
      );
    }

    // Validate lab ID (only allow specific labs for security)
    const validLabIds = [
      'lab-vpc-networking',
      // Add more lab IDs here as they're created
    ];

    if (!validLabIds.includes(labId)) {
      return NextResponse.json(
        { error: `Invalid lab ID: ${labId}` },
        { status: 400 }
      );
    }

    // Check if lab is already deployed
    const existing = db.prepare(`
      SELECT id, stack_name, status
      FROM experiment_deployments
      WHERE lab_id = ? AND status IN ('deploying', 'deployed')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(labId) as { id: number; stack_name: string; status: string } | undefined;

    if (existing) {
      return NextResponse.json({
        message: 'Lab is already deployed or deploying',
        deploymentId: existing.id,
        stackName: existing.stack_name,
        status: existing.status,
      });
    }

    // Generate stack name
    const stackName = `SAPStudy${labId.split('-').map(s =>
      s.charAt(0).toUpperCase() + s.slice(1)
    ).join('')}`;

    // Create deployment record
    const result = db.prepare(`
      INSERT INTO experiment_deployments (
        lab_id,
        stack_name,
        status,
        started_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(labId, stackName, 'deploying');

    const deploymentId = result.lastInsertRowid as number;

    // Execute CDK deploy in background
    const cdkDir = path.join(process.cwd(), 'cdk');

    // Run deployment asynchronously (don't await)
    executeCdkDeploy(deploymentId, labId, stackName, cdkDir).catch(error => {
      console.error('CDK deployment failed:', error);

      // Update database with failure
      db.prepare(`
        UPDATE experiment_deployments
        SET status = ?,
            error_message = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run('failed', error.message, deploymentId);
    });

    return NextResponse.json({
      message: 'Deployment started',
      deploymentId,
      labId,
      stackName,
      status: 'deploying',
    });

  } catch (error) {
    console.error('Deploy API error:', error);
    return NextResponse.json(
      { error: 'Failed to start deployment' },
      { status: 500 }
    );
  }
}

/**
 * Execute CDK deploy command
 */
async function executeCdkDeploy(
  deploymentId: number,
  labId: string,
  stackName: string,
  cdkDir: string
): Promise<void> {
  try {
    // First, ensure CDK dependencies are installed
    console.log(`[${deploymentId}] Installing CDK dependencies...`);
    await execAsync('pnpm install', { cwd: cdkDir });

    // Run CDK deploy with --require-approval never for non-interactive deployment
    console.log(`[${deploymentId}] Deploying CDK stack: ${stackName}`);

    const deployCommand = `pnpm cdk deploy -c labId=${labId} --require-approval never --outputs-file outputs.json`;
    const { stdout, stderr } = await execAsync(deployCommand, {
      cwd: cdkDir,
      env: {
        ...process.env,
        LAB_ID: labId,
      },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    console.log(`[${deploymentId}] CDK stdout:`, stdout);
    if (stderr) {
      console.warn(`[${deploymentId}] CDK stderr:`, stderr);
    }

    // Parse outputs
    let outputs: Record<string, any> = {};
    try {
      const fs = await import('fs');
      const outputsPath = path.join(cdkDir, 'outputs.json');
      if (fs.existsSync(outputsPath)) {
        outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf-8'));
      }
    } catch (e) {
      console.warn('Could not parse CDK outputs:', e);
    }

    // Extract resource ARNs and console URLs from outputs
    const resourceArns: string[] = [];
    const consoleUrls: Record<string, string> = {};

    const stackOutputs = outputs[stackName] || {};
    for (const [key, value] of Object.entries(stackOutputs)) {
      if (typeof value === 'string') {
        // Check if it's an ARN
        if (value.startsWith('arn:aws:')) {
          resourceArns.push(value);
        }
        // Check if it's a console URL
        if (value.includes('console.aws.amazon.com')) {
          consoleUrls[key] = value;
        }
      }
    }

    // Update deployment record with success
    db.prepare(`
      UPDATE experiment_deployments
      SET status = ?,
          resource_arns = ?,
          console_urls = ?,
          outputs = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      'deployed',
      JSON.stringify(resourceArns),
      JSON.stringify(consoleUrls),
      JSON.stringify(stackOutputs),
      deploymentId
    );

    console.log(`[${deploymentId}] Deployment completed successfully`);

  } catch (error: any) {
    console.error(`[${deploymentId}] Deployment failed:`, error);
    throw error;
  }
}
