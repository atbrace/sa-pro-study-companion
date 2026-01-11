import { NextRequest, NextResponse } from "next/server";
import { getProgressSummary } from "@/lib/progress/calculator";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get('exam') || 'sap-c02';

    const progress = getProgressSummary(examId);
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
