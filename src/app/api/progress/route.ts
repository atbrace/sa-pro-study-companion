import { NextResponse } from "next/server";
import { getProgressSummary } from "@/lib/progress/calculator";

export async function GET() {
  try {
    const progress = getProgressSummary();
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
